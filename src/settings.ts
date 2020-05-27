import * as vscode from 'vscode'
import * as path from 'path'
import { createHash } from 'crypto'
import { Service } from './extension'

export function getServices(): Service[] {
  let services: any[] = vscode.workspace
    .getConfiguration()
    .get('serverlessConsole.services')

  if (!services) {
    services = []
  }

  return services.map(prepareService)
}

export function prepareService(conf) {
  const workspaceDir = vscode.workspace.workspaceFolders[0].uri.fsPath

  delete conf.hash
  const hash = getServiceHash(conf)

  if (conf.type === 'serverlessFramework') {
    return {
      ...conf,
      hash,
      cwd: path.join(workspaceDir, conf.cwd),
    }
  } else {
    return {
      ...conf,
      hash,
    }
  }
}

export function getServiceHash(service) {
  return createHash('md5').update(JSON.stringify(service)).digest('hex')
}

type Settings = {
  groupPerRequest: boolean
  autoRefreshInterval: number
  closeDynamoDbItemAfterSave: boolean
  searchByLogStreams: boolean
}
export function getAllSettings(): Settings {
  const settingKeys = [
    'serverlessConsole.groupPerRequest',
    'serverlessConsole.autoRefreshInterval',
    'serverlessConsole.closeDynamoDbItemAfterSave',
    'serverlessConsole.searchByLogStreams',
  ]

  return settingKeys.reduce((acc, curr) => {
    return {
      ...acc,
      [curr.replace(
        'serverlessConsole.',
        ''
      )]: vscode.workspace.getConfiguration().get(curr),
    }
  }, {} as Settings)
}

export function updateSettings(settings) {
  for (const settingsKey of Object.keys(settings)) {
    vscode.workspace
      .getConfiguration()
      .update(`serverlessConsole.${settingsKey}`, settings[settingsKey])
  }
}

export function getAutoRefreshInterval(): number {
  return vscode.workspace
    .getConfiguration()
    .get('serverlessConsole.autoRefreshInterval')
}

export function setAutoRefreshInterval(interval: number) {
  return vscode.workspace
    .getConfiguration()
    .update('serverlessConsole.autoRefreshInterval', interval)
}

export function getFontSize(): number {
  return vscode.workspace.getConfiguration(null, null).get('editor.fontSize')
}

export function getFontFamily(): number {
  return vscode.workspace.getConfiguration(null, null).get('editor.fontFamily')
}
