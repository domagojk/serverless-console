import { ServiceState } from '../../../types'
import { getUpdateParams } from './getUpdateParams'

export async function getDeleteParams({
  serviceState,
  originalItem,
}: {
  serviceState: ServiceState
  originalItem: any
}) {
  const { updateParams } = await getUpdateParams({
    serviceState,
    localItem: {},
    originalItem,
  })

  return {
    TableName: serviceState.tableName,
    Key: updateParams.Key,
    ConditionExpression: updateParams.ConditionExpression,
    ExpressionAttributeNames: updateParams.ExpressionAttributeNames,
    ExpressionAttributeValues: updateParams.ExpressionAttributeValues,
  }
}
