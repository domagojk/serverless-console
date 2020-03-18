import { Service } from '../extension'

export function getKeyConditionExpression({
  service,
  index,
  hashKey,
  rangeKey,
  rangeKeyVal2,
  comparison
}: {
  service: Service
  index: string
  hashKey: any
  rangeKey?: any
  rangeKeyVal2?: any
  comparison: '=' | '<' | '<=' | '>' | '>=' | 'between' | 'begins_with'
}) {
  const indexDetails = service.context.indexes.find(({ id }) => id === index)

  if (!rangeKey) {
    return {
      KeyConditionExpression: '#hashKey = :hashVal',
      ExpressionAttributeNames: {
        '#hashKey': indexDetails.keys[0]
      },
      ExpressionAttributeValues: {
        ':hashVal': hashKey
      }
    }
  }

  let rangeKeyCondition = ''

  switch (comparison) {
    case '=':
    case '<':
    case '<=':
    case '>':
    case '>=':
      rangeKeyCondition = `#rangeKey ${comparison} :rangeVal`
      break
    case 'between':
      rangeKeyCondition = `#rangeKey BETWEEN :rangeVal AND :rangeVal2`
      break
    case 'begins_with':
      rangeKeyCondition = `begins_with ( #rangeKey, :rangeVal )`
      break
  }

  return {
    KeyConditionExpression: `#hashKey = :hashVal and ${rangeKeyCondition}`,
    ExpressionAttributeNames: {
      '#hashKey': indexDetails.keys[0],
      '#rangeKey': indexDetails.keys[1]
    },
    ExpressionAttributeValues: {
      ':hashVal': hashKey,
      ':rangeVal': rangeKey,
      ':rangeVal2': rangeKeyVal2
    }
  }
}
