import * as vscode from 'vscode'
import { TreeItem } from '../TreeItem'
import { join } from 'path'
import { getWebviewContent } from '../functionLogsWebview'
import { getFontSize, getFontFamily } from '../settings'
import { getAwsSdk } from '../getAwsSdk'

export const openDynamoDb = (context: vscode.ExtensionContext) => async (
  treeItem: TreeItem
) => {
  const staticJs = 'resources/webview/build/static/js'
  const staticCss = 'resources/webview/build/static/css'
  const extesionPath = context.extensionPath
  const service = treeItem.settings.service

  const localResourceRoot = vscode.Uri.file(
    join(extesionPath, 'resources/webview')
  )

  if (!treeItem.panel) {
    treeItem.panel = vscode.window.createWebviewPanel(
      'slsConsoledynamodb',
      `${treeItem.label}`,
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
        light: vscode.Uri.file(treeItem.iconPathObj.light),
        dark: vscode.Uri.file(treeItem.iconPathObj.dark)
      }
    }

    treeItem.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'getLogStreams': {
            if (!treeItem.panel.visible) {
              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {
                  ignore: true
                }
              })
              return null
            }
            const AWS = getAwsSdk(
              service.awsProfile,
              message.payload.region || service.region
            )
            const cloudwatchlogs = new AWS.CloudWatchLogs()

            try {
              const logStreams = await cloudwatchlogs
                .describeLogStreams({
                  limit: message.payload.limit,
                  orderBy: 'LastEventTime',
                  nextToken: message.payload.nextToken,
                  descending: true,
                  logGroupName: message.payload.logGroupName
                })
                .promise()

              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {
                  nextToken: logStreams.nextToken,
                  logStreams: logStreams.logStreams.map(logStream => {
                    const timestamp =
                      logStream.lastEventTimestamp || logStream.creationTime

                    return {
                      ...logStream,
                      sortByTimestamp: service.timeOffsetInMs
                        ? timestamp + service.timeOffsetInMs
                        : timestamp
                    }
                  })
                }
              })
            } catch (err) {
              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {
                  error:
                    err && err.message
                      ? err.message
                      : 'error retriving log streams'
                }
              })
            }
            break
          }
        }
      },
      undefined,
      context.subscriptions
    )

    treeItem.panel.onDidDispose(() => {
      delete treeItem.panel
    })
  }
  treeItem.panel.reveal()
}
