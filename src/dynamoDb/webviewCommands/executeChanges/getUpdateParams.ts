import { ServiceState } from '../../../types'
import { shallowObjectDiff } from '../../shallowObjectDiff'
import { DynamoDB } from 'aws-sdk'

export async function getUpdateParams({
  serviceState,
  localItem,
  originalItem,
}: {
  serviceState: ServiceState
  localItem: any
  originalItem: any
}) {
  const diff = shallowObjectDiff(originalItem, localItem)
  const tableDesc = serviceState.tableDetails

  let forExpressionAttributes = [] as {
    index: number
    attrName: string
    attrNewValue: string
    attrOriginalValue: string
  }[]
  let conditionExpressions = []
  let setExpressions = []
  let removeExpressions = []

  const addAttribute = (property) => {
    const attrIndex = forExpressionAttributes.length
    forExpressionAttributes.push({
      index: attrIndex,
      attrName: property,
      attrOriginalValue: originalItem[property],
      attrNewValue: localItem[property],
    })
    return attrIndex
  }

  diff.updated.forEach((property) => {
    const attrIndex = addAttribute(property)
    conditionExpressions.push(`#key${attrIndex} = :valOriginal${attrIndex}`)
    setExpressions.push(`#key${attrIndex} = :valNew${attrIndex}`)
  })

  diff.added.forEach((property) => {
    const attrIndex = addAttribute(property)
    conditionExpressions.push(`attribute_not_exists(#key${attrIndex})`)
    setExpressions.push(`#key${attrIndex} = :valNew${attrIndex}`)
  })

  diff.deleted.forEach((property) => {
    const attrIndex = addAttribute(property)
    conditionExpressions.push(`#key${attrIndex} = :valOriginal${attrIndex}`)

    if (localItem[property] !== undefined) {
      // not entire property is deleted
      setExpressions.push(`#key${attrIndex} = :valNew${attrIndex}`)
    } else {
      removeExpressions.push(`#key${attrIndex}`)
    }
  })

  let updateExpression = ''

  if (setExpressions.length) {
    setExpressions[0] = `SET ${setExpressions[0]}`
    updateExpression = setExpressions.join(' , ')
  }
  if (removeExpressions.length) {
    removeExpressions[0] = `REMOVE ${removeExpressions[0]}`
    updateExpression = `${updateExpression} ${removeExpressions.join(' , ')}`
  }

  const updateParams: DynamoDB.DocumentClient.UpdateItemInput = {
    Key: tableDesc.sortKey
      ? {
          [tableDesc.hashKey]: originalItem[tableDesc.hashKey],
          [tableDesc.sortKey]: originalItem[tableDesc.sortKey],
        }
      : {
          [tableDesc.hashKey]: originalItem[tableDesc.hashKey],
        },
    TableName: serviceState.tableName,
    UpdateExpression: updateExpression,
    ConditionExpression: conditionExpressions.join(' AND '),
    ExpressionAttributeNames: forExpressionAttributes.reduce((acc, curr) => {
      return {
        ...acc,
        [`#key${curr.index}`]: curr.attrName,
      }
    }, {}),
    ExpressionAttributeValues: forExpressionAttributes.reduce((acc, curr) => {
      let newAcc = acc
      if (curr.attrOriginalValue !== undefined) {
        newAcc = {
          ...newAcc,
          [`:valOriginal${curr.index}`]: curr.attrOriginalValue,
        }
      }
      if (curr.attrNewValue !== undefined) {
        newAcc = {
          ...newAcc,
          [`:valNew${curr.index}`]: curr.attrNewValue,
        }
      }
      return newAcc
    }, {}),
  }

  return {
    modifiedProps: [
      ...Object.keys(diff.updated),
      ...Object.keys(diff.added),
      ...Object.keys(diff.deleted),
    ],
    updateParams,
  }
}
