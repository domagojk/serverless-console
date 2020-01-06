import * as vscode from 'vscode'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { getServices } from './settings'
import { removeService } from './commands/removeService'
import { openFunction } from './commands/openFunction'
import { addService } from './commands/addService'
import { openLogs } from './commands/openLogs'

export type ServiceItem = {
  title: string
  description?: string
  uri?: any
  tabs?: {
    title: string
    logs?: string
    lambda?: string
    region?: string
  }[]
}

export type Service = {
  type: 'serverlessFramework' | 'custom' | 'cloudformation'
  hash: string
  stacks?: {
    stackName: string
    stage: string
    region?: string
  }[]
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
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.registerTreeDataProvider(
      'fnHandlerList',
      new FunctionHandlersProvider({
        services: [],
        noFolder: true,
        extensionPath: context.extensionPath
      })
    )
    return null
  }

  // sls print commands saved in settings
  const services = getServices(true)

  // Tree Provider instances
  const fnHandlerProvider = new FunctionHandlersProvider({
    services,
    extensionPath: context.extensionPath
  })

  // register tree data providers
  vscode.window.registerTreeDataProvider('fnHandlerList', fnHandlerProvider)

  fnHandlerProvider.refreshServices(services, { refreshAll: true })

  vscode.commands.registerCommand(
    'serverlessConsole.openFunction',
    openFunction
  )

  vscode.commands.registerCommand(
    'serverlessConsole.removeService',
    removeService
  )

  let webviewErroPanel: vscode.WebviewPanel = null

  vscode.commands.registerCommand('fnHandlerList.showError', async error => {
    if (!webviewErroPanel) {
      webviewErroPanel = vscode.window.createWebviewPanel(
        'slsConsole-error',
        `Error Output`,
        vscode.ViewColumn.One,
        {
          enableScripts: false
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
    openLogs(context)
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('serverlessConsole.services')) {
        fnHandlerProvider.refreshServices(getServices())
      }
    })
  )

  vscode.commands.registerCommand('serverlessConsole.refreshEntry', () => {
    fnHandlerProvider.refreshServices(getServices(), { refreshAll: true })
  })

  // debug lambda archived
  // https://gist.github.com/domagojk/2380ce14dcabf6b138ab5f81b43717f0
}

// this method is called when your extension is deactivated
export function deactivate() {}
