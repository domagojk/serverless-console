import * as vscode from 'vscode'
import { DynamoDB } from 'aws-sdk'

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
  }[]
  icon?: string
  awsProfile?: string
  region?: string
  isLoading?: boolean
  error?: any
  title?: string
  cwd?: string
  command?: string
  stages?: string[]
  envVars?: { key: string; value: string }[]
  timeOffsetInMs?: number
  items?: ServiceItem[]
  tableName?: string
  context?: {
    changes?: DynamoDbFileChange[]
    onChangesUpdated?: vscode.EventEmitter<DynamoDbFileChange[]>
    _tableDetailsCached?: DynamoDbTableDesc
  }
}

export type DynamoDbFileChange = {
  name: string
  compositKey: string
  modified: number
  dir: string
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
