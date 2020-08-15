import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../../getAwsCredentials'
import { getFilterExpression, Comparison } from '../getFilterExpression'
import { ServiceState } from '../../store'

type Message = {
  payload: {
    onlyRefreshCurrentItems?: boolean
    lastFetchResult?: {
      Count: number
      LastEvaluatedKey: any
      ScannedCount: number
      Items: any[]
      timeFetched: number
    }
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

export async function fetchItems(serviceState: ServiceState, message: Message) {
  try {
    const index = serviceState.tableDetails.indexes.find(
      (i) => i.id === message.payload.index
    )

    const applyChangeUpdateToItem = (item) => {
      const changedItem = serviceState.changes.find((change) => {
        return (
          change.action === 'update' &&
          change.json &&
          change.index === index.id &&
          change.queryType === message.payload.queryType &&
          change.compositKey === item.id
        )
      })
      if (changedItem) {
        return {
          ...item,
          data: changedItem.json,
        }
      } else {
        return item
      }
    }

    const res = await getItems(serviceState, message)

    const Items = res.Items.map((item) => {
      const succChangedItem = serviceState.successfulChanges?.find(
        ({ change, timeAdded }) => {
          return (
            // only include change that is added after last fetch result
            timeAdded > res.timeFetched &&
            // check if the change is affecting current item
            change.json &&
            change.index === index.id &&
            change.queryType === message.payload.queryType &&
            change.compositKey === item.id
          )
        }
      )
      if (succChangedItem?.change?.action === 'update') {
        return {
          ...item,
          data: succChangedItem.change.json,
        }
      } else if (succChangedItem?.change?.action === 'delete') {
        return null
      } else {
        return item
      }
    }).filter((val) => val !== null)

    return {
      ...res,
      Items,
      changedItems: Items.map(applyChangeUpdateToItem),
      changes: serviceState.changes,
    }
  } catch (err) {
    return {
      error:
        err && err.code && err.message
          ? // code must be present since all aws api errors have it
            err.message
          : 'error fetching items',
    }
  }
}

async function getItems(serviceState: ServiceState, message: Message) {
  const lastFetchResult = message.payload.lastFetchResult
  const hashKey = serviceState.tableDetails.hashKey
  const sortKey = serviceState.tableDetails.sortKey

  if (message.payload.onlyRefreshCurrentItems && lastFetchResult) {
    return {
      Count: lastFetchResult.Count,
      LastEvaluatedKey: lastFetchResult.LastEvaluatedKey,
      ScannedCount: lastFetchResult.ScannedCount,
      Items: lastFetchResult.Items,
      timeFetched: lastFetchResult.timeFetched,
    }
  }

  const credentials = await getAwsCredentials(serviceState.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: serviceState.region,
    endpoint: serviceState.endpoint,
  })

  const dynamoDbRes =
    message.payload.queryType === 'scan'
      ? await dynamoDb
          .scan({
            TableName: serviceState.tableName,
            Limit: 100,
            ExclusiveStartKey: message.payload.lastEvaluatedKey,
            IndexName:
              message.payload.index === 'default'
                ? null
                : message.payload.index,
            ...getFilterExpression(message.payload.filters, 'scan'),
          })
          .promise()
      : await dynamoDb
          .query({
            TableName: serviceState.tableName,
            Limit: 100,
            ExclusiveStartKey: message.payload.lastEvaluatedKey,
            IndexName:
              message.payload.index === 'default'
                ? null
                : message.payload.index,
            ...getFilterExpression(message.payload.filters, 'query'),
          })
          .promise()

  const Items = dynamoDbRes.Items.map((item) => {
    const data = DynamoDB.Converter.unmarshall(item)
    return {
      data,
      hashKey: data[hashKey],
      sortKey: data[sortKey],
      index: message.payload.index,
      id: sortKey ? `${data[hashKey]}-${data[sortKey]}` : data[hashKey],
    }
  })

  if (lastFetchResult) {
    return {
      Count: lastFetchResult.Count + dynamoDbRes.Count,
      LastEvaluatedKey: dynamoDbRes.LastEvaluatedKey,
      ScannedCount: lastFetchResult.ScannedCount + dynamoDbRes.ScannedCount,
      Items: [...lastFetchResult.Items, ...Items],
      timeFetched: Date.now(),
    }
  } else {
    return {
      Count: dynamoDbRes.Count,
      LastEvaluatedKey: dynamoDbRes.LastEvaluatedKey,
      ScannedCount: dynamoDbRes.ScannedCount,
      Items,
      timeFetched: Date.now(),
    }
  }
}
