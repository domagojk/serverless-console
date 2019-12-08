import * as vscode from 'vscode'
import { TreeItem } from './TreeItem'
import { Service } from './extension'
import { serverlessFrameworkService } from './serviceGenerators/serverlessFrameworkService'
import { cloudformationService } from './serviceGenerators/cloudformationService'

export class FunctionHandlersProvider
  implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>()
  readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this
    ._onDidChangeTreeData.event

  constructor(public services: Service[] = [], public noFolder?: boolean) {}

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      if (this.noFolder) {
        return [
          new TreeItem(
            {
              label: 'You have not yet opened a folder.',
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.None
          )
        ]
      }

      if (this.services.length === 0) {
        return [
          new TreeItem(
            {
              label: 'Click to add a service...',
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.None,
            {
              command: 'serverlessConsole.addService',
              title: 'show help page',
              arguments: []
            }
          )
        ]
      }
      return this.services.map(service => {
        if (service.isLoading) {
          return new TreeItem(
            {
              label: service.title || `executing "${service.command}"...`,
              icon: 'loading',
              type: 'service',
              service
            },
            vscode.TreeItemCollapsibleState.Expanded
          )
        }

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
            label: service.title,
            icon: null,
            type: 'service',
            service
          },
          vscode.TreeItemCollapsibleState.Expanded
        )
      })
    } else if (element.settings.type === 'service') {
      return element.settings.service.items?.map(item => {
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

  refreshServices(services: Service[], options?: { refreshAll?: boolean }) {
    this.services = services.map(newService => {
      // adding "isLoading" to all services that have changed
      // or if "refreshAll" is used, all services are refresh no matter if the hash changed
      const oldService = this.services.find(s => s.hash === newService.hash)

      if (options?.refreshAll || !oldService) {
        return {
          ...newService,
          isLoading: true
        }
      } else {
        return oldService
      }
    })
    this._onDidChangeTreeData.fire()

    // looping trough all "isLoading" services and applying appropriate handler
    // when handler is done, service is updated (mutated this.services by finding the hash)
    return Promise.all(
      this.services
        .filter(s => s.isLoading)
        .map(service => {
          const handler =
            service.type === 'serverlessFramework'
              ? serverlessFrameworkService
              : service.type === 'cloudformation'
              ? cloudformationService
              : null

          if (handler) {
            return handler(service).then(updatedService => {
              this.mutateServiceByHash({
                ...updatedService,
                isLoading: false
              })
            })
          }
        })
    )
  }

  mutateServiceByHash(service: Service) {
    this.services = this.services.map(s => {
      if (s.hash === service.hash) {
        return service
      } else {
        return s
      }
    })
    this._onDidChangeTreeData.fire()
  }
}
