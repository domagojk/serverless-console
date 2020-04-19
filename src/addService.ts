import * as vscode from 'vscode'
import { join } from 'path'
import { loadSharedConfigFiles } from '@aws-sdk/shared-ini-file-loader'
import { getFontSize, getServiceHash, prepareService } from './settings'
import { getWebviewHtml } from './logs/functionLogsWebview'
import { getAwsCredentials } from './getAwsCredentials'
import { serverlessFrameworkService } from './logs/serverlessFrameworkService'
import { cloudformationService } from './logs/cloudformationService'
import { CloudFormation, CloudWatchLogs } from 'aws-sdk'
import { Store } from './types'
import {
  startTrialWithNotifications,
  buyLicense,
  getLicense,
} from './checkLicense'
import { listDynamoDbTables } from './dynamoDb/webviewCommands/listDynamoDbTables'

let panel: vscode.WebviewPanel = null

export const addService = (
  context: vscode.ExtensionContext,
  store: Store
) => async () => {
  const staticJs = 'resources/webview/build/static/js'
  const staticCss = 'resources/webview/build/static/css'
  const cwd = context.extensionPath
  const localResourceRoot = vscode.Uri.file(join(cwd, 'resources/webview'))
  const license = await getLicense()

  if (panel) {
    panel.reveal()
  } else {
    panel = vscode.window.createWebviewPanel(
      'addServicePage',
      `Add Service`,
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
        localResourceRoots: [localResourceRoot],
      }
    )
  }
  panel.onDidDispose(() => {
    panel = null
  })
  const profiles = await loadSharedConfigFiles()
    .then((res) => Object.keys(res.credentialsFile))
    .catch((err) => [])

  panel.webview.html = await getWebviewHtml({
    panel,
    fontSize: getFontSize(),
    jsFiles: [
      vscode.Uri.file(join(cwd, staticJs, 'main1.js')),
      vscode.Uri.file(join(cwd, staticJs, 'main2.js')),
      vscode.Uri.file(join(cwd, staticJs, 'main3.js')),
    ],
    cssFiles: [
      vscode.Uri.file(join(cwd, staticCss, 'main1.css')),
      vscode.Uri.file(join(cwd, staticCss, 'main2.css')),
    ],
    inlineJs: `
          document.vscodeData = {
            license: ${JSON.stringify(license)},
            page: 'createService',
            profiles: ${JSON.stringify(profiles)}
          }
        `,
  })

  panel.webview.onDidReceiveMessage(async (message) => {
    if (message.command === 'addService') {
      const currentServices: any[] =
        vscode.workspace.getConfiguration().get('serverlessConsole.services') ||
        []

      const newServiceData =
        message.payload.source === 'serverless'
          ? {
              type: 'serverlessFramework',
              title: message.payload.title,
              awsProfile: message.payload.awsProfile,
              cwd: message.payload.cwd,
              command: message.payload.print,
              timeOffsetInMs: message.payload.offset * 60000,
              envVars: message.payload.envVars,
              stages: message.payload.stages,
            }
          : message.payload.source === 'cloudformation'
          ? {
              type: 'cloudformation',
              title: message.payload.title,
              timeOffsetInMs: message.payload.offset * 60000,
              awsProfile: message.payload.awsProfile,
              stacks: message.payload.stacks.map((stack) => {
                return {
                  region: stack.region,
                  stackName: stack.stackName,
                  stage: stack.stage,
                }
              }),
            }
          : message.payload.source === 'custom'
          ? {
              type: 'custom',
              title: message.payload.title,
              timeOffsetInMs: message.payload.offset * 60000,
              awsProfile: message.payload.awsProfile,
              items: message.payload.items,
            }
          : message.payload.source === 'dynamodb'
          ? {
              type: 'dynamodb',
              title: message.payload.tableName,
              tableName: message.payload.tableName,
              awsProfile: message.payload.awsProfile,
              region: message.payload.region,
            }
          : null

      const handler =
        newServiceData.type === 'serverlessFramework'
          ? serverlessFrameworkService
          : newServiceData.type === 'cloudformation'
          ? cloudformationService
          : null

      if (handler) {
        const { error } = await handler(prepareService(newServiceData)).catch(
          (err) => {
            return {
              error:
                err && err.message
                  ? err.message
                  : 'error connecting to service',
            }
          }
        )

        if (error) {
          return panel.webview.postMessage({
            messageId: message.messageId,
            payload: {
              error,
            },
          })
        }
      }

      const hash = getServiceHash(newServiceData)

      if (!hash) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: 'invalid service data',
          },
        })
      } else if (currentServices.find((s) => getServiceHash(s) === hash)) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: 'Service already added',
          },
        })
      } else {
        vscode.workspace
          .getConfiguration()
          .update('serverlessConsole.services', [
            ...currentServices,
            newServiceData,
          ])

        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            message: 'Service added',
          },
        })
      }
    } else if (message.command === 'listCloudFormationStacks') {
      try {
        const credentials = await getAwsCredentials(message.payload.awsProfile)
        const cloudFormation = new CloudFormation({
          credentials,
          region: message.payload.region,
        })

        const stacks = await cloudFormation.listStacks().promise()

        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            stacks: stacks.StackSummaries.map((s) => s.StackName),
          },
        })
      } catch (err) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: err.message,
          },
        })
      }
    } else if (message.command === 'describeLogGroups') {
      try {
        const credentials = await getAwsCredentials(message.payload.awsProfile)
        const cloudWatch = new CloudWatchLogs({
          credentials,
          region: message.payload.region,
        })

        const describeLogGroupsRecursive = async (
          currentResults = [],
          nextToken = null
        ) => {
          if (currentResults.length > 500) {
            // limit to 10 requests
            return currentResults
          }

          const res = await cloudWatch
            .describeLogGroups({
              nextToken,
            })
            .promise()

          if (res.nextToken) {
            return describeLogGroupsRecursive(
              [...currentResults, ...res.logGroups],
              res.nextToken
            )
          } else {
            return [...currentResults, ...res.logGroups]
          }
        }

        const logGroups = await describeLogGroupsRecursive()

        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            logGroups: logGroups.map((l) => l.logGroupName),
          },
        })
      } catch (err) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: err.message,
          },
        })
      }
    } else if (message.command === 'startTrial') {
      const license = await startTrialWithNotifications()

      panel.webview.postMessage({
        messageId: message.messageId,
        payload: {
          license,
        },
      })
    } else if (message.command === 'buyLicense') {
      buyLicense()
    } else if (message.command === 'listDynamoDbTables') {
      try {
        const tableNames = await listDynamoDbTables(
          message.payload.awsProfile,
          message.payload.region
        )
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            tableNames,
          },
        })
      } catch (err) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: err.message,
          },
        })
      }
    }
  })
}
