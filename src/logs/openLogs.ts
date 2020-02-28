import * as vscode from 'vscode'
import { TreeItem } from '../TreeItem'
import { join } from 'path'
import { getWebviewContent } from './functionLogsWebview'
import {
  getFontSize,
  getGroupPerRequest,
  getAutoRefreshInterval,
  setAutoRefreshInterval,
  getFontFamily
} from '../settings'
import { getAwsSdk } from '../getAwsSdk'

export const openLogs = (context: vscode.ExtensionContext) => async (
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
      'slsConsoleLogs',
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
          page: 'logs',
          groupPerRequest: ${getGroupPerRequest()},
          autoRefreshInterval: ${getAutoRefreshInterval()},
          fontSize: "${getFontSize()}",
          fontFamily: "${getFontFamily()}",
          tabs: ${JSON.stringify(treeItem.settings.serviceItem.tabs)}
        }
      `
    })

    if (treeItem.iconPathObj) {
      treeItem.panel.iconPath = {
        light: vscode.Uri.file(treeItem.iconPathObj.light),
        dark: vscode.Uri.file(treeItem.iconPathObj.dark)
      }
    }

    const autoRefreshEnabledVal = getAutoRefreshInterval() || 5000

    treeItem.panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'setAutoRefresh': {
            const newVal = message.payload.enabled ? autoRefreshEnabledVal : 0
            setAutoRefreshInterval(newVal)
            treeItem.panel?.webview?.postMessage({
              messageId: message.messageId,
              payload: {
                autoRefreshInterval: newVal
              }
            })
            break
          }
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
          case 'getLogEvents':
            {
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
                treeItem.settings.service.awsProfile,
                message.payload.region || treeItem.settings.service.region
              )
              const cloudwatchlogs = new AWS.CloudWatchLogs()

              try {
                const log = await cloudwatchlogs
                  .getLogEvents({
                    nextToken: message.payload.nextToken,
                    logGroupName: message.payload.logGroup,
                    logStreamName: message.payload.logStream
                  })
                  .promise()

                treeItem.panel?.webview?.postMessage({
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
              } catch (err) {
                treeItem.panel?.webview?.postMessage({
                  messageId: message.messageId,
                  payload: {
                    error:
                      err && err.message
                        ? err.message
                        : 'error retriving log events'
                  }
                })
              }
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

              treeItem.panel?.webview?.postMessage({
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
              treeItem.panel?.webview?.postMessage({
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
          case 'startQuery': {
            const AWS = getAwsSdk(
              service.awsProfile,
              message.payload.region || service.region
            )
            const cloudwatchlogs = new AWS.CloudWatchLogs()

            try {
              const { queryId } = await cloudwatchlogs
                .startQuery({
                  startTime: message.payload.startTime,
                  endTime: message.payload.endTime,
                  queryString: message.payload.query,
                  logGroupName: message.payload.logGroupName
                })
                .promise()

              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                stream: true,
                payload: {
                  ref: message.payload.ref,
                  queryId
                }
              })
            } catch (err) {
              console.log(err)
              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {
                  error:
                    err && err.message ? err.message : 'error querying logs'
                }
              })
            }
            break
          }
          case 'getQueryResults': {
            const AWS = getAwsSdk(
              service.awsProfile,
              message.payload.region || service.region
            )
            const cloudwatchlogs = new AWS.CloudWatchLogs()

            try {
              const res = await cloudwatchlogs
                .getQueryResults({
                  queryId: message.payload.queryId
                })
                .promise()

              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {
                  ...res,
                  ref: message.payload.ref
                }
              })
            } catch (err) {
              console.log(err)
              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {
                  error:
                    err && err.message ? err.message : 'error querying logs'
                }
              })
            }
            break
          }
          case 'stopQuery': {
            const AWS = getAwsSdk(
              service.awsProfile,
              message.payload.region || service.region
            )
            const cloudwatchlogs = new AWS.CloudWatchLogs()

            try {
              await cloudwatchlogs
                .stopQuery({
                  queryId: message.payload.queryId
                })
                .promise()

              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {}
              })
            } catch (err) {
              treeItem.panel?.webview?.postMessage({
                messageId: message.messageId,
                payload: {}
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
