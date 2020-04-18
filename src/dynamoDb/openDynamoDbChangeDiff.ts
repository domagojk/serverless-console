import * as vscode from 'vscode'
import { TreeDataProvider } from '../treeDataProvider'
import { getRemoteItem } from './getRemoteItem'
import { Store, DynamoDbFileChange } from '../types'

export async function openDynamoDbChangeDiff(change: DynamoDbFileChange) {
  if (!change) {
    return null
  }
  const leftUri = vscode.Uri.parse(`dynamodb-item-diff:${change.relFilePath}`)
  let rightUri = vscode.Uri.file(change.absFilePath)

  if (change.action === 'delete') {
    rightUri = vscode.Uri.parse(`dynamodb-item-diff:emptyString`)
  }

  await vscode.commands.executeCommand(
    'vscode.diff',
    leftUri,
    rightUri,
    change.name
  )
}

export class DynamoDiffProvider implements vscode.TextDocumentContentProvider {
  constructor(
    private treeDataProvider: TreeDataProvider,
    private store: Store
  ) {}

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string | null> {
    if (uri.path === 'emptyString') {
      return ''
    }

    const [serviceHash, queryTypeIndex, hashKey, fileName] = uri.path.split('/')
    const service = this.treeDataProvider.getService(serviceHash)

    if (fileName.startsWith('create-')) {
      return ''
    }

    if (!service) {
      await vscode.window.showErrorMessage('DynamoDb service not found')
      return null
    }

    try {
      const serviceState = this.store.getState(serviceHash)
      const remoteItem = await getRemoteItem({
        serviceState,
        path: uri.path,
      })
      return remoteItem.stringified
    } catch (err) {
      vscode.window.showErrorMessage(
        `Error displaying item diff. ${err.message}`
      )
      return ''
    }
  }
}
