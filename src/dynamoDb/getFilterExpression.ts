import { DynamoDB } from 'aws-sdk'

export type Comparison =
  | '='
  | '<'
  | '<='
  | '>'
  | '>='
  | '≠'
  | '<>'
  | 'Between'
  | 'Begins with'
  | 'Exists'
  | 'Not exists'
  | 'Contains'
  | 'Not contains'

export function getFilterExpression(
  filters: {
    comparison: Comparison
    fieldName: string
    value: string
    dataType: string
    valueSecond?: string
    keyCondition?: boolean
  }[],
  queryType: 'scan' | 'query'
) {
  const onlyFilled = filters
    .filter((f) => {
      switch (f.comparison) {
        case 'Exists':
        case 'Not exists':
          return f.fieldName
        case 'Between':
          return (
            f.fieldName && f.value !== undefined && f.valueSecond !== undefined
          )
        default:
          return f.fieldName && f.value !== undefined && f.value !== ''
      }
    })
    .map((filter, index) => {
      return {
        ...filter,
        id: index,
        value:
          typeof filter.value === 'string'
            ? filter.value
            : JSON.stringify(filter.value),
        valueSecond:
          typeof filter.valueSecond === 'string'
            ? filter.valueSecond
            : JSON.stringify(filter.valueSecond),
      }
    })

  if (onlyFilled.length === 0) {
    return {}
  }

  const filterExpressionCommands = onlyFilled
    .filter(
      (filter) =>
        queryType === 'scan' || (queryType === 'query' && !filter.keyCondition)
    )
    .map(convertFilterToExpression)

  const keyCondExpressionCommands = onlyFilled
    .filter((filter) => queryType === 'query' && filter.keyCondition)
    .map(convertFilterToExpression)

  let params: {
    ExpressionAttributeNames: DynamoDB.QueryInput['ExpressionAttributeNames']
    ExpressionAttributeValues: DynamoDB.QueryInput['ExpressionAttributeValues']
    KeyConditionExpression?: DynamoDB.QueryInput['KeyConditionExpression']
    FilterExpression?: DynamoDB.QueryInput['FilterExpression']
  } = {
    ExpressionAttributeNames: onlyFilled.reduce((acc, curr) => {
      return {
        ...acc,
        [`#key${curr.id}`]: curr.fieldName,
      }
    }, {}),
    ExpressionAttributeValues: onlyFilled.reduce((acc, curr) => {
      return curr.valueSecond
        ? {
            ...acc,
            [`:value${curr.id}`]: {
              [curr.dataType]: curr.value,
            },
            [`:value2${curr.id}`]: {
              [curr.dataType]: curr.valueSecond,
            },
          }
        : {
            ...acc,
            [`:value${curr.id}`]: {
              [curr.dataType]: curr.value,
            },
          }
    }, {}),
  }

  if (keyCondExpressionCommands.length) {
    params.KeyConditionExpression = keyCondExpressionCommands.join(' and ')
  }

  if (filterExpressionCommands.length) {
    params.FilterExpression = filterExpressionCommands.join(' and ')
  }

  return params
}

function convertFilterToExpression({ comparison, id }) {
  switch (comparison) {
    case '=':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return `#key${id} ${comparison} :value${id}`
    case '<>':
    case '≠':
      return `#key${id} <> :value${id}`
    case 'Between':
      return `#key${id} BETWEEN :value${id} AND :value2${id}`
    case 'Begins with':
      return `begins_with ( #key${id}, :value${id} )`
    case 'Exists':
      return `attribute_exists( #key${id} )`
    case 'Not exists':
      return `attribute_not_exists( #key${id} )`
    case 'Contains':
      return `contains( #key${id}, :value${id} )`
    case 'Not contains':
      return `NOT contains( #key${id}, :value${id} )`
  }
}
