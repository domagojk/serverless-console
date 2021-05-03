import * as vscode from 'vscode'
import { statSync } from 'fs'
import { join, sep } from 'path'
import { tmpdir } from 'os'
import { getTableDetails } from './getTableDetails'
import { createHash } from 'crypto'
import { getLocalItem } from './getLocalItem'
import { readDirRecursive } from './readDirRecursive'
import { removeSync, pathExistsSync } from 'fs-extra'
import { Store, DynamoDbFileChange } from '../store'

interface DynamoServiceInput {
  hash: string
  type: 'dynamodb'
  tableName: string
  awsProfile: string
  region: string
  title?: string
  endpoint?: string
  defaultQuery?: {
    queryType: string
    selectedIndex: number
    selectedQueryFilters: any
  }
}

export interface DynamoServiceOutput extends DynamoServiceInput {
  icon?: string
  error?: string
  items?: {
    // Items (link for opening webview)
    // Changes (folder with changes)
    id?: string
    title?: string
    description?: string
    command?: {
      command: string
      title: string
      arguments?: any[]
    }
    icon?: string
    collapsibleState?: vscode.TreeItemCollapsibleState
    contextValue?: string
    items?: {
      // dynamodb changes
      id?: string
      title?: string
      icon?: string
      description?: string
      command?: {
        command: string
        title: string
        arguments?: any[]
      }
      contextValue?: string
    }[]
  }[]
}

export async function dynamoDbService(
  service: DynamoServiceInput,
  store: Store
): Promise<DynamoServiceOutput> {
  try {
    const tmpDir = join(tmpdir(), `vscode-sls-console`, sep, service.hash)
    const tmpChangesDir = join(tmpDir, 'changes')
    const tmpOriginalDir = join(tmpDir, 'original')

    const serviceState = store.getState(service.hash)
    const numOfPrevChanges = serviceState?.changes?.length

    const list = readDirRecursive(tmpChangesDir)

    const tableDetails = store.getState(service.hash)?.tableDetails
      ? store.getState(service.hash).tableDetails
      : await getTableDetails(service)

    const oldChanges = store.getState(service.hash)?.changes || []
    const folderListForAll: DynamoDbFileChange[] = list
      .filter((file) => file.endsWith('json'))
      .map((filePath) => {
        const [queryTypeIndex, hashKey, file] = filePath.split(sep)

        const action = file.startsWith('update-')
          ? 'update'
          : file.startsWith('delete-')
          ? 'delete'
          : file.startsWith('create-')
          ? 'create'
          : null

        if (!action) {
          return null
        }

        const dirChange = join(tmpChangesDir, queryTypeIndex, hashKey)
        const absFilePathChange = join(dirChange, file)
        let jsonChange = null

        let dirOriginal = null
        let absFilePathOriginal = null
        let jsonOriginal = null

        try {
          jsonChange = getLocalItem(absFilePathChange)
        } catch (err) {
          return null
        }

        if (action === 'update') {
          dirOriginal = join(tmpOriginalDir, queryTypeIndex, hashKey)
          absFilePathOriginal = join(dirOriginal, file)
          jsonOriginal = null

          try {
            jsonChange = getLocalItem(absFilePathChange)
          } catch (err) {
            return null
          }

          try {
            jsonOriginal = getLocalItem(absFilePathOriginal)
          } catch (err) {
            return null
          }

          if (JSON.stringify(jsonChange) === JSON.stringify(jsonOriginal)) {
            return null
          }
        }

        let compositKey =
          action === 'create'
            ? tableDetails.sortKey
              ? `${jsonChange[tableDetails.hashKey]}-${
                  jsonChange[tableDetails.sortKey]
                }`
              : jsonChange[tableDetails.hashKey]
            : file.split('.').slice(0, -1).join('.').slice(7) // removing .json and removing update-, create-, delete-

        if (
          !tableDetails.sortKey &&
          tableDetails.descOutput?.AttributeDefinitions.find(
            (a) =>
              a.AttributeName === tableDetails.hashKey &&
              a.AttributeType === 'N'
          )
        ) {
          compositKey = parseInt(compositKey)
        }

        const splitted = queryTypeIndex.split('-')
        const index = splitted.slice(1).join('-')

        const id = createHash('md5').update(absFilePathChange).digest('hex')

        const prevChange = oldChanges.find((c) => c.id === id)

        return {
          queryType: splitted[0],
          absFilePath: absFilePathChange,
          relFilePath: join(service.hash, 'changes', filePath),
          absFilePathOriginal,
          index,
          json: jsonChange,
          error: prevChange?.error,
          status: prevChange?.status,
          dir: dirChange,
          compositKey,
          name: file,
          timestamp: statSync(absFilePathChange).mtime.getTime(),
          id,
          action,
        }
      })
      .filter((val) => val !== null)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (folderListForAll.length === 0 && pathExistsSync(tmpOriginalDir)) {
      removeSync(tmpOriginalDir)
    }

    store.setState(service.hash, {
      tableName: service.tableName,
      awsProfile: service.awsProfile,
      endpoint: service.endpoint,
      region: service.region,
      defaultQuery: service.defaultQuery,
      changes: folderListForAll,
      tableDetails,
      tmpDir,
    })

    return {
      ...service,
      icon: 'dynamoDb',
      items: [
        {
          title: 'Items',
          icon: 'dynamoDb-items',
          contextValue: 'dynamodb-items',
          command: {
            command: 'serverlessConsole.openDynamoDb',
            title: 'Open DynamoDB Table',
            arguments: [
              {
                title: service.title,
                serviceHash: service.hash,
              },
            ],
          },
        },
        {
          id: `${service.hash}-dynamodb-changes`,
          title: folderListForAll.length
            ? `Changes (${folderListForAll.length})`
            : 'Changes',
          icon: 'circle-outline',
          collapsibleState:
            numOfPrevChanges === folderListForAll.length
              ? vscode.TreeItemCollapsibleState.Collapsed
              : vscode.TreeItemCollapsibleState.Expanded,
          contextValue: 'dynamodb-changes',
          items: folderListForAll.map((file, index) => {
            return {
              title: file.name,
              uri: vscode.Uri.file(file.absFilePath),
              icon: file.name.startsWith('update-')
                ? 'edit-item'
                : file.name.startsWith('delete-')
                ? 'delete-item'
                : file.name.startsWith('create-')
                ? 'create-item'
                : null,
              command: {
                command: 'serverlessConsole.openDynamoDbItemDiff',
                title: 'Open DynamoDB Item Diff',
                arguments: [
                  {
                    change: folderListForAll[index],
                  },
                ],
              },
              contextValue: 'dynamodb-change',
            }
          }),
        },
      ],
    }
  } catch (err) {
    console.log(err)
    return {
      ...service,
      icon: 'dynamodb',
      error: err.message,
    }
  }
}
