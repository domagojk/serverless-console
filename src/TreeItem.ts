import * as vscode from 'vscode'
import * as path from 'path'
import { readdirSync } from 'fs'
import { ServerlessYML, SlsConfig } from './extension'

export class TreeItem extends vscode.TreeItem {
  uri: vscode.Uri
  public panel: vscode.WebviewPanel

  constructor(
    public readonly settings: {
      type: string
      icon?: 'log'
      label: string
      stage?: string
      description?: string
      function?: string
      filePath?: any
      slsConfig?: SlsConfig
      serverlessJSON?: ServerlessYML
      serverlessPath?: string
    },
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(settings.filePath || settings.label, collapsibleState)
    this.contextValue = settings.type

    if (this.settings.icon === 'log') {
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

      const handlerAbsDir = path.join(
        this.settings.serverlessPath,
        handlerRelativeDir
      )

      const filesInDir = readdirSync(handlerAbsDir)
      const foundFile = filesInDir.find(fileName => {
        const nameArr = fileName.split('.')
        const handlerFileName = handlerArr[handlerArr.length - 1].split('.')[0]
        return nameArr.length === 2 && nameArr[0] === handlerFileName
      })

      if (foundFile) {
        const filePath = path.join(handlerAbsDir, foundFile)
        this.resourceUri = vscode.Uri.file(filePath)

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
