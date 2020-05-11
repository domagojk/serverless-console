import { getUpdateParams } from './getUpdateParams'
import { ServiceState } from '../../../store'

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
