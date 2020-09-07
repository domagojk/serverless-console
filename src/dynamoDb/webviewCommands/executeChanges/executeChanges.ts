import * as vscode from 'vscode'
import { remove } from 'fs-extra'
import { getRemoteItem } from '../../getRemoteItem'
import { shallowObjectDiff } from '../../shallowObjectDiff'
import { getLocalItem } from '../../getLocalItem'
import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../../../getAwsCredentials'
import { getUpdateParams } from './getUpdateParams'
import { getDeleteParams } from './getDeleteParams'
import { Store } from '../../../store'

export async function executeChanges(
  store: Store,
  serviceHash: string,
  refreshChangesTree: () => void
) {
  const serviceState = store.getState(serviceHash)

  if (serviceState.changes.findIndex((c) => c.status === 'inProgress') !== -1) {
    return vscode.window.showInformationMessage(
      `Execution is already in progress`
    )
  }

  const credentials = await getAwsCredentials(serviceState.awsProfile)
  const dynamoDb = new DynamoDB.DocumentClient({
    credentials,
    region: serviceState.region,
    endpoint: serviceState.endpoint,
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
        const originalItem = getLocalItem(change.absFilePath)

        if (!localItem) {
          throw new Error('Unable to parse JSON file.')
        }

        const deleteParams = await getDeleteParams({
          serviceState,
          originalItem,
        })

        await dynamoDb
          .delete(deleteParams)
          .promise()
          .catch(async (err) => {
            if (err.code === 'ConditionalCheckFailedException') {
              const remoteItem = await getRemoteItem({
                serviceState,
                path: change.absFilePath,
              })

              checkIfChanged(originalItem, remoteItem.json)
            }

            throw err
          })
      } else {
        const localItem = getLocalItem(change.absFilePath)
        const originalItem = getLocalItem(change.absFilePathOriginal)

        const { updateParams } = await getUpdateParams({
          serviceState,
          localItem,
          originalItem,
        })

        await dynamoDb
          .update(updateParams)
          .promise()
          .catch(async (err) => {
            if (err.code === 'ConditionalCheckFailedException') {
              const remoteItem = await getRemoteItem({
                serviceState,
                path: change.absFilePath,
              })

              checkIfChanged(originalItem, remoteItem.json)
            }

            throw err
          })
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

function checkIfChanged(localItem, remoteItem, modifiedProps?: string[]) {
  const remoteDiff: any = shallowObjectDiff(localItem, remoteItem)

  const modiefedInRemote = [
    ...remoteDiff.updated,
    ...remoteDiff.added,
    ...remoteDiff.deleted,
  ]

  const checkItems = modifiedProps || Object.keys(remoteItem)

  checkItems.forEach((property) => {
    if (modiefedInRemote.includes(property)) {
      if (
        typeof localItem[property] !== 'object' &&
        typeof remoteItem[property] !== 'object'
      ) {
        throw new Error(
          `Property "${property}" was "${localItem[property]}" when you committed your change, but its current value is: "${remoteItem[property]}". Please refresh your query and try again.`
        )
      } else {
        throw new Error(
          `Property "${property}" was changed since you committed your change. Please refresh your query and try again.`
        )
      }
    }
  })
}
