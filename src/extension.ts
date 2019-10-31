// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as path from 'path'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { getPrintCommands, getFontSize } from './settings'
import { getWebviewContent } from './functionLogsWebview'
import { TreeItem } from './TreeItem'
import { CloudWatchLogs } from 'aws-sdk'

export type SlsCommand = {
  cwd: string
  command: string
  error?: string
}

export const serverlessDefaults = {
  provider: {
    region: 'us-east-1',
    stage: 'dev'
  }
}

export type ServerlessYML = {
  org: string
  service: {
    name: string
  }
  provider: {
    region: string
    name: string
    runtime: string
  }
  functions: Record<
    string,
    {
      handler: string
      events: {
        http: {
          method: string
          path: string
        }
      }[]
    }
  >
}

export type SlsConfig = {
  slsCommands: SlsCommand[]
  status?: 'done' | 'error'
  error?: string
  errorCommand?: SlsCommand
  config?: {
    command: SlsCommand
    yml: ServerlessYML
  }[]
}

export async function activate(context: vscode.ExtensionContext) {
  // sls print commands saved in settings
  const slsCommands = getPrintCommands()

  // Tree Provider instances
  const fnHandlerProvider = new FunctionHandlersProvider({ slsCommands })

  // register tree data providers
  vscode.window.registerTreeDataProvider('fnHandlerList', fnHandlerProvider)

  fnHandlerProvider.slsPrintRefresh(slsCommands)

  vscode.commands.registerCommand(
    'serverlessMonitor.openFunction',
    async uri => {
      let doc = await vscode.workspace.openTextDocument(uri)
      await vscode.window.showTextDocument(doc, { preview: true })
    }
  )

  vscode.commands.registerCommand(
    'fnHandlerList.openLogs',
    (treeItem: TreeItem) => {
      const staticJs = 'resources/webview/build/static/js'
      const staticCss = 'resources/webview/build/static/css'
      const cwd = context.extensionPath

      getWebviewContent({
        treeItem,
        fontSize: getFontSize(),
        localResourceRoot: vscode.Uri.file(path.join(cwd, 'resources/webview')),
        jsFiles: [
          vscode.Uri.file(path.join(cwd, staticJs, 'main1.js')),
          vscode.Uri.file(path.join(cwd, staticJs, 'main2.js'))
        ],
        cssFiles: [
          vscode.Uri.file(path.join(cwd, staticCss, 'main1.css')),
          vscode.Uri.file(path.join(cwd, staticCss, 'main2.css'))
        ]
      })

      treeItem.panel.webview.onDidReceiveMessage(
        async message => {
          switch (message.command) {
            case 'getLogStreams': {
              const cloudwatchlogs = new CloudWatchLogs({
                region: treeItem.settings.serverlessJSON.provider.region
              })
              const logStreams = await cloudwatchlogs
                .describeLogStreams({
                  descending: true,
                  logGroupName: `/aws/lambda/backend-dev-${treeItem.settings.function}`
                })
                .promise()

              treeItem.panel.webview.postMessage({
                messageId: message.messageId,
                payload: {
                  functionName: treeItem.settings.function,
                  logStreams: logStreams.logStreams
                }
              })
            }
            case 'getLogEvents': {
              const cloudwatchlogs = new CloudWatchLogs({
                region: treeItem.settings.serverlessJSON.provider.region
              })
              const log = await cloudwatchlogs
                .getLogEvents({
                  logGroupName: `/aws/lambda/backend-dev-${treeItem.settings.function}`,
                  logStreamName: message.payload.logStream
                })
                .promise()

              treeItem.panel.webview.postMessage({
                messageId: message.messageId,
                payload: {
                  functionName: treeItem.settings.function,
                  logEvents: log.events
                }
              })
            }
          }
        },
        undefined,
        context.subscriptions
      )
    }
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('serverlessmonitor.serverlessYmlPaths')) {
        fnHandlerProvider.slsPrintRefresh(getPrintCommands())
      }
    })
  )

  vscode.commands.registerCommand('fnHandlerList.refreshEntry', () => {
    fnHandlerProvider.refresh()
  })

  vscode.commands.registerCommand('fnHandlerList.openFunction', () => {
    const cloudwatchlogs = new CloudWatchLogs({
      region: 'us-east-1'
    })

    /*
    cloudwatchlogs
      .describeLogStreams({
        descending: true,
        logGroupName: `/aws/lambda/backend-dev-getSignedUrl`
      })
      .promise()
      .then(a => {
        console.log(JSON.stringify(a.logStreams, null, 2))
      })
      .catch(err => {
        console.log(err)
        return [] as AWS.CloudWatchLogs.LogStream[]
      })
      */

    cloudwatchlogs
      .getLogEvents({
        logGroupName: `/aws/lambda/backend-dev-getSignedUrl`,
        logStreamName: '2019/10/23/[$LATEST]1aff4d83011f41fc8aff950988ecf5e4'
      })
      .promise()
      .then(a => {
        let buf = Buffer.from(JSON.stringify(a.events))
        let encodedData = buf.toString('base64')
        console.log(encodedData)
      })
      .catch(err => {
        console.log(err)
        return [] as AWS.CloudWatchLogs.LogStream[]
      })
  })

  vscode.commands.registerCommand('fnHandlerList.openServerlessYml', () => {
    vscode.debug.startDebugging(
      vscode.workspace.getWorkspaceFolder(
        vscode.workspace.workspaceFolders[0].uri
      ),
      'slsMonitor.debugFn'
    )
  })

  let bla = null
  vscode.commands.registerCommand('slsMonitor.getFnName', () => {
    //vscode.window.showErrorMessage('can not')
    //return null
    if (!bla) {
      vscode.window.showQuickPick(['aa', 'bb']).then(a => {
        bla = true
        vscode.debug.startDebugging(
          vscode.workspace.getWorkspaceFolder(
            vscode.workspace.workspaceFolders[0].uri
          ),
          'slsMonitor.debugFn#2'
        )
      })

      return null
    } else {
      return 'getSignedUrl'
    }
  })

  const rootPath = vscode.workspace.workspaceFolders[0].uri.path

  vscode.commands.registerCommand('slsMonitor.getFnPath', () => {
    return rootPath + '/getSignedUrl'
  })

  vscode.commands.registerCommand('slsMonitor.getFnHandler', () => {
    return 'handler'
  })

  vscode.commands.registerCommand('slsMonitor.getFnData', () => {
    //return vscode.window.showQuickPick(['aa', 'bb'])

    return '{"a": 33}'
  })

  vscode.commands.registerCommand('slsMonitor.execFnSnippet', () => {
    return `require('${rootPath}/getSignedUrl').${'handler'}(${'{"a": 33}'})`
  })

  vscode.commands.registerCommand('slsMonitor.getEnvVars', () => {
    return {
      AAA: 123
    }
  })
}

// this method is called when your extension is deactivated
export function deactivate() {}
