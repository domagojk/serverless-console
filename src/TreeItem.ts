import * as vscode from 'vscode'
import * as path from 'path'

export type ServerlessYML = {
  org: string
  service: {
    name: string
  }
  provider: {
    name: string
    runtime: string
  }
  functions: Record<string, any>
}

export class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly settings: {
      type: 'service' | 'stage' | 'function' | 'log'
      label: string
      stage?: string
      description?: string
      function?: string
      serverlessJSON: ServerlessYML
    },
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(settings.label, collapsibleState)
    this.contextValue = settings.type

    if (settings.type === 'service') {
      this.iconPath = {
        light: path.join(__filename, '..', '..', 'media', 'dep.svg'),
        dark: path.join(__filename, '..', '..', 'media', 'dep.svg')
      }
    }
  }

  get tooltip(): string {
    return `${this.label}-${this.settings.stage}`
  }

  get description(): string {
    if (this.settings.description) {
      return this.settings.description
    }
    if (this.settings.type === 'service') {
      return this.settings.stage && `stage: ${this.settings.stage}`
    }
  }
}
