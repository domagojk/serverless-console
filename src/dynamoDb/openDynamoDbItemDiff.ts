import * as vscode from 'vscode'
import { uniq } from 'lodash'
import { TreeItem } from '../TreeItem'
import { TreeDataProvider } from '../treeDataProvider'
import { join } from 'path'
import { tmpdir } from 'os'
import { getItem, getFormattedJSON } from './dynamodbService'
import { readFileSync } from 'fs-extra'

export const openDynamoDbItemDiff = (
  context: vscode.ExtensionContext
) => async (treeItem: TreeItem) => {
  const filePath = join(
    tmpdir(),
    `vscode-sls-console/${treeItem.settings.service.hash}/scan`,
    treeItem.label
  )

  const leftUri = vscode.Uri.parse(
    `dynamodb-item-diff:${treeItem.settings.service.hash}/scan/${treeItem.label}`
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

    const [serviceHash, query, fileName] = uri.path.split('/')

    const service = this.treeDataProvider.services.find(
      s => s.hash === serviceHash
    )

    if (!service) {
      await vscode.window.showErrorMessage('DynamoDb service not found')
      return null
    }

    if (fileName.startsWith('create-')) {
      return ''
    }

    const filePath = join(
      tmpdir(),
      `vscode-sls-console/${service.hash}/${query}`,
      fileName
    )

    let json
    try {
      json = JSON.parse(
        readFileSync(filePath, {
          encoding: 'utf-8'
        })
      )
    } catch (err) {
      return 'Unable to parse JSON file'
    }

    try {
      const item = await getItem(
        service,
        json[service.context.hashKey],
        json[service.context.sortKey]
      )

      const columns = uniq([...Object.keys(json), ...Object.keys(item)])

      return getFormattedJSON(item, columns).stringified
    } catch (err) {
      console.log(err)
      return err.message
    }
  }
}
