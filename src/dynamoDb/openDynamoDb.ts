import * as vscode from 'vscode'
import { TreeItem } from '../TreeItem'
import { TreeDataProvider } from '../treeDataProvider'
import { join } from 'path'
import { getWebviewHtml } from '../logs/functionLogsWebview'
import { getFontSize, getFontFamily } from '../settings'
import {
  getDynamoDbServiceContext,
  getTableDetails,
} from './getTableDescription'
import { fetchItems } from './webviewCommands/fetchItems'
import { createItem } from './webviewCommands/createItem'
import { deleteItem } from './webviewCommands/deleteItem'
import { editItem } from './webviewCommands/editItem'
import { getDynamoDbCommandsData } from './getDynamoDbCommandsData'

export const openDynamoDb = (
  context: vscode.ExtensionContext,
  treeDataProvider: TreeDataProvider
) => async (treeItem: TreeItem) => {
  const staticJs = 'resources/webview/build/static/js'
  const staticCss = 'resources/webview/build/static/css'
  const extesionPath = context.extensionPath

  const localResourceRoot = vscode.Uri.file(
    join(extesionPath, 'resources/webview')
  )

  if (!treeItem.panel) {
    const service = treeItem.settings.service

    treeItem.panel = vscode.window.createWebviewPanel(
      'slsConsoledynamodb',
      service.title,
      vscode.ViewColumn.One,
      {
        enableFindWidget: true,
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
          fontSize: "${getFontSize()}",
          fontFamily: "${getFontFamily()}"
        }
      `,
    })

    if (treeItem.iconPathObj) {
      treeItem.panel.iconPath = {
        // todo: fix svg path
        light: vscode.Uri.file(
          '/Users/domagojkriskovic/web/serverless-monitor/resources/light/dynamoDb.svg'
        ),
        dark: vscode.Uri.file(
          '/Users/domagojkriskovic/web/serverless-monitor/resources/dark/dynamoDb.svg'
        ),
      }
    }

    service.context?.onChangesUpdated?.event((changes) => {
      const commands = getDynamoDbCommandsData(changes)

      treeItem.panel?.webview?.postMessage({
        type: 'defineDynamoDbCommands',
        payload: commands,
      })

      treeItem.panel.title = changes.length
        ? `(${changes.length}) ${service.title}`
        : service.title
    })

    treeItem.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'describeTable': {
            const tableDetails = await getTableDetails(service)

            treeItem.panel?.webview?.postMessage({
              messageId: message.messageId,
              payload: tableDetails.descOutput,
            })

            break
          }
          case 'fetchItems': {
            const payload = await fetchItems(service, message)

            treeItem.panel?.webview?.postMessage({
              messageId: message.messageId,
              payload,
            })

            break
          }
          case 'createItem': {
            await createItem(service)
            break
          }
          case 'componentMounted': {
            const commands = getDynamoDbCommandsData(service.context.changes)

            treeItem.panel?.webview?.postMessage({
              type: 'defineDynamoDbCommands',
              payload: commands,
            })

            treeItem.panel.title = service.context.changes.length
              ? `(${service.context.changes.length}) ${service.title}`
              : service.title

            break
          }
          case 'deleteItem': {
            const { sortKey, hashKey } = message.payload
            await deleteItem(service, { sortKey, hashKey })
            treeDataProvider.refreshService(treeItem.settings.service)

            break
          }
          case 'editItem': {
            await editItem(service, message)
            break
          }
        }
      },
      undefined,
      context.subscriptions
    )

    treeItem.panel.onDidDispose(() => {
      delete treeItem.panel
      treeItem.settings.service?.context?.onChangesUpdated.dispose()
    })
  }
  treeItem.panel.reveal()
}
