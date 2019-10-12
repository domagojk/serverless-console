import * as vscode from 'vscode'
import * as fs from 'fs'
import * as YAML from 'yaml'
import { TreeItem, ServerlessYML } from './TreeItem'

export class FunctionHandlersProvider
  implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>()
  readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this
    ._onDidChangeTreeData.event
  public serverlessPath: string[] = []

  refresh() {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      const services = this.serverlessPath
        .filter(serverlessPath => this.pathExists(serverlessPath))
        .map(serverlessPath => {
          const serverlessFile = fs.readFileSync(serverlessPath, 'utf8')
          const serverlessJSON: ServerlessYML = YAML.parse(serverlessFile)

          return new TreeItem(
            {
              label: serverlessJSON.service.name,
              serverlessJSON,
              serverlessPath: serverlessPath.split('/serverless.yml')[0],
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.Expanded
          )
        })

      if (services.length === 0) {
        vscode.window.showInformationMessage('Workspace has no serverless.yml')
      }
      return services
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
