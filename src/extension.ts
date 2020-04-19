import * as vscode from 'vscode'
import { TreeDataProvider } from './treeDataProvider'
import { getServices } from './settings'
import { removeService } from './removeService'
import { addService } from './addService'
import { join } from 'path'
import { tmpdir } from 'os'
import { createStore } from './store'
import { cleanEmptyDirs } from './cleanEmptyDirs'
import { dynamodbInit } from './dynamoDb/dynamodbInit'
import { logsInit } from './logs/logsInit'
import { showProOptions } from './checkLicense'

export async function activate(context: vscode.ExtensionContext) {
  const store = createStore()

  if (!vscode.workspace.workspaceFolders) {
    vscode.window.registerTreeDataProvider(
      'slsConsoleTree',
      new TreeDataProvider({
        store,
        services: [],
        noFolder: true,
        extensionPath: context.extensionPath,
      })
    )
    return null
  }

  // sls print commands saved in settings
  const services = getServices()

  // tmp directory (used for saving dynamodb changes)
  const serviceTmpDir = join(tmpdir(), 'vscode-sls-console/')

  services.forEach((service) => {
    if (service.type === 'dynamodb') {
      cleanEmptyDirs(join(serviceTmpDir, service.hash))
    }
  })

  // Tree Provider instances
  const treeDataProvider = new TreeDataProvider({
    store,
    services,
    extensionPath: context.extensionPath,
  })

  // register tree data providers
  vscode.window.registerTreeDataProvider('slsConsoleTree', treeDataProvider)

  treeDataProvider.refreshServices(services, { refreshAll: true })

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

  vscode.commands.registerCommand(
    'serverlessConsole.removeService',
    removeService
  )

  vscode.commands.registerCommand(
    'serverlessConsole.addService',
    addService(context, store)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.proVersion',
    showProOptions
  )

  logsInit(context, treeDataProvider)
  dynamodbInit(context, treeDataProvider, store, serviceTmpDir)
}

// this method is called when your extension is deactivated
export function deactivate() {}
