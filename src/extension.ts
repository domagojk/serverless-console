import * as vscode from 'vscode'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { getServices } from './settings'
import { removeService } from './removeService'
import { openFunction } from './logs/openFunction'
import { addService } from './addService'
import { openLogs } from './logs/openLogs'
import {
  openDynamoDb,
  postDefineDynamoDbCommandsMessage
} from './dynamoDb/openDynamoDb'
import { DynamoDBCodeLens } from './dynamoDb/DynamoDbCodeLens'
import { TreeItem } from './TreeItem'
import { join } from 'path'
import { tmpdir } from 'os'

export type ServiceItem = {
  title?: string
  description?: string
  uri?: any
  tabs?: {
    title: string
    logs?: string
    lambda?: string
    region?: string
  }[]
  icon?: string
  command?: {
    command: string
    title: string
  }
  collapsibleState?: vscode.TreeItemCollapsibleState
  items?: ServiceItem[]
}

export type Service = {
  type: 'serverlessFramework' | 'custom' | 'cloudformation' | 'dynamodb'
  hash: string
  stacks?: {
    stackName: string
    stage: string
    region?: string
  }[]
  icon?: string
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
  context?: {
    changes?: string[]
    onChangesUpdated?: vscode.EventEmitter<string[]>
  }
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

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDb',
    openDynamoDb(context)
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

  // vscode.commands.registerCommand(
  //   'serverlessConsole.update-dynamodb-item',
  //   (
  //     document: vscode.TextDocument,
  //     panel: vscode.WebviewPanel,
  //     { oldData, newData, hashKey, sortKey }
  //   ) => {
  //     let isDisposed = false
  //     try {
  //       panel.webview
  //     } catch (err) {
  //       isDisposed = true
  //     }
  //     if (isDisposed) {
  //       // todo error
  //       return vscode.window.showErrorMessage(
  //         'Can not save the item since parent DynamoDb console is closed'
  //       )
  //     }

  //     vscode.commands.executeCommand('workbench.action.closeActiveEditor')
  //     setTimeout(() => panel.reveal(), 0)

  //     const compositKey = !sortKey
  //       ? newData[hashKey]
  //       : `${newData[hashKey]}-${newData[sortKey]}`

  //     panel.webview.postMessage({
  //       type: 'addDynamoDbCommand',
  //       payload: {
  //         id: Math.random(),
  //         action: 'update',
  //         compositKey,
  //         timestamp: Date.now(),
  //         newData
  //       }
  //     })
  //   }
  // )

  // for diff, read-only virtual docs should be used
  // await vscode.commands.executeCommand('vscode.diff', uriLeft, uriRight, 'title')

  // `${now.format('MMMDD-HH_mm_ss')}.json`

  let codelensProvider = new DynamoDBCodeLens()
  vscode.languages.registerCodeLensProvider(['json'], codelensProvider)

  const dynamoDbTmpFolder = join(tmpdir(), 'vscode-sls-console/')

  vscode.workspace.onDidSaveTextDocument(e => {
    if (e.uri.fsPath.startsWith(dynamoDbTmpFolder)) {
      const relativePart = e.uri.fsPath.substr(dynamoDbTmpFolder.length)
      const [serviceHash, index, item] = relativePart.split('/')
      const service = fnHandlerProvider.services.find(
        service => service.hash === serviceHash
      )
      if (service) {
        fnHandlerProvider.refreshService(service)
      }
    }
  })

  // todo:
  // delete item command
  // deletes file from tmp and refreshes service

  // create item command
  // creates fike in tmp and refreshes service

  // icons for changes
  
  // diff for changes

  // execute dynamodb changes
  // reads directory and generates dynamodb commands
  // executing it one by one
  // opens items for updates
  // every commands pushes message about its status,
  // if there is an error, it can be read in log of the items webvide

  // handle /scan /orher-index
  // ? yes update only modified items like in aws console
  //    - compare witch items by using get-xy in the index/ folder

  // num of changes icon (kao za git (2))

  // saved query support

  // codelens
  // -Refresh DynamoDB Item
  // -Compare with original DynamoDB item
}

// this method is called when your extension is deactivated
export function deactivate() {}
