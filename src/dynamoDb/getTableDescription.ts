import { Service } from '../extension'
import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../getAwsCredentials'
import { EventEmitter } from 'vscode'

export async function getTableDescription(service: Service) {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: service.region
  })

  const res = await dynamoDb
    .describeTable({
      TableName: service.tableName
    })
    .promise()

  const hashKey = res.Table.KeySchema.find(key => key.KeyType === 'HASH')
  const range = res.Table.KeySchema.find(key => key.KeyType === 'RANGE')

  return {
    tableDescribeOutput: res.Table,
    changes: service.context?.changes,
    onChangesUpdated: service?.context?.onChangesUpdated || new EventEmitter(),
    hashKey: hashKey && hashKey.AttributeName ? hashKey.AttributeName : null,
    sortKey: range ? range.AttributeName && range.AttributeName : null,
    indexes: [
      {
        id: 'default',
        keys: [hashKey.AttributeName, range?.AttributeName].filter(val => !!val)
      },
      ...res.Table.GlobalSecondaryIndexes.map(index => {
        const hashKey = index.KeySchema.find(key => key.KeyType === 'HASH')
        const range = index.KeySchema.find(key => key.KeyType === 'RANGE')

        return {
          id: index.IndexName,
          keys: [hashKey.AttributeName, range?.AttributeName].filter(
            val => !!val
          )
        }
      })
    ]
  }
}
