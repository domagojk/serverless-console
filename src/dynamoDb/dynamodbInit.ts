import * as vscode from 'vscode'
import { openDynamoDb } from './openDynamoDb'
import { TreeItem } from '../TreeItem'
import {
  DynamoDiffProvider,
  openDynamoDbChangeDiff,
} from './openDynamoDbChangeDiff'
import { executeChanges } from './webviewCommands/executeChanges/executeChanges'
import { remove } from 'fs-extra'
import { getLicense } from '../checkLicense'
import { getServices } from '../settings'
import { join } from 'path'
import { cleanEmptyDirs } from '../cleanEmptyDirs'
import { refreshService } from '../refreshServices'
import { Store, DynamoDbFileChange } from '../store'

export async function dynamodbInit(
  context: vscode.ExtensionContext,
  store: Store,
  serviceTmpDir: string
) {
  // clean empty dirs
  const services = getServices()
  services.forEach((service) => {
    if (service.type === 'dynamodb') {
      cleanEmptyDirs(join(serviceTmpDir, service.hash))
    }
  })

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
    openDynamoDb(context, store)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDbItemDiff',
    async (
      treeItem: TreeItem,
      openDiffCommand: { change: DynamoDbFileChange }
    ) => {
      openDynamoDbChangeDiff(openDiffCommand.change)
    }
  )

  vscode.commands.registerCommand(
    'serverlessConsole.dynamodbExecuteChanges',
    async (treeItem: TreeItem) => {
      if (!treeItem?.settings?.serviceHash) {
        return null
      }
      await executeChanges(store, treeItem.settings.serviceHash, () => {
        refreshService(store, treeItem.settings.serviceHash)
      })
    }
  )

  vscode.commands.registerCommand(
    'serverlessConsole.dynamodbDiscardChange',
    async (treeItem: TreeItem) => {
      if (!treeItem?.serviceHash) {
        return null
      }
      const serviceState = store.getState(treeItem.serviceHash)
      const change = serviceState?.changes?.find(
        (c) => c.name === treeItem.label
      )
      if (change) {
        await remove(change.absFilePath)
        refreshService(store, treeItem.serviceHash)
      }
    }
  )

  vscode.workspace.onDidSaveTextDocument((e) => {
    if (e.uri.fsPath.startsWith(serviceTmpDir)) {
      const relativePart = e.uri.fsPath.substr(serviceTmpDir.length)
      const [serviceHash] = relativePart.split('/')

      const openedFromWebview = store.getState(serviceHash)?.openedFromWebview
      const closeAfterSaveOption = vscode.workspace
        .getConfiguration()
        .get('serverlessConsole.closeDynamoDbItemAfterSave')

      if (closeAfterSaveOption && openedFromWebview?.includes(e.uri.fsPath)) {
        vscode.commands.executeCommand('workbench.action.closeActiveEditor')
        store.setState(serviceHash, {
          openedFromWebview: openedFromWebview.filter(
            (file) => file !== e.uri.fsPath
          ),
        })
      }

      refreshService(store, serviceHash)
    }
  })

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      'dynamodb-item-diff',
      new DynamoDiffProvider()
    )
  )
}
