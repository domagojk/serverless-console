import * as vscode from 'vscode'
import { TreeDataProvider } from '../treeDataProvider'
import { openFunction } from './openFunction'
import { openLogs } from './openLogs'

export function logsInit(
  context: vscode.ExtensionContext,
  treeDataProvider: TreeDataProvider
) {
  vscode.commands.registerCommand(
    'serverlessConsole.openFunction',
    openFunction
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
    'serverlessConsole.openLogs',
    openLogs(context, treeDataProvider)
  )
}
