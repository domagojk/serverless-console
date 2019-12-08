import * as vscode from 'vscode'
import { join } from 'path'
import { getFontSize, getServiceHash } from '../settings'
import { getWebviewContent } from '../functionLogsWebview'
import { getAwsSdk } from '../getAwsSdk'

let panel: vscode.WebviewPanel = null

export const addService = (context: vscode.ExtensionContext) => async () => {
  const staticJs = 'resources/webview/build/static/js'
  const staticCss = 'resources/webview/build/static/css'
  const cwd = context.extensionPath
  const localResourceRoot = vscode.Uri.file(join(cwd, 'resources/webview'))

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
        localResourceRoots: [localResourceRoot]
      }
    )
  }
  panel.onDidDispose(() => {
    panel = null
  })

  getWebviewContent({
    panel,
    fontSize: getFontSize(),
    jsFiles: [
      vscode.Uri.file(join(cwd, staticJs, 'main1.js')),
      vscode.Uri.file(join(cwd, staticJs, 'main2.js')),
      vscode.Uri.file(join(cwd, staticJs, 'main3.js'))
    ],
    cssFiles: [
      vscode.Uri.file(join(cwd, staticCss, 'main1.css')),
      vscode.Uri.file(join(cwd, staticCss, 'main2.css'))
    ],
    inlineJs: `
          document.vscodeData = {
            page: 'createService'
          }
        `
  })

  panel.webview.onDidReceiveMessage(async message => {
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
              stages: message.payload.stages
            }
          : message.payload.source === 'cloudformation'
          ? {
              type: 'cloudformation',
              title: message.payload.title,
              timeOffsetInMs: message.payload.offset * 60000,
              awsProfile: message.payload.awsProfile,
              stacks: message.payload.stacks.map(stack => {
                return {
                  region: stack.region,
                  stackName: stack.stackName,
                  stage: stack.stage
                }
              })
            }
          : null

      const hash = getServiceHash(newServiceData)

      if (!hash) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: 'invalid service data'
          }
        })
      } else if (currentServices.find(s => getServiceHash(s) === hash)) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: 'Service already added'
          }
        })
      } else {
        vscode.workspace
          .getConfiguration()
          .update('serverlessConsole.services', [
            ...currentServices,
            newServiceData
          ])

        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            message: 'Service added'
          }
        })
      }
    }
    if (message.command === 'listCloudFormationStacks') {
      const AWS = getAwsSdk(message.payload.awsProfile, message.payload.region)
      const cloudFormation = new AWS.CloudFormation()

      try {
        const stacks = await cloudFormation.listStacks().promise()

        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            stacks: stacks.StackSummaries.map(s => s.StackName)
          }
        })
      } catch (err) {
        panel.webview.postMessage({
          messageId: message.messageId,
          payload: {
            error: err.message
          }
        })
      }
    }
  })
}
