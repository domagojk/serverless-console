// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { TreeItem } from './TreeItem'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const functionHandlersProvider = new FunctionHandlersProvider()

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
    async (treeItem: TreeItem) => {
      
    }
  )

  vscode.commands.registerCommand(
    'fnPerStage.refreshEntry',
    () =>
      // customTreeProvider.refresh()
      null
  )
}

// this method is called when your extension is deactivated
export function deactivate() {}
