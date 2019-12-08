import * as vscode from 'vscode'
import { getServiceHash } from '../settings'
import { TreeItem } from '../TreeItem'

export function removeService(treeItem: TreeItem) {
  const currentServices: any[] =
    vscode.workspace.getConfiguration().get('serverlessConsole.services') || []

  vscode.workspace.getConfiguration().update(
    'serverlessConsole.services',
    currentServices.filter(s => {
      return getServiceHash(s) !== treeItem.settings?.service?.hash
    })
  )
}
