import * as vscode from 'vscode'
import { TreeItem } from './TreeItem'
import { Service } from './extension'
import { serverlessFrameworkService } from './serviceGenerators/serverlessFrameworkService'

export class FunctionHandlersProvider
  implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>()
  readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this
    ._onDidChangeTreeData.event

  constructor(public services: Service[] = []) {}

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      if (this.services.length === 0) {
        return [
          new TreeItem(
            {
              label: 'no services found',
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.None
          )
        ]
      }
      return this.services.map(service => {
        if (service.error) {
          return new TreeItem(
            {
              label: `error running "${service.command}"`,
              type: 'service',
              icon: 'error',
              service
            },
            vscode.TreeItemCollapsibleState.None,
            {
              command: 'fnHandlerList.showError',
              title: 'show error',
              arguments: [service.error]
            }
          )
        }

        return new TreeItem(
          {
            label:
              service.isLoading && service.command
                ? `running "${service.command}"...`
                : service.title,
            icon: service.isLoading ? 'loading' : null,
            type: 'service',
            service
          },
          service.isLoading
            ? vscode.TreeItemCollapsibleState.None
            : vscode.TreeItemCollapsibleState.Expanded
        )
      })
    } else if (element.settings.type === 'service') {
      return element.settings.service.items.map(item => {
        return new TreeItem(
          {
            ...element.settings,
            label: item.title,
            type: 'function',
            localSrc: item.uri,
            description: item.description,
            serviceItem: item
          },
          vscode.TreeItemCollapsibleState.None
        )
      })
    }
  }

  refreshAll(services: Service[]) {
    this.services
      .filter(({ type }) => type !== 'custom')
      .forEach(service => {
        service.isLoading = true
      })
    this._onDidChangeTreeData.fire()

    Promise.all(
      services.map(service => {
        if (service.type === 'serverlessFramework') {
          return serverlessFrameworkService(service).then(service => {
            return {
              ...service,
              isLoading: false
            }
          })
        }

        return Promise.resolve(service)
      })
    ).then((servicesResolved: any) => {
      this.services = servicesResolved
      this._onDidChangeTreeData.fire()
    })
  }
}
