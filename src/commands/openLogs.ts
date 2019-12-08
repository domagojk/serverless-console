import * as vscode from 'vscode'
import { TreeItem } from '../TreeItem'
import { join } from 'path'
import { getWebviewContent } from '../functionLogsWebview'
import { getFontSize, getGroupPerRequest } from '../settings'
import { getAwsSdk } from '../getAwsSdk'

export const openLogs = (context: vscode.ExtensionContext) => async (
  treeItem: TreeItem
) => {
  const staticJs = 'resources/webview/build/static/js'
  const staticCss = 'resources/webview/build/static/css'
  const cwd = context.extensionPath
  const service = treeItem.settings.service

  const localResourceRoot = vscode.Uri.file(join(cwd, 'resources/webview'))

  if (!treeItem.panel) {
    treeItem.panel = vscode.window.createWebviewPanel(
      'slsConsoleLogs',
      `${treeItem.label}`,
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [localResourceRoot]
      }
    )

    getWebviewContent({
      panel: treeItem.panel,
      fontSize: getFontSize(),
      jsFiles: [
        vscode.Uri.file(join(cwd, staticJs, 'main1.js')),
        vscode.Uri.file(join(cwd, staticJs, 'main2.js')),
        vscode.Uri.file(join(cwd, staticJs, 'main3.js'))
      ],
      cssFiles: [
        vscode.Uri.file(join(cwd, staticCss, 'main1.css')),
        vscode.Uri.file(join(cwd, staticCss, 'main2.css'))
      ],
      inlineJs: `
        document.vscodeData = {
          page: 'logs',
          groupPerRequest: ${getGroupPerRequest()},
          tabs: ${JSON.stringify(treeItem.settings.serviceItem.tabs)}
        }
      `
    })

    treeItem.panel.iconPath = {
      light: vscode.Uri.file(join(cwd, 'resources/light/logs.svg')),
      dark: vscode.Uri.file(join(cwd, 'resources/dark/logs.svg'))
    }

    treeItem.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'getLogStreams': {
            const AWS = getAwsSdk(service.awsProfile, message.payload.region || service.region)
            const cloudwatchlogs = new AWS.CloudWatchLogs()

            try {
              const logStreams = await cloudwatchlogs
                .describeLogStreams({
                  orderBy: 'LastEventTime',
                  nextToken: message.payload.nextToken,
                  descending: true,
                  logGroupName: message.payload.logGroupName
                })
                .promise()

              treeItem.panel.webview.postMessage({
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
              treeItem.panel.webview.postMessage({
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
          case 'getLogEvents':
            {
              const AWS = getAwsSdk(
                treeItem.settings.service.awsProfile,
                treeItem.settings.service.region
              )
              const cloudwatchlogs = new AWS.CloudWatchLogs()
              const log = await cloudwatchlogs
                .getLogEvents({
                  nextToken: message.payload.nextToken,
                  logGroupName: message.payload.logGroup,
                  logStreamName: message.payload.logStream
                })
                .promise()

              treeItem.panel.webview.postMessage({
                messageId: message.messageId,
                payload: {
                  functionName: treeItem.label,
                  logEvents: log.events.map(log => {
                    return {
                      ...log,
                      timestamp: service.timeOffsetInMs
                        ? log.timestamp + service.timeOffsetInMs
                        : log.timestamp
                    }
                  }),
                  nextBackwardToken: log.nextBackwardToken,
                  nextForwardToken: log.nextForwardToken
                }
              })
            }
            break
          case 'getLambdaOverview': {
            const AWS = getAwsSdk(
              treeItem.settings.service.awsProfile,
              message.payload.region || treeItem.settings.service.region
            )
            const lambda = new AWS.Lambda()
            try {
              const lambdaOverview = await lambda
                .getFunction({
                  FunctionName: message.payload.fnName
                })
                .promise()

              treeItem.panel.webview.postMessage({
                messageId: message.messageId,
                payload: {
                  codeSize: lambdaOverview.Configuration.CodeSize,
                  lastModified: lambdaOverview.Configuration.LastModified,
                  memorySize: lambdaOverview.Configuration.MemorySize,
                  runtime: lambdaOverview.Configuration.Runtime,
                  timeout: lambdaOverview.Configuration.Timeout
                }
              })
            } catch (err) {
              treeItem.panel.webview.postMessage({
                messageId: message.messageId,
                payload: {
                  error:
                    err && err.message
                      ? err.message
                      : 'error retriving function overview'
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
