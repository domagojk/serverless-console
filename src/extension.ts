// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { CustomTreeProvider } from './customTreeProvider'
import { FunctionHandlersProvider } from './functionHandlersProvider'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const customTreeProvider = new CustomTreeProvider()
  const functionHandlersProvider = new FunctionHandlersProvider()

  vscode.window.registerTreeDataProvider('fnHandlerList', functionHandlersProvider)
  vscode.window.registerTreeDataProvider('fnPerStage', customTreeProvider)


  vscode.commands.registerCommand(
    'fnPerStage.refreshEntry',
    () =>
      // customTreeProvider.refresh()
      null
  )
}

// this method is called when your extension is deactivated
export function deactivate() {}
