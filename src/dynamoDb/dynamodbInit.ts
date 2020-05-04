import * as vscode from 'vscode'
import { openDynamoDb } from './openDynamoDb'
import { TreeItem } from '../TreeItem'
import {
  DynamoDiffProvider,
  openDynamoDbChangeDiff,
} from './openDynamoDbChangeDiff'
import { executeChanges } from './webviewCommands/executeChanges/executeChanges'
import { TreeDataProvider } from '../treeDataProvider'
import { Store } from '../types'
import { remove } from 'fs-extra'
import { getLicense } from '../checkLicense'

export async function dynamodbInit(
  context: vscode.ExtensionContext,
  treeDataProvider: TreeDataProvider,
  store: Store,
  serviceTmpDir: string
) {
  const oldLicenseKey = await vscode.workspace
    .getConfiguration()
    .get('serverlessConsole.licenseKey')

  if (oldLicenseKey) {
    // temporary migration of license key in context.globalState
    // should be removed in future

    context.globalState.update('licenseKey', oldLicenseKey)
    vscode.workspace
      .getConfiguration()
      .update('serverlessConsole.licenseKey', undefined, true)
  }

  await getLicense(context)

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDb',
    openDynamoDb(context, treeDataProvider, store)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDbItemDiff',
    async (treeItem: TreeItem) => {
      const serviceState = store.getState(treeItem.settings.serviceHash)
      const change = serviceState.changes.find((c) => c.name === treeItem.label)
      openDynamoDbChangeDiff(change)
    }
  )

  vscode.commands.registerCommand(
    'serverlessConsole.dynamodbExecuteChanges',
    async (treeItem: TreeItem) => {
      if (!treeItem?.settings?.serviceHash) {
        return null
      }
      await executeChanges(store, treeItem.settings.serviceHash, () => {
        treeDataProvider.refreshService(treeItem.settings.serviceHash)
      })
    }
  )

  vscode.commands.registerCommand(
    'serverlessConsole.dynamodbDiscardChange',
    async (treeItem: TreeItem) => {
      if (!treeItem?.settings?.serviceHash) {
        return null
      }
      const serviceState = store.getState(treeItem.settings.serviceHash)
      const change = serviceState?.changes?.find(
        (c) => c.name === treeItem.label
      )
      if (change) {
        await remove(change.absFilePath)
        treeDataProvider.refreshService(treeItem.settings.serviceHash)
      }
    }
  )

  vscode.workspace.onDidSaveTextDocument((e) => {
    if (e.uri.fsPath.startsWith(serviceTmpDir)) {
      const relativePart = e.uri.fsPath.substr(serviceTmpDir.length)
      const [serviceHash] = relativePart.split('/')

      const openedFromWebview = store.getState(serviceHash)?.openedFromWebview
      if (openedFromWebview?.includes(e.uri.fsPath)) {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor')
        store.setState(serviceHash, {
          openedFromWebview: openedFromWebview.filter(
            (file) => file !== e.uri.fsPath
          ),
        })
      }

      treeDataProvider.refreshService(serviceHash)
    }
  })

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      'dynamodb-item-diff',
      new DynamoDiffProvider(treeDataProvider, store)
    )
  )
}
