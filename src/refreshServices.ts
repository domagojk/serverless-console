import { serverlessFrameworkService } from './logs/serverlessFrameworkService'
import { cloudformationService } from './logs/cloudformationService'
import { customService } from './logs/customService'
import { dynamoDbService } from './dynamoDb/dynamodbService'
import { getServices } from './settings'
import * as vscode from 'vscode'
import { Store, SlsConsoleFile } from './store'
import { Service } from './extension'
import { createHash } from 'crypto'

const handlers = {
  serverlessFramework: serverlessFrameworkService,
  cloudformation: cloudformationService,
  custom: customService,
  dynamodb: dynamoDbService,
}

function renderItem(store: Store, slsConsoleFile: SlsConsoleFile) {
  const handler = handlers[slsConsoleFile.serviceType] as (
    service: Service,
    store?: Store
  ) => Promise<Service>

  const serviceItemHandler = (child, serviceHash) => {
    const id = createHash('md5')
      .update(`${slsConsoleFile.id}/${child.id || child.title}`)
      .digest('hex')

    return renderItem(store, {
      id,
      description: child.description,
      command: child.command,
      collapsibleState:
        child.collapsibleState !== undefined
          ? child.collapsibleState
          : child.type
          ? vscode.TreeItemCollapsibleState.Collapsed
          : child.items?.length
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.None,
      title: child.title,
      parent: slsConsoleFile.id,
      icon: child.icon,
      items: child.items,
      uri: child.uri,
      contextValue: child.contextValue,
      serviceHash,
      serviceType: child.type,
      serviceData: child.type
        ? {
            hash: id,
            ...child,
          }
        : null,
    })
  }

  // delete all children
  store
    .getSlsConsoleFiles()
    .filter((f) => f.parent === slsConsoleFile.id)
    .forEach((f) => {
      store.deleteSlsConsoleFile(f.id)
    })

  if (handler) {
    // is a service
    store.saveSlsConsoleFile({
      ...slsConsoleFile,
      icon: 'loading',
      title: slsConsoleFile.serviceData?.command
        ? `executing "${slsConsoleFile.serviceData?.command}"...`
        : slsConsoleFile.title
        ? slsConsoleFile.title
        : 'loading...',
    })
    handler(slsConsoleFile.serviceData, store).then((res) => {
      store.saveSlsConsoleFile({
        ...slsConsoleFile,
        icon: res.icon,
        title:
          res.error && slsConsoleFile.serviceData.command
            ? `error running "${slsConsoleFile.serviceData.command}"`
            : res.title !== undefined
            ? res.title
            : slsConsoleFile.title,
        serviceHash: res.hash,
        error: res.error,
      })

      // each item is rendered (recursive function)
      res.items?.forEach((child) => serviceItemHandler(child, res.hash))
    })
  } else {
    // is a serviceItem
    store.saveSlsConsoleFile(slsConsoleFile)

    if (slsConsoleFile.items) {
      // each item is rendered (recursive function)
      slsConsoleFile.items.forEach((child) =>
        serviceItemHandler(child, slsConsoleFile.serviceHash)
      )
    }
  }
}

export function refreshServices(store: Store) {
  const services = getServices()

  // delete all children
  store
    .getSlsConsoleFiles()
    .filter((f) => f.parent === null)
    .forEach((f) => {
      store.deleteSlsConsoleFile(f.id)
    })

  for (const service of services) {
    renderItem(store, {
      id: service.hash,
      serviceHash: service.hash,
      collapsibleState:
        services.length === 1
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      title: service.title,
      parent: null,
      icon: service.icon,
      serviceType: service.type,
      serviceData: service,
      contextValue: 'service'
    })
  }
}

export function refreshService(store: Store, hash: string) {
  const currentFile = store.getSlsConsoleFiles().find((f) => f.id === hash)
  renderItem(store, currentFile)
}
