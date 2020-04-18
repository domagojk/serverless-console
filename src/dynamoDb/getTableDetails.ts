import { Service, DynamoDbTableDesc, Store } from '../types'
import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../getAwsCredentials'

export async function getTableDetails(
  service: Service
): Promise<DynamoDbTableDesc> {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: service.region,
  })

  const res = await dynamoDb
    .describeTable({
      TableName: service.tableName,
    })
    .promise()

  const hashKey = res.Table.KeySchema.find((key) => key.KeyType === 'HASH')
  const range = res.Table.KeySchema.find((key) => key.KeyType === 'RANGE')

  let tableDetails = {
    descOutput: res.Table,
    hashKey: hashKey && hashKey.AttributeName ? hashKey.AttributeName : null,
    sortKey: range ? range.AttributeName && range.AttributeName : null,
    indexes: [
      {
        id: 'default',
        keys: [hashKey.AttributeName, range?.AttributeName].filter(
          (val) => !!val
        ),
      },
    ],
  }

  if (res.Table.GlobalSecondaryIndexes) {
    tableDetails.indexes.push(
      ...res.Table.GlobalSecondaryIndexes.map((index) => {
        const hashKey = index.KeySchema.find((key) => key.KeyType === 'HASH')
        const range = index.KeySchema.find((key) => key.KeyType === 'RANGE')

        return {
          id: index.IndexName,
          keys: [hashKey.AttributeName, range?.AttributeName].filter(
            (val) => !!val
          ),
        }
      })
    )
  }

  return tableDetails
}

export async function getDynamoDbServiceContext(
  service: Service,
  store: Store
) {
  const serviceState = store.getState(service.hash)
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: service.region,
  })

  const res = await dynamoDb
    .describeTable({
      TableName: service.tableName,
    })
    .promise()

  const hashKey = res.Table.KeySchema.find((key) => key.KeyType === 'HASH')
  const range = res.Table.KeySchema.find((key) => key.KeyType === 'RANGE')

  return {
    changes: serviceState?.changes,
    hashKey: hashKey && hashKey.AttributeName ? hashKey.AttributeName : null,
    sortKey: range ? range.AttributeName && range.AttributeName : null,
    indexes: [
      {
        id: 'default',
        keys: [hashKey.AttributeName, range?.AttributeName].filter(
          (val) => !!val
        ),
      },
      ...res.Table.GlobalSecondaryIndexes.map((index) => {
        const hashKey = index.KeySchema.find((key) => key.KeyType === 'HASH')
        const range = index.KeySchema.find((key) => key.KeyType === 'RANGE')

        return {
          id: index.IndexName,
          keys: [hashKey.AttributeName, range?.AttributeName].filter(
            (val) => !!val
          ),
        }
      }),
    ],
  }
}
