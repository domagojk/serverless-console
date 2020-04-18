import { Service, Store, ServiceState } from '../types'
import { join } from 'path'
import { tmpdir } from 'os'
import { DynamoDB } from 'aws-sdk'
import { uniq } from 'lodash'
import { getAwsCredentials } from '../getAwsCredentials'
import { getFilterExpression } from './getFilterExpression'
import { getFormattedJSON } from './getFormattedJSON'
import { getLocalItem } from './getLocalItem'

export async function getRemoteItem({
  serviceState,
  path,
  localItem,
}: {
  serviceState: ServiceState
  path: string
  localItem?: any
}) {
  const [queryTypeIndex, hashKey, fileName] = path.split('/').slice(-3)
  const splitted = queryTypeIndex.split('-')
  const index = splitted.slice(1).join('-')

  const filePath = join(serviceState.tmpDir, queryTypeIndex, hashKey, fileName)

  const withoutSufix = fileName.split('.').slice(0, -2).join('.') // removing .xxxx.json

  const hashKeyRangeKey = withoutSufix
    .split('-') // create array
    .slice(1) // take all from update- delete- create-
    .join('-') // make string again

  const rangeKey = hashKeyRangeKey.split(`${hashKey}-`)[1]

  const json = localItem || getLocalItem(filePath)

  const tableDetails = serviceState.tableDetails
  const indexDetails = tableDetails.indexes.find(({ id }) => id === index)

  if (!indexDetails) {
    throw new Error('Unable to getItem')
  }

  const credentials = await getAwsCredentials(serviceState.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: serviceState.region,
  })

  const queryParams = {
    TableName: serviceState.tableName,
    IndexName: index === 'default' ? null : index,
    ...getFilterExpression(
      rangeKey
        ? [
            {
              comparison: '=',
              dataType: tableDetails.descOutput.AttributeDefinitions.find(
                (attr) => attr.AttributeName === indexDetails.keys[0]
              )?.AttributeType,
              fieldName: indexDetails.keys[0],
              value: hashKey,
              keyCondition: true,
            },
            {
              comparison: '=',
              dataType: tableDetails.descOutput.AttributeDefinitions.find(
                (attr) => attr.AttributeName === indexDetails.keys[1]
              )?.AttributeType,
              fieldName: indexDetails.keys[1],
              value: rangeKey,
              keyCondition: true,
            },
          ]
        : [
            {
              comparison: '=',
              dataType: tableDetails.descOutput.AttributeDefinitions.find(
                (attr) => attr.AttributeName === indexDetails.keys[0]
              )?.AttributeType,
              fieldName: indexDetails.keys[0],
              value: hashKey,
              keyCondition: true,
            },
          ],
      'query'
    ),
  }

  const item = await dynamoDb
    .query(queryParams)
    .promise()
    .then((res) => {
      if (res.Count === 0) {
        throw Error('item not found')
      }
      if (res.Count !== 1) {
        throw Error(`found ${res.Count} items, expected 1`)
      }
      return DynamoDB.Converter.unmarshall(res.Items[0])
    })

  const columns = uniq([...Object.keys(json), ...Object.keys(item)])

  return getFormattedJSON(item, columns)
}
