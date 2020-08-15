import * as vscode from 'vscode'
import { DynamoDB } from 'aws-sdk'
import { Service } from './extension'

export type DynamoDbTableDesc = {
  hashKey?: string
  sortKey?: string
  indexes?: {
    id: string
    keys: string[]
  }[]
  descOutput: DynamoDB.TableDescription
}

export type DynamoDbFileChange = {
  name: string
  compositKey: string
  timestamp: number
  dir: string
  id: string
  absFilePath: string
  relFilePath: string
  absFilePathOriginal?: string
  action: string
  status?: 'inProgress' | 'error'
  command?: any
  error?: string
  index: string
  queryType: string
  json: any
}

export type ServiceState = {
  changes?: DynamoDbFileChange[]
  successfulChanges?: {
    timeAdded: number
    change: DynamoDbFileChange
  }[]
  onChangesUpdated?: vscode.EventEmitter<DynamoDbFileChange[]>
  tableDetails?: DynamoDbTableDesc
  tmpDir?: string
  region?: string
  tableName?: string
  awsProfile?: string
  endpoint?: string
  openedFromWebview?: string[]
}

export type SlsConsoleFile = {
  parent: string

  id: string
  title: string
  description?: string
  collapsibleState: vscode.TreeItemCollapsibleState
  command?: {
    command: string
    title: string
    arguments?: any[]
  }
  uri?: vscode.Uri
  icon?: string
  contextValue?: string
  error?: string

  // service data
  serviceHash?: string
  serviceType?: Service['type']
  serviceData?: any
  items?: SlsConsoleFile[]
}

export class Store {
  private subscribers = [] as {
    cb: Function
    serviceHash: string
  }[]
  private slsConsoleFilesSubscribers = [] as {
    cb: Function
  }[]
  private state = {} as Record<string, ServiceState>
  private slsConsoleFiles = [] as SlsConsoleFile[]

  getState(serviceHash: string) {
    return this.state[serviceHash]
  }

  setState(
    serviceHash: string,
    serviceState: ServiceState,
    options?: {
      silent: boolean
    }
  ) {
    if (!this.state[serviceHash]) {
      this.state[serviceHash] = serviceState
    } else {
      Object.keys(serviceState).forEach((prop) => {
        this.state[serviceHash][prop] = serviceState[prop]
      })
    }

    if (options?.silent) {
      return null
    }
    this.subscribers.forEach((subscriber) => {
      if (subscriber.serviceHash === serviceHash) {
        subscriber.cb(this.state[serviceHash])
      }
    })
  }

  saveSlsConsoleFile(
    slsConsoleFile: SlsConsoleFile,
    options?: {
      silent: boolean
    }
  ) {
    if (options?.silent) {
      return null
    }

    const foundIndex = this.slsConsoleFiles.findIndex(
      (currentItem) => currentItem.id == slsConsoleFile.id
    )

    if (foundIndex !== -1) {
      this.slsConsoleFiles[foundIndex] = slsConsoleFile
    } else {
      this.slsConsoleFiles.push(slsConsoleFile)
    }

    this.slsConsoleFilesSubscribers.forEach((subscriber) => {
      subscriber.cb(this.slsConsoleFiles, slsConsoleFile)
    })
  }

  getSlsConsoleFiles() {
    return this.slsConsoleFiles
  }

  deleteSlsConsoleFile(id: string) {
    this.slsConsoleFiles = this.slsConsoleFiles.filter(
      (slsConsoleFile) => slsConsoleFile.id !== id
    )
    this.slsConsoleFilesSubscribers.forEach((subscriber) => {
      subscriber.cb(this.slsConsoleFiles)
    })
  }

  subscribe(cb: Function, serviceHash: string) {
    this.subscribers.push({
      serviceHash,
      cb,
    })
  }

  unsubscribe(cb: Function, serviceHash: string) {
    this.subscribers = this.subscribers.filter(
      (s) => !(s.serviceHash === serviceHash && s.cb === cb)
    )
  }

  subscribeToSlsConsoleFiles(cb) {
    this.slsConsoleFilesSubscribers.push({
      cb,
    })
  }
}
