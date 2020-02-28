import { Service } from '../extension'
import { TreeItemCollapsibleState, EventEmitter } from 'vscode'
import { readdir } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function dynamoDbService(service: Service): Promise<Service> {
  const basePath = join(tmpdir(), `vscode-sls-console/${service.hash}/scan`)

  const folderList: string[] = await new Promise(resolve =>
    readdir(basePath, (err, files) => {
      if (err) {
        return resolve([])
      }
      resolve(files.filter(file => file.startsWith('update-')))
    })
  )

  if (service?.context?.onChangesUpdated) {
    service.context.onChangesUpdated.fire(folderList)
  }

  return {
    ...service,
    context: {
      changes: folderList,
      onChangesUpdated: service?.context?.onChangesUpdated || new EventEmitter()
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
        collapsibleState: TreeItemCollapsibleState.Collapsed,
        items: folderList.map(file => {
          return {
            title: file
          }
        })
      }
    ]
  }
}
