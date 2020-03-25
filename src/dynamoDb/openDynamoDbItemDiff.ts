import * as vscode from 'vscode'
import { uniq } from 'lodash'
import { TreeItem } from '../TreeItem'
import { TreeDataProvider } from '../treeDataProvider'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFileSync } from 'fs-extra'
import { getFormattedJSON } from './getFormattedJSON'
import { getTableDetails } from './getTableDescription'
import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../getAwsCredentials'
import { getFilterExpression } from './getFilterExpression'

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
      (s) => s.hash === serviceHash
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
          encoding: 'utf-8',
        })
      )
    } catch (err) {
      return 'Unable to parse JSON file'
    }

    const tableDetails = await getTableDetails(service)
    const indexDetails = tableDetails.indexes.find(({ id }) => id === index)

    if (!indexDetails) {
      return 'Unable to getItem'
    }

    try {
      const credentials = await getAwsCredentials(service.awsProfile)
      const dynamoDb = new DynamoDB({
        credentials,
        region: service.region,
      })

      const hashKey = json[indexDetails.keys[0]]
      const rangeKey = json[indexDetails.keys[1]]

      const item = await dynamoDb
        .query({
          TableName: service.tableName,
          IndexName: index === 'default' ? null : index,
          ...getFilterExpression(
            [
              {
                comparison: '=',
                dataType: tableDetails.descOutput.AttributeDefinitions.find(
                  (attr) => attr.AttributeName === indexDetails.keys[0]
                )?.AttributeType,
                fieldName: indexDetails.keys[0],
                value: hashKey,
                keyCondition: true,
              },
              {
                comparison: '=',
                dataType: tableDetails.descOutput.AttributeDefinitions.find(
                  (attr) => attr.AttributeName === indexDetails.keys[1]
                )?.AttributeType,
                fieldName: indexDetails.keys[1],
                value: rangeKey,
                keyCondition: true,
              },
            ],
            'query'
          ),
        })
        .promise()
        .then((res) => {
          if (res.Count !== 1) {
            throw Error(`found ${res.Count} items, expected 1`)
          }
          return DynamoDB.Converter.unmarshall(res.Items[0])
        })

      const columns = uniq([...Object.keys(json), ...Object.keys(item)])

      return getFormattedJSON(item, columns).stringified
    } catch (err) {
      console.log(err)
      return err.message
    }
  }
}
