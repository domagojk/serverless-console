import * as vscode from 'vscode'
import { detailedDiff } from 'deep-object-diff'
import { DynamoDbFileChange, Store, ServiceState } from '../../types'
import { getRemoteItem } from '../getRemoteItem'
import { getLocalItem } from '../getLocalItem'
import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../../getAwsCredentials'
import { remove } from 'fs-extra'

export async function executeChanges(
  store: Store,
  serviceHash: string,
  refreshChangesTree: () => void
) {
  const serviceState = store.getState(serviceHash)

  const credentials = await getAwsCredentials(serviceState.awsProfile)
  const dynamoDb = new DynamoDB.DocumentClient({
    credentials,
    region: serviceState.region,
  })

  for (const change of serviceState.changes) {
    try {
      // seting change status to "inProgress"
      // so that loading icon can be shown
      store.setState(serviceHash, {
        changes: store.getState(serviceHash).changes.map((c) => {
          if (c.id === change.id) {
            return {
              ...change,
              status: 'inProgress',
            }
          } else {
            return c
          }
        }),
      })

      if (change.action === 'create') {
        const localItem = getLocalItem(change.absFilePath)
        if (!localItem) {
          throw new Error('Unable to parse JSON file.')
        }

        const putParams: DynamoDB.DocumentClient.PutItemInput = serviceState
          .tableDetails.sortKey
          ? {
              Item: localItem,
              TableName: serviceState.tableName,
              ConditionExpression:
                '#hashKey <> :hashKey AND #sortKey <> :sortKey',
              ExpressionAttributeNames: {
                '#hashKey': serviceState.tableDetails.hashKey,
                '#sortKey': serviceState.tableDetails.sortKey,
              },
              ExpressionAttributeValues: {
                ':hashKey': localItem[serviceState.tableDetails.hashKey],
                ':sortKey': localItem[serviceState.tableDetails.sortKey],
              },
            }
          : {
              Item: localItem,
              TableName: serviceState.tableName,
              ConditionExpression: '#hashKey <> :hashKey',
              ExpressionAttributeNames: {
                '#hashKey': serviceState.tableDetails.hashKey,
              },
              ExpressionAttributeValues: {
                ':hashKey': localItem[serviceState.tableDetails.hashKey],
              },
            }

        await dynamoDb
          .put(putParams)
          .promise()
          .catch((err) => {
            if (err.code === 'ConditionalCheckFailedException') {
              throw new Error('Item already exists.')
            } else {
              throw err
            }
          })
      } else if (change.action === 'delete') {
        const localItem = getLocalItem(change.absFilePath)
        if (!localItem) {
          throw new Error('Unable to parse JSON file.')
        }

        await dynamoDb
          .delete({
            TableName: serviceState.tableName,
            Key: localItem,
          })
          .promise()
      } else {
        const updateParams = await getUpdateParams(serviceState, change)
        await dynamoDb.update(updateParams).promise()
      }

      // since sussecfull, remove change file
      await remove(change.absFilePath)

      // save sucessfulChanges in state
      // so it can be applied even on refresh without api call
      // use timeAdded timestamp to figure out if the api call is before or after change
      const successfulChanges =
        store.getState(serviceHash).successfulChanges || []

      store.setState(
        serviceHash,
        {
          successfulChanges: [
            ...successfulChanges.filter(
              (c) => c.change.compositKey !== change.compositKey
            ),
            {
              timeAdded: Date.now(),
              change,
            },
          ],
        },
        {
          silent: true,
        }
      )
    } catch (err) {
      store.setState(serviceHash, {
        changes: store.getState(serviceHash).changes.map((c) => {
          if (c.id === change.id) {
            return {
              ...change,
              status: 'error',
              error: err,
            }
          } else {
            return c
          }
        }),
      })

      const actionVerb =
        change.action === 'delete'
          ? 'deleting'
          : change.action === 'create'
          ? 'creating'
          : 'updating'

      vscode.window
        .showErrorMessage(
          `Error ${actionVerb} ${change.compositKey || 'item'}. ${err.message}`,
          ...['Discard Change']
        )
        .then(async (option) => {
          if (option === 'Discard Change') {
            await remove(change.absFilePath)
            refreshChangesTree()
          }
        })
    }
  }

  refreshChangesTree()
}

export async function getUpdateParams(
  serviceState: ServiceState,
  change: DynamoDbFileChange
) {
  const localItem = getLocalItem(change.absFilePath)
  const remoteItem = await getRemoteItem({
    serviceState,
    path: change.absFilePath,
  })

  const diff: any = detailedDiff(remoteItem.json, localItem)
  const tableDesc = serviceState.tableDetails

  let AttributeUpdates = Object.keys(diff.updated).reduce((acc, property) => {
    return {
      ...acc,
      [property]: {
        Action: 'PUT',
        Value: localItem[property],
      },
    }
  }, {})
  AttributeUpdates = Object.keys(diff.added).reduce((acc, property) => {
    return {
      ...acc,
      [property]: {
        Action: 'PUT',
        Value: localItem[property],
      },
    }
  }, AttributeUpdates)
  AttributeUpdates = Object.keys(diff.deleted).reduce((acc, property) => {
    return {
      ...acc,
      [property]: {
        Action: 'DELETE',
        Value: localItem[property],
      },
    }
  }, AttributeUpdates)

  const updateParams: DynamoDB.DocumentClient.UpdateItemInput = {
    Key: tableDesc.sortKey
      ? {
          [tableDesc.hashKey]: remoteItem.json[tableDesc.hashKey],
          [tableDesc.sortKey]: remoteItem.json[tableDesc.sortKey],
        }
      : {
          [tableDesc.hashKey]: remoteItem.json[tableDesc.hashKey],
        },
    TableName: serviceState.tableName,
    AttributeUpdates,
  }

  return updateParams
}
