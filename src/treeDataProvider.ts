import * as vscode from 'vscode'
import { TreeItem } from './TreeItem'
import { Store } from './store'

export class TreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>()
  readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this
    ._onDidChangeTreeData.event
  noFolder: boolean
  context: vscode.ExtensionContext
  store: Store

  constructor({
    store,
    noFolder,
    context,
  }: {
    store: Store
    noFolder?: boolean
    context: vscode.ExtensionContext
  }) {
    this.store = store
    this.noFolder = noFolder
    this.context = context

    store.subscribeToSlsConsoleFiles(() => {
      this._onDidChangeTreeData.fire()
    })
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: vscode.TreeItem): Promise<TreeItem[]> {
    if (!element) {
      if (this.noFolder) {
        return [
          new TreeItem(
            {
              context: this.context,
              id: 'noitem',
              label: 'You have not yet opened a folder.',
            },
            vscode.TreeItemCollapsibleState.None
          ),
        ]
      }
    }

    const treeItems = this.store.getSlsConsoleFiles().filter((treeItem) => {
      if (!element) {
        return !treeItem.parent
      } else {
        return treeItem.parent === element.id
      }
    })

    return treeItems.map((treeItem) => {
      return new TreeItem(
        {
          context: this.context,
          label: treeItem.title,
          id: treeItem.id,
          icon: treeItem.icon,
          description: treeItem.description,
          command: treeItem.command,
          localSrc: treeItem.uri,
          contextValue: treeItem.contextValue,
          serviceHash: treeItem.serviceHash,
        },
        treeItem.collapsibleState
      )
    })
  }
}
