import { Service } from '../extension'
import { getAwsCredentials } from '../getAwsCredentials'
import { DynamoDB } from 'aws-sdk'
import { getKeyConditionExpression } from './getKeyConditionExpression'

export async function getItem({
  index,
  service,
  hashKey,
  rangeKey
}: {
  index: string
  service: Service
  hashKey: any
  rangeKey?: any
}) {
  const indexDetails = service.context.indexes.find(({ id }) => id === index)

  if (!indexDetails) {
    throw new Error('Unable to getItem')
  }

  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB.DocumentClient({
    credentials,
    region: service.region
  })

  const queryParams = {
    TableName: service.tableName,
    IndexName: index === 'default' ? null : index,
    ...getKeyConditionExpression({
      service,
      index,
      hashKey,
      rangeKey,
      comparison: '='
    })
  }

  return dynamoDb
    .query(queryParams)
    .promise()
    .then(res => {
      if (res.Count !== 1) {
        throw Error(`found ${res.Count} items, expected 1`)
      }
      return res.Items[0]
    })
}
