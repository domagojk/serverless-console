import { Service, DynamoDbFileChange, Store } from '../types'
import { TreeItemCollapsibleState } from 'vscode'
import { statSync } from 'fs'
import { join, relative } from 'path'
import { tmpdir } from 'os'
import { getTableDetails } from './getTableDetails'
import { createHash } from 'crypto'
import { getLocalItem } from './getLocalItem'
import { readDirRecursive } from './readDirRecursive'

export async function dynamoDbService(
  service: Service,
  store: Store
): Promise<Service> {
  try {
    const tmpDir = join(tmpdir(), `vscode-sls-console/`, service.hash)
    const serviceState = store.getState(service.hash)
    const numOfPrevChanges = serviceState?.changes?.length

    const list = readDirRecursive(tmpDir)

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

        const dir = join(tmpDir, queryTypeIndex, hashKey)

        const withoutSufix = file.split('.').slice(0, -2).join('.') // removing .xxxx.json
        let compositKey = withoutSufix.slice(7) // removing update-, create-, delete-

        let error = null
        let json = null

        try {
          json = getLocalItem(join(dir, file))
          if (action === 'create') {
            compositKey = tableDetails.sortKey
              ? `${json[tableDetails.hashKey]}-${json[tableDetails.sortKey]}`
              : json[tableDetails.hashKey]
          }
        } catch (err) {
          error = err.message
        }

        const splitted = queryTypeIndex.split('-')
        const index = splitted.slice(1).join('-')

        const id = createHash('md5')
          .update(join(dir, withoutSufix))
          .digest('hex')
        const prevChange = oldChanges.find((c) => c.id === id)

        return {
          queryType: splitted[0],
          absFilePath: `${dir}/${file}`,
          relFilePath: `${service.hash}/${filePath}`,
          index,
          json,
          error: prevChange?.error,
          status: prevChange?.status,
          dir,
          compositKey,
          name: file,
          timestamp: statSync(`${dir}/${file}`).mtime.getTime(),
          id,
          action,
        }
      })
      .filter((val) => val !== null)
      .sort((a, b) => a.timestamp - b.timestamp)

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
      icon: 'dynamodb',
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
