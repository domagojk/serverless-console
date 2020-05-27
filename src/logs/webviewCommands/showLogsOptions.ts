import * as vscode from 'vscode'
import {
  getAllSettings,
  getAutoRefreshInterval,
  setAutoRefreshInterval,
  updateSettings,
} from '../../settings'

export async function showLogsOptions() {
  const settings = getAllSettings()
  let currentValues = {
    autoRefreshInterval: getAutoRefreshInterval(),
    groupPerRequest: settings.groupPerRequest,
  }

  const options = [
    {
      id: 'autoRefresh',
      label: 'Auto Refresh',
      picked: currentValues.autoRefreshInterval ? true : false,
    },
    {
      id: 'groupPerRequest',
      label: 'Group logs per request',
      picked: currentValues.groupPerRequest,
    },
  ]

  const result = await vscode.window.showQuickPick(options, {
    canPickMany: true,
  })

  if (!result) {
    return currentValues
  }

  // results transformed into object
  const pickedObj: any = result.reduce((acc, curr) => {
    return {
      ...acc,
      [curr.id]: true,
    }
  }, {})
  const resultObj: any = options.reduce((acc, curr) => {
    return {
      ...acc,
      [curr.id]: pickedObj[curr.id] || false,
    }
  }, {})

  // handle autorefresh settings
  // todo: merge with all other options
  const autoRefreshEnabledVal = getAutoRefreshInterval() || 5000
  const autoRefreshInterval = resultObj.autoRefresh ? autoRefreshEnabledVal : 0
  setAutoRefreshInterval(autoRefreshInterval)

  // other settings
  updateSettings({
    groupPerRequest: resultObj.groupPerRequest,
  })

  // return result to webview
  return {
    groupPerRequest: resultObj.groupPerRequest,
    autoRefreshInterval,
  }
}
