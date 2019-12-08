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
      new FunctionHandlersProvider([], true)
    )
    return null
  }

  // sls print commands saved in settings
  const services = getServices(true)

  // Tree Provider instances
  const fnHandlerProvider = new FunctionHandlersProvider(services)

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

  vscode.commands.registerCommand('fnHandlerList.showError', error => {
    vscode.window.showErrorMessage(error)
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
