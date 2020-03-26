import * as vscode from 'vscode'
import { TreeDataProvider } from './treeDataProvider'
import { getServices } from './settings'
import { removeService } from './removeService'
import { openFunction } from './logs/openFunction'
import { addService } from './addService'
import { openLogs } from './logs/openLogs'
import { openDynamoDb } from './dynamoDb/openDynamoDb'
import {
  openDynamoDbItemDiff,
  DynamoDiffProvider,
} from './dynamoDb/openDynamoDbItemDiff'
import { join } from 'path'
import { tmpdir } from 'os'

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.registerTreeDataProvider(
      'slsConsoleTree',
      new TreeDataProvider({
        services: [],
        noFolder: true,
        extensionPath: context.extensionPath,
      })
    )
    return null
  }

  // sls print commands saved in settings
  const services = getServices(true)

  // Tree Provider instances
  const treeDataProvider = new TreeDataProvider({
    services,
    extensionPath: context.extensionPath,
  })

  // register tree data providers
  vscode.window.registerTreeDataProvider('slsConsoleTree', treeDataProvider)

  treeDataProvider.refreshServices(services, { refreshAll: true })

  vscode.commands.registerCommand(
    'serverlessConsole.openFunction',
    openFunction
  )

  vscode.commands.registerCommand(
    'serverlessConsole.removeService',
    removeService
  )

  let webviewErroPanel: vscode.WebviewPanel = null

  vscode.commands.registerCommand('slsConsoleTree.showError', async (error) => {
    if (!webviewErroPanel) {
      webviewErroPanel = vscode.window.createWebviewPanel(
        'slsConsole-error',
        `Error Output`,
        vscode.ViewColumn.One,
        {
          enableScripts: false,
        }
      )
    }
    let withNewLine = error.replace(/\n/g, '<br>')
    webviewErroPanel.webview.html = `<p style="font-family: monospace; padding:10px">${withNewLine}</p>`
    webviewErroPanel.reveal()

    webviewErroPanel.onDidDispose(() => {
      webviewErroPanel = null
    })
  })

  vscode.commands.registerCommand(
    'serverlessConsole.addService',
    addService(context)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openLogs',
    openLogs(context, treeDataProvider)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDb',
    openDynamoDb(context, treeDataProvider)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDbItemDiff',
    openDynamoDbItemDiff(context, treeDataProvider)
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('serverlessConsole.services')) {
        treeDataProvider.refreshServices(getServices())
      }
    })
  )

  vscode.commands.registerCommand('serverlessConsole.refreshEntry', () => {
    treeDataProvider.refreshServices(getServices(), { refreshAll: true })
  })

  const dynamoDbTmpFolder = join(tmpdir(), 'vscode-sls-console/')

  vscode.workspace.onDidSaveTextDocument((e) => {
    if (e.uri.fsPath.startsWith(dynamoDbTmpFolder)) {
      const relativePart = e.uri.fsPath.substr(dynamoDbTmpFolder.length)
      const [serviceHash, index, item] = relativePart.split('/')
      const service = treeDataProvider.services.find(
        (service) => service.hash === serviceHash
      )
      if (service) {
        treeDataProvider.refreshService(service)
      }
    }
  })

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      'dynamodb-item-diff',
      new DynamoDiffProvider(treeDataProvider)
    )
  )
  // todo:

  // handle /scan /orher-index
  // update only modified items like in aws console
  //   - diff similar to vscode in order to figure out dynamodb command (not updating the whole doc, aws console also updates per prop)

  // execute dynamodb changes
  // reads directory and generates dynamodb commands
  // executing it one by one
  // opens items for updates
  // every commands pushes message about its status,
  // if there is an error, it can be read in log of the items webvide

  // num of changes icon (kao za git (2))

  // saved query support
}

// this method is called when your extension is deactivated
export function deactivate() {}
