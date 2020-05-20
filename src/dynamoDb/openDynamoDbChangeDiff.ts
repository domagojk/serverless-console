import * as vscode from 'vscode'
import { join, sep } from 'path'
import { tmpdir } from 'os'
import { readFileSync } from 'fs-extra'
import { DynamoDbFileChange } from '../store'

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
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string | null> {
    if (uri.path === 'emptyString') {
      return ''
    }

    const [
      serviceHash,
      changeOrOriginal,
      queryTypeIndex,
      hashKey,
      fileName,
    ] = uri.path.split(sep)

    if (fileName.startsWith('create-')) {
      return ''
    }

    try {
      const tmpDir = join(tmpdir(), `vscode-sls-console`, sep, serviceHash)
      const changesDir = fileName.startsWith('update-') ? 'original' : 'changes'

      return readFileSync(
        join(tmpDir, changesDir, queryTypeIndex, hashKey, fileName),
        {
          encoding: 'utf-8',
        }
      )
    } catch (err) {
      vscode.window.showErrorMessage(
        `Error displaying item diff. ${err.message}`
      )
      return ''
    }
  }
}
