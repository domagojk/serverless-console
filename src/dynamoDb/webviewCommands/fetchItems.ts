import { DynamoDB } from 'aws-sdk'
import { Service } from '../../extension'
import { getAwsCredentials } from '../../getAwsCredentials'

export async function fetchItems(service: Service, message: any) {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB.DocumentClient({
    credentials,
    region: service.region
  })

  try {
    if (message.payload.queryType === 'scan') {
      const res = await dynamoDb
        .scan({
          TableName: service.tableName,
          Limit: 100,
          ExclusiveStartKey: message.payload.lastEvaluatedKey,
          IndexName:
            message.payload.index === 'default' ? null : message.payload.index
        })
        .promise()

      return res
    } else if (message.payload.queryType === 'query') {
      const res = await dynamoDb
        .query({
          TableName: service.tableName,
          Limit: 100,
          IndexName:
            message.payload.index === 'default' ? null : message.payload.index
        })
        .promise()

      return res
    }
  } catch (err) {
    return {
      error: err && err.message ? err.message : 'error fetching items'
    }
  }
}
