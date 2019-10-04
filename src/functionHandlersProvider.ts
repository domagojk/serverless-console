import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as YAML from 'yaml'
import { TreeItem, ServerlessYML } from './TreeItem'

export class FunctionHandlersProvider
  implements vscode.TreeDataProvider<TreeItem> {
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      const serverlessPath = vscode.workspace.workspaceFolders
        ? path.join(
            vscode.workspace.workspaceFolders[0].uri.path,
            'serverless.yml'
          )
        : null

      if (serverlessPath && this.pathExists(serverlessPath)) {
        const serverlessFile = fs.readFileSync(serverlessPath, 'utf8')
        const serverlessJSON: ServerlessYML = YAML.parse(serverlessFile)

        const serviceName = serverlessJSON.service.name

        return [
          new TreeItem(
            {
              label: serviceName,
              serverlessJSON,
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.Expanded
          )
        ]
      } else {
        vscode.window.showInformationMessage('Workspace has no serverless.yml')
        return []
      }
    } else if (element.settings.type === 'service') {
      return Object.keys(element.settings.serverlessJSON.functions).map(
        fnName => {
          return new TreeItem(
            {
              ...element.settings,
              label: fnName,
              type: 'function',
              function: fnName
            },
            vscode.TreeItemCollapsibleState.None
          )
        }
      )
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p)
    } catch (err) {
      return false
    }

    return true
  }
}
