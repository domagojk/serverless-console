import { Service, DynamoDbFileChange } from '../types'
import { TreeItemCollapsibleState, EventEmitter } from 'vscode'
import { readdir, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { getTableDetails } from './getTableDescription'

export async function dynamoDbService(service: Service): Promise<Service> {
  const basePath = join(tmpdir(), `vscode-sls-console/${service.hash}`)
  const numOfPrevChanges = service?.context?.changes?.length

  const queries: string[] = await new Promise((resolve) => {
    readdir(basePath, (err, files) => {
      if (err) {
        return resolve([])
      }
      return resolve(files)
    })
  })

  const tableDetails = await getTableDetails(service)

  let folderListForAll: DynamoDbFileChange[] = []
  for (const query of queries) {
    const queryPath = `${basePath}/${query}`
    const folderListForQuery: DynamoDbFileChange[] = await new Promise(
      (resolve) =>
        readdir(queryPath, (err, files) => {
          if (err) {
            return resolve([])
          }
          resolve(
            files
              .filter(
                (file) => !file.startsWith('get-') && file.endsWith('.json')
              )
              .map((file) => {
                let compositKey = file.slice(7, file.length - 5)

                if (file.startsWith('create-')) {
                  try {
                    const createData = require(`${queryPath}/${file}`)
                    compositKey = tableDetails.sortKey
                      ? `${createData[tableDetails.hashKey]}-${
                          createData[tableDetails.sortKey]
                        }`
                      : createData[tableDetails.hashKey]
                  } catch (err) {
                    console.log(err)
                  }
                }

                return {
                  dir: queryPath,
                  compositKey,
                  name: file,
                  modified: statSync(`${queryPath}/${file}`).mtime.getTime(),
                }
              })
          )
        })
    ).then((items: any) => items.sort((a, b) => a.modified - b.modified))

    folderListForAll = [...folderListForAll, ...folderListForQuery]
  }

  if (service?.context?.onChangesUpdated) {
    service.context.onChangesUpdated.fire(folderListForAll)
  }

  return {
    ...service,
    context: {
      changes: folderListForAll,
      onChangesUpdated: service.context?.onChangesUpdated || new EventEmitter(),
      _tableDetailsCached: tableDetails,
    },
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
        title: 'Saved Queries',
        icon: 'star-full',
        collapsibleState: TreeItemCollapsibleState.Collapsed,
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
          }
        }),
      },
    ],
  }
}
