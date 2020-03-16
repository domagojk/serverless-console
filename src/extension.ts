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
  DynamoDiffProvider
} from './dynamoDb/openDynamoDbItemDiff'
import { join } from 'path'
import { tmpdir } from 'os'
import { DynamoDB } from 'aws-sdk'

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
  envVars?: { key: string; value: string }[]
  timeOffsetInMs?: number
  items?: ServiceItem[]
  tableName?: string
  context?: {
    changes?: DynamoDbFileChange[]
    onChangesUpdated?: vscode.EventEmitter<DynamoDbFileChange[]>
    tableDescribeOutput?: DynamoDB.TableDescription
    hashKey?: string
    sortKey?: string
  }
}

export type DynamoDbFileChange = {
  name: string
  compositKey: string
  modified: number
}

export async function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    vscode.window.registerTreeDataProvider(
      'slsConsoleTree',
      new TreeDataProvider({
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
  const treeDataProvider = new TreeDataProvider({
    services,
    extensionPath: context.extensionPath
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

  vscode.commands.registerCommand('slsConsoleTree.showError', async error => {
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
    openDynamoDb(context, treeDataProvider)
  )

  vscode.commands.registerCommand(
    'serverlessConsole.openDynamoDbItemDiff',
    openDynamoDbItemDiff(context)
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('serverlessConsole.services')) {
        treeDataProvider.refreshServices(getServices())
      }
    })
  )

  vscode.commands.registerCommand('serverlessConsole.refreshEntry', () => {
    treeDataProvider.refreshServices(getServices(), { refreshAll: true })
  })

  const dynamoDbTmpFolder = join(tmpdir(), 'vscode-sls-console/')

  vscode.workspace.onDidSaveTextDocument(e => {
    if (e.uri.fsPath.startsWith(dynamoDbTmpFolder)) {
      const relativePart = e.uri.fsPath.substr(dynamoDbTmpFolder.length)
      const [serviceHash, index, item] = relativePart.split('/')
      const service = treeDataProvider.services.find(
        service => service.hash === serviceHash
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
  //   - compare witch items by using getItem in /scan and queryItem with proper values if not scan
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
