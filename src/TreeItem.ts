import * as vscode from 'vscode'
import { Service, ServiceItem } from './extension'
import * as path from 'path'

export class TreeItem extends vscode.TreeItem {
  uri: vscode.Uri
  public panel: vscode.WebviewPanel
  public iconPathObj: {
    dark: string
    light: string
  }

  constructor(
    public readonly settings: {
      extensionPath: string
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
          this.iconPathObj = getImgPath(settings.extensionPath, 'error')
          break
        case 'loading':
          this.iconPathObj = getImgPath(settings.extensionPath, 'loading')
          break
        default:
          this.iconPathObj = null
      }
    }

    if (settings.type === 'function') {
      this.command = {
        command: 'serverlessConsole.openLogs',
        title: 'open file',
        arguments: [this]
      }

      if (settings.localSrc) {
        this.uri = settings.localSrc
        this.contextValue = 'function-localRef'
      }

      if (settings.serviceItem.tabs.find(t => t.lambda)) {
        this.iconPathObj = getImgPath(settings.extensionPath, 'lambda')
      } else if (settings.serviceItem.tabs.find(t => t.logs)) {
        this.iconPathObj = getImgPath(settings.extensionPath, 'cloudwatch')
      }
    }

    this.iconPath = this.iconPathObj
  }

  get description(): string {
    if (this.settings.description) {
      return this.settings.description
    }
  }
}

function getImgPath(extesionPath: string, name: string) {
  return {
    dark: path.join(extesionPath, `resources/dark/${name}.svg`),
    light: path.join(extesionPath, `resources/light/${name}.svg`)
  }
}
