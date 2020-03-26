import * as vscode from 'vscode'
import { join } from 'path'
import { TreeItem } from '../TreeItem'
import { TreeDataProvider } from '../treeDataProvider'
import { getRemoteItem } from './getRemoteItem'

export const openDynamoDbItemDiff = (
  context: vscode.ExtensionContext,
  treeDataProvider: TreeDataProvider
) => async (treeItem: TreeItem) => {
  const filePath = join(treeItem.settings.dir, treeItem.label)
  const parentDir = treeItem.settings.dir.split('/').pop()

  const service = treeDataProvider.getService(treeItem.settings.serviceHash)

  const leftUri = vscode.Uri.parse(
    `dynamodb-item-diff:${service.hash}/${parentDir}/${treeItem.label}`
  )
  let rightUri = vscode.Uri.file(filePath)

  if (treeItem.label.startsWith('delete-')) {
    rightUri = vscode.Uri.parse(`dynamodb-item-diff:emptyString`)
  }

  await vscode.commands.executeCommand(
    'vscode.diff',
    leftUri,
    rightUri,
    treeItem.label
  )
}

export class DynamoDiffProvider implements vscode.TextDocumentContentProvider {
  constructor(private treeDataProvider: TreeDataProvider) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string | null> {
    if (uri.path === 'emptyString') {
      return ''
    }

    const [serviceHash, fileName] = uri.path.split('/')
    const service = this.treeDataProvider.getService(serviceHash)

    if (fileName.startsWith('create-')) {
      return ''
    }

    if (!service) {
      await vscode.window.showErrorMessage('DynamoDb service not found')
      return null
    }

    try {
      const remoteItem = await getRemoteItem({
        service,
        path: uri.path,
      })
      return remoteItem.stringified
    } catch (err) {
      console.log(err)
      return err.message
    }
  }
}
