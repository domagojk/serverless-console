import * as vscode from 'vscode'
import { Service, ServiceItem } from './types'
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
      isService: boolean
      label: string
      icon?: string
      serviceHash?: string
      serviceItem?: ServiceItem
      description?: string
      command?: {
        command: string
        title: string
      }
      localSrc?: vscode.Uri
      dir?: string // dynamodb change file directory path
    },
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(settings.label, collapsibleState)
    this.contextValue = settings.isService ? 'service' : null

    if (settings.icon) {
      this.iconPathObj = getImgPath(settings.extensionPath, settings.icon)
    }

    if (settings.command) {
      this.command = {
        ...settings.command,
        arguments: [this]
      }
    }

    if (settings.localSrc) {
      this.uri = settings.localSrc
      this.contextValue = 'function-localRef'
    }

    this.iconPath = this.iconPathObj
  }

  get description(): string {
    if (this.settings?.description) {
      return this.settings.description
    }
  }
}

function getImgPath(extesionPath: string, name: string) {
  const extension = name.includes('.') ? '' : '.svg'

  return {
    dark: path.join(extesionPath, `resources/dark/${name}${extension}`),
    light: path.join(extesionPath, `resources/light/${name}${extension}`)
  }
}
