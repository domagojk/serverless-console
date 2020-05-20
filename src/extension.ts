import * as vscode from 'vscode'
import { TreeDataProvider } from './treeDataProvider'
import { removeService } from './removeService'
import { addService } from './addService'
import { join, sep } from 'path'
import { tmpdir } from 'os'
import { dynamodbInit } from './dynamoDb/dynamodbInit'
import { logsInit } from './logs/logsInit'
import { showProOptions } from './checkLicense'
import { refreshServices } from './refreshServices'
import { openFile } from './openFile'
import { Store } from './store'
import { CloudformationOutput } from './logs/cloudformationService'
import { CustomLogsOutput } from './logs/customService'
import { DynamoServiceOutput } from './dynamoDb/dynamodbService'
import { ServerlessFrameworkOutput } from './logs/serverlessFrameworkService'

export type Service =
  | ServerlessFrameworkOutput
  | CloudformationOutput
  | CustomLogsOutput
  | DynamoServiceOutput

export async function activate(context: vscode.ExtensionContext) {
  const store = new Store()

  if (!vscode.workspace.workspaceFolders) {
    vscode.window.registerTreeDataProvider(
      'slsConsoleTree',
      new TreeDataProvider({
        context,
        store,
        noFolder: true,
      })
    )
    return null
  }

  // tmp directory (used for saving dynamodb changes)
  const serviceTmpDir = join(tmpdir(), 'vscode-sls-console', sep)

  refreshServices(store)

  // Tree Provider instances
  const treeDataProvider = new TreeDataProvider({
    context,
    store,
  })

  // register tree data providers
  vscode.window.registerTreeDataProvider('slsConsoleTree', treeDataProvider)

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('serverlessConsole.services')) {
        refreshServices(store)
      }
    })
  )

  vscode.commands.registerCommand('serverlessConsole.refreshEntry', () => {
    refreshServices(store)
  })

  vscode.commands.registerCommand(
    'serverlessConsole.removeService',
    removeService
  )

  vscode.commands.registerCommand(
    'serverlessConsole.addService',
    addService(context)
  )

  vscode.commands.registerCommand('serverlessConsole.proVersion', () => {
    showProOptions(context)
  })

  vscode.commands.registerCommand('serverlessConsole.openFile', openFile)

  logsInit(context)
  dynamodbInit(context, store, serviceTmpDir)
}

// this method is called when your extension is deactivated
export function deactivate() {}
