import * as vscode from 'vscode'
import { TreeItem } from '../TreeItem'

export async function openFunction(treeItem: TreeItem) {
  if (treeItem.uri) {
    let doc = await vscode.workspace.openTextDocument(treeItem.uri)
    await vscode.window.showTextDocument(doc, { preview: false })
  }
}
