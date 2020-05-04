import * as vscode from 'vscode'
import { TreeItem } from '../TreeItem'
import { TreeDataProvider } from '../treeDataProvider'
import { join } from 'path'
import { getWebviewHtml } from '../logs/functionLogsWebview'
import { getFontSize, getFontFamily } from '../settings'
import { fetchItems } from './webviewCommands/fetchItems'
import { createItem } from './webviewCommands/createItem'
import { deleteItem } from './webviewCommands/deleteItem'
import { editItem } from './webviewCommands/editItem'
import { executeChanges } from './webviewCommands/executeChanges/executeChanges'
import { Store } from '../types'
import { remove } from 'fs-extra'
import { openDynamoDbChangeDiff } from './openDynamoDbChangeDiff'
import { dynamoDbOptions } from './webviewCommands/dynamodbOptions'
import {
  buyLicense,
  showProOptions,
  enterLicense,
  getLicense,
} from '../checkLicense'

export const openDynamoDb = (
  context: vscode.ExtensionContext,
  treeDataProvider: TreeDataProvider,
  store: Store
) => async (treeItem: TreeItem) => {
  let license = await getLicense(context)

  const staticJs = 'resources/webview/build/static/js'
  const staticCss = 'resources/webview/build/static/css'
  const extesionPath = context.extensionPath

  const localResourceRoot = vscode.Uri.file(
    join(extesionPath, 'resources/webview')
  )

  if (!treeItem.panel) {
    const { title } = treeDataProvider.getService(treeItem.settings.serviceHash)

    treeItem.panel = vscode.window.createWebviewPanel(
      'slsConsoledynamodb',
      title,
      vscode.ViewColumn.One,
      {
        enableFindWidget: false, // cant use it since table is showing items based on scroll
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [localResourceRoot],
      }
    )

    treeItem.panel.webview.html = await getWebviewHtml({
      panel: treeItem.panel,
      fontSize: getFontSize(),
      jsFiles: [
        vscode.Uri.file(join(extesionPath, staticJs, 'main1.js')),
        vscode.Uri.file(join(extesionPath, staticJs, 'main2.js')),
        vscode.Uri.file(join(extesionPath, staticJs, 'main3.js')),
      ],
      cssFiles: [
        vscode.Uri.file(join(extesionPath, staticCss, 'main1.css')),
        vscode.Uri.file(join(extesionPath, staticCss, 'main2.css')),
      ],
      inlineJs: `
        document.vscodeData = {
          page: 'dynamoDb',
          license: ${JSON.stringify(license)},
          fontSize: "${getFontSize()}",
          fontFamily: "${getFontFamily()}"
        }
      `,
    })

    if (treeItem.iconPathObj) {
      treeItem.panel.iconPath = {
        dark: vscode.Uri.file(
          join(extesionPath, `resources/dark/dynamoDb.svg`)
        ),
        light: vscode.Uri.file(
          join(extesionPath, `resources/light/dynamoDb.svg`)
        ),
      }
    }

    const subscriber = () => {
      treeItem.panel?.webview?.postMessage({
        type: 'changesUpdated',
      })
    }
    store.subscribe(subscriber, treeItem.settings.serviceHash)

    treeItem.panel.webview.onDidReceiveMessage(
      async (message) => {
        const serviceState = store.getState(treeItem.settings.serviceHash)

        switch (message.command) {
          case 'describeTable': {
            const tableDetails = serviceState.tableDetails

            treeItem.panel?.webview?.postMessage({
              messageId: message.messageId,
              payload: tableDetails,
            })

            break
          }
          case 'fetchItems': {
            const payload = await fetchItems(serviceState, message)

            treeItem.panel?.webview?.postMessage({
              messageId: message.messageId,
              payload,
            })

            break
          }
          case 'createItem': {
            await createItem(serviceState, message.payload?.prepopulatedItem)
            break
          }
          case 'deleteItem': {
            await deleteItem(serviceState, message)
            treeDataProvider.refreshService(treeItem.settings.serviceHash)
            break
          }
          case 'editItem': {
            await editItem(store, treeItem.settings.serviceHash, message)
            break
          }
          case 'execute': {
            await executeChanges(store, treeItem.settings.serviceHash, () => {
              treeDataProvider.refreshService(treeItem.settings.serviceHash)
            })
            break
          }
          case 'discardChange': {
            const change = serviceState.changes.find(
              (c) => c.id === message.payload.id
            )
            if (change) {
              await remove(change.absFilePath)
              treeDataProvider.refreshService(treeItem.settings.serviceHash)
            }
            break
          }
          case 'openChange': {
            const change = serviceState.changes.find(
              (c) => c.id === message.payload.id
            )
            openDynamoDbChangeDiff(change)
            break
          }
          case 'dynamodbOptions': {
            dynamoDbOptions(message, treeItem)
            break
          }
          case 'showLicenseDialog': {
            showProOptions(context)
            break
          }
          case 'buyLicense': {
            buyLicense()
            break
          }
          case 'enterLicense': {
            enterLicense(context)
            break
          }
        }
      },
      undefined,
      context.subscriptions
    )

    treeItem.panel.onDidDispose(() => {
      delete treeItem.panel
      store.unsubscribe(subscriber, treeItem.settings.serviceHash)
    })
  }
  treeItem.panel.reveal()
}
