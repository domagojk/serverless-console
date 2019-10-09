import * as vscode from 'vscode'
import * as path from 'path'
import { readdirSync } from 'fs'

export type ServerlessYML = {
  org: string
  service: {
    name: string
  }
  provider: {
    name: string
    runtime: string
  }
  functions: Record<
    string,
    {
      handler: string
      events: {
        http: {
          method: string
          path: string
        }
      }[]
    }
  >
}

export class TreeItem extends vscode.TreeItem {
  uri: vscode.Uri

  constructor(
    public readonly settings: {
      type: 'service' | 'stage' | 'function' | 'log'
      label: string
      stage?: string
      description?: string
      function?: string
      filePath?: any
      serverlessJSON: ServerlessYML
      serverlessPath?: string
    },
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(settings.filePath || settings.label, collapsibleState)
    this.contextValue = settings.type

    if (settings.type === 'service') {
      this.iconPath = {
        light: path.join(__filename, '..', '..', 'media', 'dep.svg'),
        dark: path.join(__filename, '..', '..', 'media', 'dep.svg')
      }
    }
    if (settings.type === 'function') {
      const serverlessFn = this.settings.serverlessJSON.functions[
        this.settings.function
      ]
      const handlerArr = serverlessFn.handler.split('/')
      const handlerRelativeDir = handlerArr
        .slice(0, handlerArr.length - 1)
        .join('/')

      const handlerAbsDir = `${this.settings.serverlessPath}/${handlerRelativeDir}`
      const filesInDir = readdirSync(handlerAbsDir)
      const foundFile = filesInDir.find(fileName => {
        const nameArr = fileName.split('.')
        const handlerFileName = handlerArr[handlerArr.length - 1].split('.')[0]
        return nameArr.length === 2 && nameArr[0] === handlerFileName
      })
      this.resourceUri = vscode.Uri.file(`${handlerAbsDir}/${foundFile}`)

      if (foundFile) {
        this.command = {
          command: 'serverlessMonitor.openFunction',
          title: 'open file',
          arguments: [this.resourceUri]
        }
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
    if (this.settings.type === 'function' && this.settings.function) {
      const handler = this.settings.serverlessJSON.functions[
        this.settings.function
      ]
      const httpEvent = handler.events.find(event => event.http)

      if (httpEvent) {
        return `${httpEvent.http.method.toUpperCase()} /${httpEvent.http.path}`
      }
    }
  }
}
