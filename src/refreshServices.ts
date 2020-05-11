import { serverlessFrameworkService } from './logs/serverlessFrameworkService'
import { cloudformationService } from './logs/cloudformationService'
import { customService } from './logs/customService'
import { dynamoDbService } from './dynamoDb/dynamodbService'
import { getServices } from './settings'
import * as vscode from 'vscode'
import { Store, SlsConsoleFile } from './store'
import { Service } from './extension'

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
    return renderItem(store, {
      id: `${slsConsoleFile.id}/${child.id || child.title}`,
      description: child.description,
      command: child.command,
      collapsibleState:
        child.collapsibleState !== undefined
          ? child.collapsibleState
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
      title: 'loading...',
    })
    handler(slsConsoleFile.serviceData, store).then((res) => {
      store.saveSlsConsoleFile({
        ...slsConsoleFile,
        icon: res.icon,
        title: res.title,
        serviceHash: res.hash,
      })

      // each item is rendered (recursive function)
      res.items.forEach((child) => serviceItemHandler(child, res.hash))
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
    })
  }
}

export function refreshService(store: Store, hash: string) {
  const services = getServices()
  const service = services.find((s) => s.hash === hash)

  if (service) {
    const currentFile = store
      .getSlsConsoleFiles()
      .find((f) => f.id === service.hash)

    renderItem(store, {
      id: service.hash,
      serviceHash: service.hash,
      collapsibleState:
        currentFile?.collapsibleState ||
        vscode.TreeItemCollapsibleState.Expanded,
      title: service.title,
      parent: null,
      icon: service.icon,
      serviceType: service.type,
      serviceData: service,
    })
  }
}
