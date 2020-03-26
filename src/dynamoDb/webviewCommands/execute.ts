import { detailedDiff } from 'deep-object-diff'
import { Service } from '../../types'
import { getRemoteItem } from '../getRemoteItem'
import { getLocalItem } from '../getLocalItem'
import { DynamoDB } from 'aws-sdk'
import { getTableDetails } from '../getTableDescription'
import { getAwsCredentials } from '../../getAwsCredentials'

export async function execute(service: Service) {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB.DocumentClient({
    credentials,
    region: service.region,
  })

  for (const change of service.context.changes) {
    if (change.name.startsWith('create-')) {
      continue
    }
    if (change.name.startsWith('delete-')) {
      continue
    }

    try {
      const localItem = getLocalItem(`${change.dir}/${change.name}`)
      const remoteItem = await getRemoteItem({
        service,
        path: `${change.dir}/${change.name}`,
      })

      const diff: any = detailedDiff(remoteItem.json, localItem)
      const tableDesc = await getTableDetails(service)

      let AttributeUpdates = Object.keys(diff.updated).reduce(
        (acc, property) => {
          return {
            ...acc,
            [property]: {
              Action: 'PUT',
              Value: localItem[property],
            },
          }
        },
        {}
      )
      AttributeUpdates = Object.keys(diff.added).reduce((acc, property) => {
        return {
          ...acc,
          [property]: {
            Action: 'ADD',
            Value: localItem[property],
          },
        }
      }, AttributeUpdates)
      AttributeUpdates = Object.keys(diff.deleted).reduce((acc, property) => {
        return {
          ...acc,
          [property]: {
            Action: 'DELETE',
            Value: localItem[property],
          },
        }
      }, AttributeUpdates)

      const updateParams: DynamoDB.DocumentClient.UpdateItemInput = {
        Key: tableDesc.sortKey
          ? {
              [tableDesc.hashKey]: remoteItem.json[tableDesc.hashKey],
              [tableDesc.sortKey]: remoteItem.json[tableDesc.sortKey],
            }
          : {
              [tableDesc.hashKey]: remoteItem.json[tableDesc.hashKey],
            },
        TableName: service.tableName,
        AttributeUpdates,
      }

      await dynamoDb.update(updateParams).promise()
      // console.log(JSON.stringify(updateParams, null, 2))
    } catch (err) {
      console.log(change, err.message)
    }
  }
}
