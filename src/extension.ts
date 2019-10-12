// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as path from 'path'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { TreeItem } from './TreeItem'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const functionHandlersProvider = new FunctionHandlersProvider()

  functionHandlersProvider.serverlessPath = transformPaths(getPaths())

  vscode.window.registerTreeDataProvider(
    'fnHandlerList',
    functionHandlersProvider
  )

  vscode.commands.registerCommand(
    'serverlessMonitor.openFunction',
    async uri => {
      let doc = await vscode.workspace.openTextDocument(uri)
      await vscode.window.showTextDocument(doc, { preview: true })
    }
  )

  vscode.commands.registerCommand(
    'fnHandlerList.openFunction',
    async (treeItem: TreeItem) => {}
  )

  vscode.commands.registerCommand('fnHandlerList.addService', async () => {
    const paths = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        ServerlessDefinition: ['yml']
      },
      openLabel: 'Add service',
      defaultUri: vscode.workspace.workspaceFolders[0].uri
    })

    if (!paths ||!paths[0]) {
      return false
    }

    const rootPath = vscode.workspace.workspaceFolders[0].uri.path

    vscode.workspace
      .getConfiguration()
      .update('serverlessmonitor.serverlessYmlPaths', [
        ...getPaths(),
        path.relative(rootPath, paths[0].path)
      ])
  })

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('serverlessmonitor.serverlessYmlPaths')) {
        functionHandlersProvider.serverlessPath = transformPaths(getPaths())
        functionHandlersProvider.refresh()
      }
    })
  )

  vscode.commands.registerCommand('fnHandlerList.refreshEntry', () => {
    functionHandlersProvider.refresh()
  })
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getPaths(): string {
  return vscode.workspace
    .getConfiguration()
    .get('serverlessmonitor.serverlessYmlPaths')
}

function transformPaths(savedPaths) {
  const rootPath = vscode.workspace.workspaceFolders[0].uri.path
  return savedPaths.map(savedPath => path.join(rootPath, savedPath))
}
