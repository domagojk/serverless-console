// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as path from 'path'
import { FunctionHandlersProvider } from './functionHandlersProvider'
import { getPrintCommands } from './settings'
import { getWebviewContent } from './functionLogsWebview'
import { TreeItem } from './TreeItem'

export type SlsCommand = {
  cwd: string
  command: string
  error?: string
}

export const serverlessDefaults = {
  provider: {
    region: 'us-east-1',
    stage: 'dev'
  }
}

export type ServerlessYML = {
  org: string
  service: {
    name: string
  }
  provider: {
    region: string
    name: string
    runtime: string
  }
  functions: Record<
    string,
    {
      handler: string
      events: {
        http: {
          method: string
          path: string
        }
      }[]
    }
  >
}

export type SlsConfig = {
  slsCommands: SlsCommand[]
  status?: 'done' | 'error'
  error?: string
  errorCommand?: SlsCommand
  config?: {
    command: SlsCommand
    yml: ServerlessYML
  }[]
}

export async function activate(context: vscode.ExtensionContext) {
  // sls print commands saved in settings
  const slsCommands = getPrintCommands()

  // Tree Provider instances
  const fnHandlerProvider = new FunctionHandlersProvider({ slsCommands })

  // register tree data providers
  vscode.window.registerTreeDataProvider('fnHandlerList', fnHandlerProvider)

  fnHandlerProvider.slsPrintRefresh(slsCommands)

  vscode.commands.registerCommand(
    'serverlessMonitor.openFunction',
    async uri => {
      let doc = await vscode.workspace.openTextDocument(uri)
      await vscode.window.showTextDocument(doc, { preview: true })
    }
  )

  vscode.commands.registerCommand(
    'fnHandlerList.openLogs',
    (treeItem: TreeItem) => {
      const mainJs = vscode.Uri.file(
        path.join(context.extensionPath, 'resources/webview', 'main.js')
      )

      getWebviewContent(
        treeItem,
        vscode.Uri.file(path.join(context.extensionPath, 'resources/webview')),
        mainJs
      )
    }
  )

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('serverlessmonitor.serverlessYmlPaths')) {
        fnHandlerProvider.slsPrintRefresh(getPrintCommands())
      }
    })
  )

  vscode.commands.registerCommand('fnHandlerList.refreshEntry', () => {
    fnHandlerProvider.refresh()
  })

  vscode.commands.registerCommand('fnHandlerList.openServerlessYml', () => {
    vscode.debug.startDebugging(
      vscode.workspace.getWorkspaceFolder(
        vscode.workspace.workspaceFolders[0].uri
      ),
      'slsMonitor.debugFn'
    )
  })

  let bla = null
  vscode.commands.registerCommand('slsMonitor.getFnName', () => {
    //vscode.window.showErrorMessage('can not')
    //return null
    if (!bla) {
      vscode.window.showQuickPick(['aa', 'bb']).then(a => {
        bla = true
        vscode.debug.startDebugging(
          vscode.workspace.getWorkspaceFolder(
            vscode.workspace.workspaceFolders[0].uri
          ),
          'slsMonitor.debugFn#2'
        )
      })

      return null
    } else {
      return 'getSignedUrl'
    }
  })

  const rootPath = vscode.workspace.workspaceFolders[0].uri.path

  vscode.commands.registerCommand('slsMonitor.getFnPath', () => {
    return rootPath + '/getSignedUrl'
  })

  vscode.commands.registerCommand('slsMonitor.getFnHandler', () => {
    return 'handler'
  })

  vscode.commands.registerCommand('slsMonitor.getFnData', () => {
    //return vscode.window.showQuickPick(['aa', 'bb'])

    return '{"a": 33}'
  })

  vscode.commands.registerCommand('slsMonitor.execFnSnippet', () => {
    return `require('${rootPath}/getSignedUrl').${'handler'}(${'{"a": 33}'})`
  })

  vscode.commands.registerCommand('slsMonitor.getEnvVars', () => {
    return {
      AAA: 123
    }
  })
}

// this method is called when your extension is deactivated
export function deactivate() {}
