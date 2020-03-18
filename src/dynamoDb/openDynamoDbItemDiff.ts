import * as vscode from 'vscode'
import { uniq } from 'lodash'
import { TreeItem } from '../TreeItem'
import { TreeDataProvider } from '../treeDataProvider'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFileSync } from 'fs-extra'
import { getItem } from './getItem'
import { getFormattedJSON } from './getFormattedJSON'

export const openDynamoDbItemDiff = (
  context: vscode.ExtensionContext
) => async (treeItem: TreeItem) => {
  const filePath = join(treeItem.settings.dir, treeItem.label)
  const parentDir = treeItem.settings.dir.split('/').pop()

  const leftUri = vscode.Uri.parse(
    `dynamodb-item-diff:${treeItem.settings.service.hash}/${parentDir}/${treeItem.label}`
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
    const querySplitted = query.split('-')
    querySplitted.shift() // first item removed
    const index = querySplitted.join('-') // rest is joined

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

    const indexDetails = service.context.indexes.find(({ id }) => id === index)

    if (!indexDetails) {
      return 'Unable to getItem'
    }

    try {
      const item = await getItem({
        index,
        service,
        hashKey: json[indexDetails.keys[0]],
        rangeKey: json[indexDetails.keys[1]]
      })

      const columns = uniq([...Object.keys(json), ...Object.keys(item)])

      return getFormattedJSON(item, columns).stringified
    } catch (err) {
      console.log(err)
      return err.message
    }
  }
}
