import { Service, DynamoDbFileChange, Store } from '../types'
import { TreeItemCollapsibleState } from 'vscode'
import { statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getTableDetails } from './getTableDetails'
import { createHash } from 'crypto'
import { getLocalItem } from './getLocalItem'
import { readDirRecursive } from './readDirRecursive'
import { removeSync, pathExistsSync } from 'fs-extra'

export async function dynamoDbService(
  service: Service,
  store: Store
): Promise<Service> {
  try {
    const tmpDir = join(tmpdir(), `vscode-sls-console/`, service.hash)
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
        const [queryTypeIndex, hashKey, file] = filePath.split('/')
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

        const compositKey =
          action === 'create'
            ? tableDetails.sortKey
              ? `${jsonChange[tableDetails.hashKey]}-${
                  jsonChange[tableDetails.sortKey]
                }`
              : jsonChange[tableDetails.hashKey]
            : file.split('.').slice(0, -1).join('.').slice(7) // removing .json and removing update-, create-, delete-

        const splitted = queryTypeIndex.split('-')
        const index = splitted.slice(1).join('-')

        const id = createHash('md5').update(absFilePathChange).digest('hex')

        const prevChange = oldChanges.find((c) => c.id === id)

        return {
          queryType: splitted[0],
          absFilePath: absFilePathChange,
          relFilePath: `${service.hash}/changes/${filePath}`,
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
      region: service.region,
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
          command: {
            command: 'serverlessConsole.openDynamoDb',
            title: 'Open DynamoDB Table',
          },
        },
        {
          title: folderListForAll.length
            ? `Changes (${folderListForAll.length})`
            : 'Changes',
          icon: 'circle-outline',
          collapsibleState:
            numOfPrevChanges === folderListForAll.length
              ? TreeItemCollapsibleState.Collapsed
              : TreeItemCollapsibleState.Expanded,
          contextValue: 'dynamodb-changes',
          items: folderListForAll.map((file) => {
            return {
              title: file.name,
              icon: file.name.startsWith('update-')
                ? 'edit-item'
                : file.name.startsWith('delete-')
                ? 'delete-item'
                : file.name.startsWith('create-')
                ? 'create-item'
                : null,
              dir: file.dir,
              command: {
                command: 'serverlessConsole.openDynamoDbItemDiff',
                title: 'Open DynamoDB Item Diff',
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
