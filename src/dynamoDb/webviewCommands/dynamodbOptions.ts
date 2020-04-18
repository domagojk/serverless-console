import * as vscode from 'vscode'
import { TreeItem } from '../../TreeItem'

export async function dynamoDbOptions(message: any, treeItem: TreeItem) {
  const result: any[] = await vscode.window.showQuickPick(
    message.payload.columns,
    {
      canPickMany: true,
    }
  )
  if (!result) {
    return null
  }
  const shownColumns = result.map((c) => c.label)
  const hiddenColumns = message.payload.columns
    .filter((c) => !shownColumns.includes(c.label))
    .map((c) => c.label)

  treeItem.panel?.webview?.postMessage({
    messageId: message.messageId,
    payload: {
      hiddenColumns,
    },
  })
}
