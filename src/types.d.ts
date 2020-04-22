import * as vscode from 'vscode'
import { DynamoDB } from 'aws-sdk'

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
}

export type License = {
  invalid: boolean
  expires: number
  inTrial: boolean
  licenseKey?: string
  deviceId?: string
  checked?: number
}

export type Store = {
  getState: (serviceHash: string) => ServiceState
  setState: (
    serviceHash: string,
    state: ServiceState,
    options?: {
      silent: boolean
    }
  ) => void
  subscribe: (cb: Function, serviceHash: string) => any
  unsubscribe: (cb: Function, serviceHash: string) => any
}

export type ServiceItem = {
  title?: string
  description?: string
  uri?: any
  tabs?: {
    title: string
    logs?: string
    lambda?: string
    region?: string
  }[]
  icon?: string
  command?: {
    command: string
    title: string
  }
  dir?: string
  collapsibleState?: vscode.TreeItemCollapsibleState
  contextValue?: string
  items?: ServiceItem[]
}

export type DynamoDbTableDesc = {
  hashKey?: string
  sortKey?: string
  indexes?: {
    id: string
    keys: string[]
  }[]
  descOutput: DynamoDB.TableDescription
}

export type Service = {
  type: 'serverlessFramework' | 'custom' | 'cloudformation' | 'dynamodb'
  hash: string
  stacks?: {
    stackName: string
    stage: string
    region?: string
    awsProfile?: string
  }[]
  icon?: string
  awsProfile?: string
  region?: string
  isLoading?: boolean
  error?: any
  title?: string
  cwd?: string
  command?: string
  stages?: any[]
  envVars?: { key: string; value: string }[]
  timeOffsetInMs?: number
  items?: ServiceItem[]
  tableName?: string
}

export type DynamoDbFileChange = {
  name: string
  compositKey: string
  timestamp: number
  dir: string
  id: string
  absFilePath: string
  relFilePath: string
  action: string
  status?: 'inProgress' | 'error'
  command?: any
  error?: string
  index: string
  queryType: string
  json: any
}

export type Comparison =
  | '='
  | '<'
  | '<='
  | '>'
  | '>='
  | '≠'
  | '<>'
  | 'Between'
  | 'Begins with'
  | 'Exists'
  | 'Not exists'
  | 'Contains'
  | 'Not contains'
