import * as vscode from 'vscode'
import * as moment from 'moment'
import { machineId } from 'node-machine-id'
import axios from 'axios'
import { getServices } from './settings'

type License = {
  invalid: boolean
  expires: number
  inTrial: boolean
  licenseKey?: string
  deviceId?: string
  checked?: number
}

const ms24h = 86400000
const ms30min = 1800000
let cachedLicense = null as License
let cacheTimeout = ms24h

export function getCachedLicense(context: vscode.ExtensionContext) {
  const key = context.globalState.get('licenseKey')

  if (
    cachedLicense?.licenseKey === key &&
    cachedLicense?.checked &&
    Date.now() - cachedLicense?.checked < cacheTimeout
  ) {
    return cachedLicense
  }
}

export async function getLicense(
  context: vscode.ExtensionContext,
  params?: {
    skipCache?: boolean
    licenseKey?: string
  }
): Promise<License> {
  const key = params?.licenseKey || context.globalState.get('licenseKey')

  if (
    !params?.skipCache &&
    cachedLicense?.licenseKey === key &&
    cachedLicense?.checked &&
    Date.now() - cachedLicense?.checked < cacheTimeout
  ) {
    return cachedLicense
  }

  const deviceId = await getDeviceId()
  const serviceTypes = getServices()
    ?.map((s) => s.type)
    .join('-')

  return axios
    .get(
      `https://api.serverlessconsole.com/checkLicense?deviceId=${deviceId}&licenseKey=${key}&services=${serviceTypes}`,
      {
        timeout: 2000,
      }
    )
    .then((res) => {
      cacheTimeout = ms24h

      if (res.status === 200 && res.data) {
        return {
          invalid: res.data?.invalid,
          expires: res.data?.expires,
          inTrial: res.data?.inTrial,
          deviceId,
          licenseKey: key,
          checked: Date.now(),
        }
      } else {
        throw new Error()
      }
    })
    .catch((err) => {
      if (err.code === 'ECONNABORTED' || err?.response?.status >= 500) {
        cacheTimeout = ms30min
      }

      return {
        invalid: err?.response?.data?.invalid || false,
        expires: null,
        inTrial: err?.response?.data?.inTrial,
        deviceId,
        licenseKey: key,
        checked: Date.now(),
      }
    })
    .then((license) => {
      cachedLicense = license
      return license
    })
}

export async function startTrial(
  context: vscode.ExtensionContext
): Promise<License> {
  const deviceId = await getDeviceId()

  return axios
    .get(`https://api.serverlessconsole.com/startTrial?deviceId=${deviceId}`)
    .then(async (res) => {
      context.globalState.update('licenseKey', 'trial')

      if (res.status === 200 && res.data) {
        return {
          invalid: res.data?.invalid,
          expires: res.data?.expires,
          inTrial: res.data?.inTrial,
          deviceId,
        }
      } else {
        throw new Error()
      }
    })
    .catch(async (err) => {
      if (err.response?.data?.alreadyStarted) {
        context.globalState.update('licenseKey', 'trial')

        const license = await getLicense(context)

        if (license.invalid) {
          vscode.window.showErrorMessage(
            'Your Serverless Console Pro Trial has already expired'
          )
        }
        return license
      } else if (err.response?.data?.message) {
        throw new Error(err.response.data.message)
      } else {
        throw err
      }
    })
}

export async function startTrialWithNotifications(
  context: vscode.ExtensionContext
): Promise<License> {
  return new Promise((resolve, reject) =>
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Serverless Console PRO Trial',
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Starting' })

        try {
          const license = await startTrial(context)

          progress.report({
            increment: 100,
          })

          return resolve(license)
        } catch (err) {
          progress.report({
            increment: 100,
          })
          setTimeout(
            () =>
              vscode.window.showErrorMessage(
                `Error starting trial: ${err.message}`
              ),
            1000
          )
          return reject(err)
        }
      }
    )
  )
}

export function buyLicense() {
  vscode.env.openExternal(vscode.Uri.parse('https://serverlessconsole.com'))
}

export async function enterLicense(context: vscode.ExtensionContext) {
  const response = await vscode.window.showInputBox({
    prompt: 'Enter License Key',
  })

  if (response) {
    if (
      !response.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      ) // check if is uuid format
    ) {
      return await vscode.window.showErrorMessage('Invalid License key')
    }

    const check = await getLicense(context, {
      licenseKey: response,
    })

    if (check.invalid) {
      await vscode.window.showErrorMessage('Invalid License key')
    } else {
      context.globalState.update('licenseKey', response)

      await vscode.window.showInformationMessage(
        'License key successfully added!'
      )
    }
  }
}

export async function showProOptions(context: vscode.ExtensionContext) {
  const { expires, invalid, inTrial } = await getLicense(context, {
    skipCache: true,
  })
  let selectedOption

  if (invalid === true && expires) {
    const warningMessage = inTrial
      ? 'Your Serverless Console PRO period has expired'
      : !inTrial
      ? 'Your Serverless Console PRO license has expired'
      : null

    selectedOption = await vscode.window.showWarningMessage(
      warningMessage,
      {
        modal: true,
      },
      'Buy Now',
      'Enter License Key'
    )
  } else if (invalid === true && !expires) {
    selectedOption = await vscode.window.showInformationMessage(
      'Serverless Console PRO',
      {
        modal: true,
      },
      'More info',
      'Start Trial',
      'Enter License Key'
    )
  } else if (invalid === false && inTrial && expires) {
    const remainingDays = moment(expires).diff(moment(), 'days') || 0
    const dayPlural = remainingDays === 1 ? '' : 's'

    const daysRemaining = `${
      remainingDays < 0 ? 0 : remainingDays
    } day${dayPlural}`

    selectedOption = await vscode.window.showWarningMessage(
      `Your Serverless Console PRO trial ends in ${daysRemaining}`,
      {
        modal: true,
      },
      'Buy Now',
      'Enter License Key'
    )
  } else if (invalid === false && inTrial === false && expires) {
    selectedOption = await vscode.window.showWarningMessage(
      `You have successfully activated Serverless Console PRO extension. Your license expires in ${moment(
        expires
      ).format('MMMM Do YYYY')}`,
      {
        modal: true,
      }
    )
  } else if (invalid === false && !expires) {
    await vscode.window.showWarningMessage(
      `Could not check license at this time. Please try again later.`
    )
  }

  if (selectedOption === 'Buy Now' || selectedOption === 'More info') {
    buyLicense()
  } else if (selectedOption === 'Enter License Key') {
    enterLicense(context)
  } else if (selectedOption === 'Start Trial') {
    startTrialWithNotifications(context)
  }
}

function getDeviceId(): Promise<string | null> {
  let isResolved = false

  return new Promise((resolve) => {
    machineId()
      .catch(() => null)
      .then((id) => {
        if (isResolved === false) {
          isResolved = true
          resolve(id)
        }
      })

    // if deviceId is not resolved in 1s, return null
    setTimeout(() => {
      if (isResolved === false) {
        isResolved = true
        resolve()
      }
    }, 1000)
  })
}
