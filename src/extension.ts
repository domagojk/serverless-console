// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as path from 'path'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { getServices, getFontSize } from './settings'
import { getWebviewContent } from './functionLogsWebview'
import { TreeItem } from './TreeItem'
import * as AWS from 'aws-sdk'
import { readFileSync } from 'fs'
import { createHelpWebview } from './helpWebview'

function setAwsConfig(profile: string, region?: string) {
  var credentials = new AWS.SharedIniFileCredentials({
    profile
  })
  AWS.config.credentials = credentials
  if (region) {
    AWS.config.region = region
  }
}

export type ServiceItem = {
  title: string
  description?: string
  uri?: any
  tabs?: {
    title: string
    logs?: string
    lambda?: string
  }[]
}

export type Service = {
  type: 'serverlessFramework' | 'custom'
  awsProfile?: string
  region?: string
  isLoading?: boolean
  error?: any
  title?: string
  cwd?: string
  command?: string
  stages?: string[]
  timeOffsetInMs?: number
  items?: ServiceItem[]
}

export async function activate(context: vscode.ExtensionContext) {
  // sls print commands saved in settings
  const services = getServices()

  // Tree Provider instances
  const fnHandlerProvider = new FunctionHandlersProvider(services)

  // register tree data providers
  vscode.window.registerTreeDataProvider('fnHandlerList', fnHandlerProvider)

  fnHandlerProvider.refreshAll(services)

  vscode.commands.registerCommand(
    'serverlessConsole.openFunction',
    async (treeItem: TreeItem) => {
      if (treeItem.uri) {
        let doc = await vscode.workspace.openTextDocument(treeItem.uri)
        await vscode.window.showTextDocument(doc, { preview: false })
      }
    }
  )

  vscode.commands.registerCommand('fnHandlerList.showError', error => {
    vscode.window.showErrorMessage(error)
  })

  vscode.commands.registerCommand(
    'serverlessConsole.showHelpPage',
    async () => {
      const content = readFileSync(
        path.join(__filename, '..', '..', 'src/help.md'),
        {
          encoding: 'utf8'
        }
      )
      let doc = await vscode.workspace.openTextDocument({
        content,
        language: `markdown`
      })

      let html = (await vscode.commands.executeCommand(
        'markdown.api.render',
        doc.getText()
      )) as string

      createHelpWebview({
        cwd: context.extensionPath,
        html
      })
    }
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openWorkspaceSettingsJson',
    () => {
      if (!vscode.workspace.rootPath) {
        return
      }
      const editor = new vscode.WorkspaceEdit()

      // set filepath for settings.json
      const filePath = path.join(
        vscode.workspace.rootPath,
        '.vscode',
        'settings.json'
      )

      const openPath = vscode.Uri.file(filePath)
      // create settings.json if it does not exist
      editor.createFile(openPath, { ignoreIfExists: true })
      // open workspace settings.json
      vscode.workspace.applyEdit(editor).then(() => {
        vscode.workspace.openTextDocument(openPath).then(doc => {
          vscode.window.showTextDocument(doc)
        })
      })
    }
  )

  vscode.commands.registerCommand(
    'fnHandlerList.openLogs',
    (treeItem: TreeItem) => {
      const staticJs = 'resources/webview/build/static/js'
      const staticCss = 'resources/webview/build/static/css'
      const cwd = context.extensionPath
      const service = treeItem.settings.service

      const localResourceRoot = vscode.Uri.file(
        path.join(cwd, 'resources/webview')
      )

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
            vscode.Uri.file(path.join(cwd, staticJs, 'main1.js')),
            vscode.Uri.file(path.join(cwd, staticJs, 'main2.js')),
            vscode.Uri.file(path.join(cwd, staticJs, 'main3.js'))
          ],
          cssFiles: [
            vscode.Uri.file(path.join(cwd, staticCss, 'main1.css')),
            vscode.Uri.file(path.join(cwd, staticCss, 'main2.css'))
          ],
          inlineJs: `
            document.vscodeData = {
              tabs: ${JSON.stringify(treeItem.settings.serviceItem.tabs)}
            }
          `
        })

        treeItem.panel.iconPath = {
          light: vscode.Uri.file(path.join(cwd, 'resources/light/logs.svg')),
          dark: vscode.Uri.file(path.join(cwd, 'resources/dark/logs.svg'))
        }

        treeItem.panel.webview.onDidReceiveMessage(
          async message => {
            switch (message.command) {
              case 'getLogStreams': {
                setAwsConfig(service.awsProfile, service.region)
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
                  setAwsConfig(
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
                setAwsConfig(
                  treeItem.settings.service.awsProfile,
                  treeItem.settings.service.region
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
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('serverlessConsole.services')) {
        fnHandlerProvider.refreshAll(getServices())
      }
    })
  )

  vscode.commands.registerCommand('serverlessConsole.refreshEntry', () => {
    fnHandlerProvider.refreshAll(getServices())
  })

  // debug lambda archived
  // https://gist.github.com/domagojk/2380ce14dcabf6b138ab5f81b43717f0
}

// this method is called when your extension is deactivated
export function deactivate() {}
