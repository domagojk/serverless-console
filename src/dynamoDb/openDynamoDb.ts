import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import { TreeItem } from '../TreeItem'
import { join } from 'path'
import { getWebviewContent } from '../logs/functionLogsWebview'
import { getFontSize, getFontFamily } from '../settings'
import { existsSync, writeFile } from 'fs'
import { TreeDataProvider } from '../treeDataProvider'
import { getAwsSdk } from '../getAwsSdk'
import { updateTableDescription, getFormattedJSON } from './dynamodbService'
import { DynamoDbFileChange } from '../extension'

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
        localResourceRoots: [localResourceRoot]
      }
    )

    getWebviewContent({
      panel: treeItem.panel,
      fontSize: getFontSize(),
      jsFiles: [
        vscode.Uri.file(join(extesionPath, staticJs, 'main1.js')),
        vscode.Uri.file(join(extesionPath, staticJs, 'main2.js')),
        vscode.Uri.file(join(extesionPath, staticJs, 'main3.js'))
      ],
      cssFiles: [
        vscode.Uri.file(join(extesionPath, staticCss, 'main1.css')),
        vscode.Uri.file(join(extesionPath, staticCss, 'main2.css'))
      ],
      inlineJs: `
        document.vscodeData = {
          page: 'dynamoDb',
          fontSize: "${getFontSize()}",
          fontFamily: "${getFontFamily()}"
        }
      `
    })

    if (treeItem.iconPathObj) {
      treeItem.panel.iconPath = {
        light: vscode.Uri.file(
          '/Users/domagojkriskovic/web/serverless-monitor/resources/light/dynamoDb.svg'
        ),
        dark: vscode.Uri.file(
          '/Users/domagojkriskovic/web/serverless-monitor/resources/dark/dynamoDb.svg'
        )
      }
    }

    service.context?.onChangesUpdated?.event(changes => {
      postDefineDynamoDbCommandsMessage(changes, treeItem.panel)

      treeItem.panel.title = changes.length
        ? `(${changes.length}) ${service.title}`
        : service.title
    })

    treeItem.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'describeTable': {
            if (!service.context?.tableDescribeOutput) {
              await updateTableDescription(service)
            }

            treeItem.panel?.webview?.postMessage({
              messageId: message.messageId,
              payload: service.context.tableDescribeOutput
            })
            break
          }
          case 'fetchItems': {
            const AWS = getAwsSdk(service.awsProfile, service.region)
            const dynamoDb = new AWS.DynamoDB.DocumentClient()

            if (message.payload.type === 'scan') {
              const res = await dynamoDb
                .scan({
                  TableName: service.tableName,
                  Limit: 100,
                  ExclusiveStartKey: message.payload.lastEvaluatedKey
                })
                .promise()

              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: res
              })
            }

            break
          }
          case 'createItem': {
            if (!service.context?.tableDescribeOutput) {
              await updateTableDescription(service)
            }

            const localDocPath = path.join(
              os.tmpdir(),
              `vscode-sls-console/${treeItem.settings.service.hash}/scan`,
              `create-${Date.now()}.json`
            )

            const uri = vscode.Uri.file(localDocPath).with({
              scheme: 'untitled'
            })

            const doc = await vscode.workspace.openTextDocument(uri)
            const editor = await vscode.window.showTextDocument(
              doc,
              vscode.ViewColumn.Beside
            )

            const initialData = service.context.tableDescribeOutput.AttributeDefinitions.reduce(
              (acc, curr) => {
                // todo add all attribute values
                return {
                  ...acc,
                  [curr.AttributeName]:
                    curr.AttributeType === 'N'
                      ? 0
                      : curr.AttributeType === 'S'
                      ? ''
                      : null
                }
              },
              {}
            )

            editor.edit(edit => {
              const { stringified } = getFormattedJSON(initialData)
              edit.insert(new vscode.Position(0, 0), stringified)
            })
            break
          }
          case 'componentMounted': {
            postDefineDynamoDbCommandsMessage(
              service.context.changes,
              treeItem.panel
            )
            treeItem.panel.title = service.context.changes.length
              ? `(${service.context.changes.length}) ${service.title}`
              : service.title

            break
          }
          case 'deleteItem': {
            const { sortKey, hashKey } = message.payload
            const compositKey =
              sortKey === undefined ? hashKey : `${hashKey}-${sortKey}`

            const fileName = `delete-${compositKey}.json`

            const localDocPath = path.join(
              os.tmpdir(),
              `vscode-sls-console/${treeItem.settings.service.hash}/scan`,
              fileName
            )

            const { stringified } = getFormattedJSON(
              service.context.sortKey
                ? {
                    [service.context.hashKey]: hashKey,
                    [service.context.sortKey]: sortKey
                  }
                : {
                    [service.context.hashKey]: hashKey
                  }
            )

            await new Promise(resolve =>
              writeFile(localDocPath, stringified, () => {
                resolve()
              })
            )

            treeDataProvider.refreshService(treeItem.settings.service)
            break
          }
          case 'editItem': {
            const { sortKey, hashKey } = service.context
            const { json, stringified, space } = getFormattedJSON(
              message.payload.content,
              message.payload.columns
            )

            const compositKey = !sortKey
              ? json[hashKey]
              : `${json[hashKey]}-${json[sortKey]}`

            const localDirPath = path.join(
              os.tmpdir(),
              `vscode-sls-console/${treeItem.settings.service.hash}/scan`
            )
            const localDocPath = path.join(
              localDirPath,
              `update-${compositKey}.json`
            )

            const doesFileExists = existsSync(localDocPath)
            const uri = doesFileExists
              ? vscode.Uri.file(localDocPath)
              : vscode.Uri.file(localDocPath).with({ scheme: 'untitled' })

            const doc = await vscode.workspace.openTextDocument(uri)
            const editor = await vscode.window.showTextDocument(
              doc,
              vscode.ViewColumn.Beside
            )

            const shouldSelectProperty =
              json &&
              message.payload.selectColumn &&
              json[message.payload.selectColumn] !== undefined

            if (doc.getText()) {
              if (shouldSelectProperty) {
                editor.selection = getEditorSelection(
                  doc,
                  space,
                  message.payload.selectColumn
                )
              }
              return
            }

            editor.edit(edit => {
              edit.insert(new vscode.Position(0, 0), stringified)
              if (!shouldSelectProperty) {
                // if there is no text that should be selected
                // exit the function
                return
              }

              // since it seems there is no vscode api which could indicate
              // that editing document is done
              // perform a "dirty" check (max 10 times every 25ms)
              let selectionTimesTried = 0
              const selectClickedProperty = () => {
                selectionTimesTried++
                if (selectionTimesTried > 10) {
                  return
                }

                if (!doc.getText()) {
                  // doc is not ready yet
                  setTimeout(selectClickedProperty, 25)
                } else {
                  // doc is ready
                  editor.selection = getEditorSelection(
                    doc,
                    space,
                    message.payload.selectColumn
                  )
                  return
                }
              }
              selectClickedProperty()
            })

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

export function postDefineDynamoDbCommandsMessage(
  folderList: DynamoDbFileChange[],
  panel: vscode.WebviewPanel
) {
  const commands = folderList.map(file => {
    return {
      id: Math.random(),
      action: file.name.startsWith('update-')
        ? 'update'
        : file.name.startsWith('delete-')
        ? 'delete'
        : file.name.startsWith('create-')
        ? 'create'
        : null,
      compositKey: file.compositKey,
      timestamp: file.modified
    }
  })

  panel?.webview?.postMessage({
    type: 'defineDynamoDbCommands',
    payload: commands
  })
}

function getEditorSelection(
  doc: vscode.TextDocument,
  space: string,
  selectColumn: string
) {
  const splitted = doc.getText().split(/\r?\n/)

  const propStart = `${space}"${selectColumn}":`
  const lineStart = splitted.findIndex(ln => ln.startsWith(propStart))
  const lineEnd =
    splitted
      .slice(lineStart + 1)
      .findIndex(ln => ln.startsWith(`${space}"`) || ln.startsWith('}')) +
    lineStart

  if (lineStart < 0 || lineEnd < 0) {
    return
  }

  let chStart = propStart.length + 1
  let chEnd = splitted[lineEnd].length

  const firstSelected = doc.getText(
    new vscode.Range(
      new vscode.Position(lineStart, chStart),
      new vscode.Position(lineStart, chStart + 1)
    )
  )

  if (firstSelected === '"') {
    chStart++
  }

  const lastTwoSelected = doc.getText(
    new vscode.Range(
      new vscode.Position(lineEnd, chEnd - 2),
      new vscode.Position(lineEnd, chEnd)
    )
  )

  if (lastTwoSelected === '",') {
    chEnd = chEnd - 2
  } else if (lastTwoSelected[1] === ',') {
    chEnd = chEnd - 1
  }

  return new vscode.Selection(
    new vscode.Position(lineStart, chStart),
    new vscode.Position(lineEnd, chEnd)
  )
}
