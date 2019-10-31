import { SlsCommand } from './extension'
import * as vscode from 'vscode'
import * as path from 'path'

export function getPrintCommands(): SlsCommand[] {
  const commands =
    vscode.workspace
      .getConfiguration()
      .get('serverlessmonitor.serverlessYmlPaths') || ([] as any)

  return commands.map(conf => {
    return {
      ...conf,
      cwd: path.join(vscode.workspace.workspaceFolders[0].uri.path, conf.cwd)
    }
  })
}

export function getFontSize(): number {
  return vscode.workspace.getConfiguration(null, null).get('editor.fontSize')
}
