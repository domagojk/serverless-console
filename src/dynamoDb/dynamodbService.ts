import * as vscode from 'vscode'
import { Service, DynamoDbFileChange } from '../extension'
import { TreeItemCollapsibleState, EventEmitter } from 'vscode'
import { readdir, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getAwsCredentials } from '../getAwsCredentials'
import { DynamoDB } from 'aws-sdk'

export async function dynamoDbService(service: Service): Promise<Service> {
  const basePath = join(tmpdir(), `vscode-sls-console/${service.hash}/scan`)
  const numOfPrevChanges = service?.context?.changes?.length

  if (!service.context?.tableDescribeOutput) {
    await updateTableDescription(service)
  }

  const folderList: DynamoDbFileChange[] = await new Promise(resolve =>
    readdir(basePath, (err, files) => {
      if (err) {
        return resolve([])
      }
      resolve(
        files
          .filter(file => !file.startsWith('get-') && file.endsWith('.json'))
          .map(file => {
            let compositKey = file.slice(7, file.length - 5)

            if (file.startsWith('create-')) {
              try {
                const createData = require(`${basePath}/${file}`)
                compositKey = service.context.sortKey
                  ? `${createData[service.context.hashKey]}-${
                      createData[service.context.sortKey]
                    }`
                  : createData[service.context.hashKey]
              } catch (err) {
                console.log(err)
              }
            }

            return {
              compositKey,
              name: file,
              modified: statSync(`${basePath}/${file}`).mtime.getTime()
            }
          })
      )
    })
  ).then((items: any) => items.sort((a, b) => a.modified - b.modified))

  if (service?.context?.onChangesUpdated) {
    service.context.onChangesUpdated.fire(folderList)
  }

  return {
    ...service,
    context: {
      changes: folderList,
      onChangesUpdated: service.context?.onChangesUpdated || new EventEmitter(),
      hashKey: service.context?.hashKey,
      sortKey: service.context?.sortKey
    },
    icon: 'dynamodb',
    items: [
      {
        title: 'Items',
        icon: 'dynamoDb-items',
        command: {
          command: 'serverlessConsole.openDynamoDb',
          title: 'Open DynamoDB Table'
        }
      },
      {
        title: 'Saved Queries',
        icon: 'star-full',
        collapsibleState: TreeItemCollapsibleState.Collapsed
      },
      {
        title: folderList.length ? `Changes (${folderList.length})` : 'Changes',
        icon: 'circle-outline',
        collapsibleState:
          numOfPrevChanges === folderList.length
            ? TreeItemCollapsibleState.Collapsed
            : TreeItemCollapsibleState.Expanded,
        items: folderList.map(file => {
          return {
            title: file.name,
            icon: file.name.startsWith('update-')
              ? 'edit-item'
              : file.name.startsWith('delete-')
              ? 'delete-item'
              : file.name.startsWith('create-')
              ? 'create-item'
              : null,
            command: {
              command: 'serverlessConsole.openDynamoDbItemDiff',
              title: 'Open DynamoDB Item Diff'
            }
          }
        })
      }
    ]
  }
}

export async function updateTableDescription(service: Service) {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: service.region
  })

  const res = await dynamoDb
    .describeTable({
      TableName: service.tableName
    })
    .promise()

  const hashKey = res.Table.KeySchema.find(key => key.KeyType === 'HASH')
  const range = res.Table.KeySchema.find(key => key.KeyType === 'RANGE')

  service.context = {
    tableDescribeOutput: res.Table,
    changes: service.context?.changes,
    onChangesUpdated: service?.context?.onChangesUpdated || new EventEmitter(),
    hashKey: hashKey && hashKey.AttributeName ? hashKey.AttributeName : null,
    sortKey: range ? range.AttributeName && range.AttributeName : null
  }
}

export async function getItem(
  service: Service,
  hashKey: string,
  sortKey?: string
) {
  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB.DocumentClient({
    credentials,
    region: service.region
  })

  return dynamoDb
    .get({
      TableName: service.tableName,
      Key: service.context.sortKey
        ? {
            [service.context.hashKey]: hashKey,
            [service.context.sortKey]: sortKey
          }
        : {
            [service.context.hashKey]: hashKey
          }
    })
    .promise()
    .then(res => res.Item)
}

export function getFormattedJSON(data: any, columns?: string[]) {
  let json = {}

  if (columns) {
    columns.forEach(column => {
      if (data[column] !== undefined) {
        json[column] = data[column]
      }
    })
  } else {
    json = data
  }

  const useSpaces: boolean = vscode.workspace
    .getConfiguration(null, null)
    .get('editor.insertSpaces')

  const tabSize: number = vscode.workspace
    .getConfiguration(null, null)
    .get('editor.tabSize')

  const space = useSpaces ? Array.from(Array(tabSize + 1)).join(' ') : '\t'

  const stringified = `${JSON.stringify(json, null, space)}`

  return { json, stringified, space }
}
