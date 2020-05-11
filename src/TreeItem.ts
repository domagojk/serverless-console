import * as vscode from 'vscode'
import * as path from 'path'

export class TreeItem extends vscode.TreeItem {
  uri: vscode.Uri
  public panel: vscode.WebviewPanel
  public iconPathObj: {
    dark: string
    light: string
  }
  public serviceHash: string

  constructor(
    public readonly settings: {
      context: vscode.ExtensionContext
      id: string
      label: string
      contextValue?: string
      description?: string
      icon?: string
      command?: {
        command: string
        title: string
        arguments?: any[]
      }
      localSrc?: vscode.Uri
      serviceHash?: string
    },
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(settings.label, collapsibleState)

    this.id = settings.id

    if (settings.command) {
      this.command = {
        ...settings.command,
        arguments: [this, ...(settings.command.arguments || [])],
      }
    }

    if (settings.localSrc) {
      this.uri = settings.localSrc
      this.contextValue = 'local-file'
    }

    if (settings.contextValue) {
      this.contextValue = settings.contextValue
    }

    if (settings.icon) {
      this.iconPathObj = getImgPath(
        settings.context.extensionPath,
        settings.icon
      )
    }

    this.serviceHash = settings.serviceHash
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
    light: path.join(extesionPath, `resources/light/${name}${extension}`),
  }
}
