import * as vscode from 'vscode'
import { Service, ServiceItem } from './extension'
import * as path from 'path'

export class TreeItem extends vscode.TreeItem {
  uri: vscode.Uri
  public panel: vscode.WebviewPanel

  constructor(
    public readonly settings: {
      type: string
      label: string
      icon?: string
      service?: Service
      serviceItem?: ServiceItem
      description?: string
      localSrc?: vscode.Uri
    },
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(settings.label, collapsibleState)
    this.contextValue = settings.type

    if (settings.type === 'service') {
      switch (settings.icon) {
        case 'error':
          this.iconPath = getImgPath('error')
          break
        case 'loading':
          this.iconPath = getImgPath('loading')
          break
        default:
          this.iconPath = null
      }
    }

    if (settings.type === 'function') {
      this.command = {
        command: 'fnHandlerList.openLogs',
        title: 'open file',
        arguments: [this]
      }

      if (settings.localSrc) {
        this.uri = settings.localSrc
        this.contextValue = 'function-localRef'
      }
    }
  }

  get description(): string {
    if (this.settings.description) {
      return this.settings.description
    }
  }
}

function getImgPath(name: string) {
  return {
    dark: path.join(__filename, '..', '..', `resources/dark/${name}.svg`),
    light: path.join(__filename, '..', '..', `resources/light/${name}.svg`)
  }
}
