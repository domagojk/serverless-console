import * as vscode from 'vscode'
import * as os from 'os'
import * as path from 'path'
import { TreeItem } from '../TreeItem'
import { join } from 'path'
import { getWebviewContent } from '../logs/functionLogsWebview'
import { getFontSize, getFontFamily } from '../settings'
//import { createHash } from 'crypto'
import { existsSync } from 'fs'

export const openDynamoDb = (context: vscode.ExtensionContext) => async (
  treeItem: TreeItem
) => {
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

    service?.context?.onChangesUpdated?.event(changes => {
      postDefineDynamoDbCommandsMessage(changes, treeItem.panel)

      treeItem.panel.title = changes.length
        ? `(${changes.length}) ${service.title}`
        : service.title
    })

    treeItem.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
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
          case 'openJSON': {
            // const commandHash = createHash('md5')
            //   .update(JSON.stringify(message.payload))
            //   .digest('hex')

            const json = message.payload.content
            const { sortKey, hashKey } = message.payload
            let sortedJSON = {}

            message.payload.columns.forEach(column => {
              if (json[column] !== undefined) {
                sortedJSON[column] = json[column]
              }
            })

            const compositKey = !sortKey
              ? json[hashKey]
              : `${json[hashKey]}-${json[sortKey]}`

            const fileName = `update-${compositKey}.json`

            const localDocPath = path.join(
              os.tmpdir(),
              `vscode-sls-console/${treeItem.settings.service.hash}/scan`,
              fileName
            )

            // todo:
            // if index, show dialog "this is the item from index x, open GetItem by primary key", dont show again

            const fileExists = existsSync(localDocPath)

            const uri = fileExists
              ? vscode.Uri.file(localDocPath)
              : vscode.Uri.file(localDocPath).with({ scheme: 'untitled' })

            const doc = await vscode.workspace.openTextDocument(uri)
            const editor = await vscode.window.showTextDocument(
              doc,
              vscode.ViewColumn.Beside
            )

            const shouldSelectProperty =
              sortedJSON &&
              message.payload.selectColumn &&
              sortedJSON[message.payload.selectColumn] !== undefined

            const useSpaces: boolean = vscode.workspace
              .getConfiguration(null, null)
              .get('editor.insertSpaces')

            const tabSize: number = vscode.workspace
              .getConfiguration(null, null)
              .get('editor.tabSize')

            const space = useSpaces
              ? Array.from(Array(tabSize + 1)).join(' ')
              : '\t'

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
              const content = `${JSON.stringify(sortedJSON, null, space)}`
              edit.insert(new vscode.Position(0, 0), content)
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
  folderList: string[],
  panel: vscode.WebviewPanel
) {
  const commands = folderList
    .filter(file => {
      return file.startsWith('update-') && file.endsWith('.json')
    })
    .map(file => {
      return {
        id: Math.random(),
        action: 'update',
        compositKey: file.slice(7, file.length - 5),
        timestamp: Date.now()
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
