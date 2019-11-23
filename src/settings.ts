import * as vscode from 'vscode'
import * as path from 'path'
import { Service } from './extension'

export function getServices(): Service[] {
  const services =
    vscode.workspace.getConfiguration().get('serverlessConsole.services') ||
    ([] as any)

  return services.map(conf => {
    if (conf.type === 'serverlessFramework') {
      return {
        ...conf,
        cwd: path.join(vscode.workspace.workspaceFolders[0].uri.path, conf.cwd)
      }
    } else {
      return conf
    }
  })
}

export function getGroupPerRequest(): Boolean {
  return vscode.workspace.getConfiguration().get('serverlessConsole.groupPerRequest')
}

export function getFontSize(): number {
  return vscode.workspace.getConfiguration(null, null).get('editor.fontSize')
}
