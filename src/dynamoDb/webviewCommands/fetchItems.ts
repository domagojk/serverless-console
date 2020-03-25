import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../../getAwsCredentials'
import { getFilterExpression } from '../getFilterExpression'
import { Comparison, Service } from '../../types'

export async function fetchItems(
  service: Service,
  message: {
    payload: {
      lastEvaluatedKey: any
      queryType: string
      index: string
      filters?: {
        comparison: Comparison
        fieldName: string
        dataType: string
        id: number
        value: string
        valueSecond?: string
      }[]
    }
  }
) {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: service.region,
  })

  try {
    if (message.payload.queryType === 'scan') {
      const params = {
        TableName: service.tableName,
        Limit: 100,
        ExclusiveStartKey: message.payload.lastEvaluatedKey,
        IndexName:
          message.payload.index === 'default' ? null : message.payload.index,
        ...getFilterExpression(
          message.payload.filters,
          message.payload.queryType
        ),
      }

      const res = await dynamoDb.scan(params).promise()

      return {
        ...res,
        Items: res.Items.map((item) => DynamoDB.Converter.unmarshall(item)),
      }
    } else if (message.payload.queryType === 'query') {
      const res = await dynamoDb
        .query({
          TableName: service.tableName,
          Limit: 100,
          IndexName:
            message.payload.index === 'default' ? null : message.payload.index,
          ...getFilterExpression(
            message.payload.filters,
            message.payload.queryType
          ),
        })
        .promise()

      return {
        ...res,
        Items: res.Items.map((item) => DynamoDB.Converter.unmarshall(item)),
      }
    }
  } catch (err) {
    return {
      error: err && err.message ? err.message : 'error fetching items',
    }
  }
}
