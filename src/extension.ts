// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as path from 'path'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { getServices, getFontSize } from './settings'
import { getWebviewContent } from './functionLogsWebview'
import { TreeItem } from './TreeItem'
import * as AWS from 'aws-sdk'

var credentials = new AWS.SharedIniFileCredentials({
  profile: 'default'
})
AWS.config.credentials = credentials

export type ServiceItem = {
  title: string
  description?: string
  uri?: any
  tabs?: {
    region: string
    title: string
    logs?: string
    lambda?: string
  }[]
}

export type Service = {
  type: 'serverlessFramework' | 'custom'
  isLoading?: boolean
  error?: any
  title?: string
  cwd?: string
  command?: string
  stages?: string[]
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
    'fnHandlerList.openLogs',
    (treeItem: TreeItem) => {
      const staticJs = 'resources/webview/build/static/js'
      const staticCss = 'resources/webview/build/static/css'
      const cwd = context.extensionPath

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
          light: vscode.Uri.file(path.join(cwd, 'resources/light/event.svg')),
          dark: vscode.Uri.file(path.join(cwd, 'resources/dark/event.svg'))
        }

        treeItem.panel.webview.onDidReceiveMessage(
          async message => {
            switch (message.command) {
              case 'getLogStreams': {
                const cloudwatchlogs = new AWS.CloudWatchLogs({
                  region: 'us-east-1'
                })

                try {
                  const logStreams = await cloudwatchlogs
                    .describeLogStreams({
                      nextToken: message.payload.nextToken,
                      descending: true,
                      logGroupName: message.payload.logGroupName
                    })
                    .promise()

                  treeItem.panel.webview.postMessage({
                    messageId: message.messageId,
                    payload: {
                      nextToken: logStreams.nextToken,
                      logStreams: logStreams.logStreams
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
                  const cloudwatchlogs = new AWS.CloudWatchLogs({
                    region: 'us-east-1'
                  })
                  const log = await cloudwatchlogs
                    .getLogEvents({
                      nextToken: message.payload.nextToken,
                      logGroupName: treeItem.settings.serviceItem.tabs[0].logs,
                      logStreamName: message.payload.logStream
                    })
                    .promise()

                  treeItem.panel.webview.postMessage({
                    messageId: message.messageId,
                    payload: {
                      functionName: treeItem.label,
                      logEvents: log.events,
                      nextBackwardToken: log.nextBackwardToken,
                      nextForwardToken: log.nextForwardToken
                    }
                  })
                }
                break
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

  vscode.commands.registerCommand('fnHandlerList.refreshEntry', () => {
    fnHandlerProvider.refreshAll(getServices())
  })

  // debug lambda archived
  // https://gist.github.com/domagojk/2380ce14dcabf6b138ab5f81b43717f0
}

// this method is called when your extension is deactivated
export function deactivate() {}
