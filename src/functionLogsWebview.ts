import * as vscode from 'vscode'
import { TreeItem } from './TreeItem'
import { CloudWatchLogs } from 'aws-sdk'

export async function getWebviewContent(
  treeItem: TreeItem,
  localResourceRoot,
  mainJsFile
) {
  if (!treeItem.panel) {
    treeItem.panel = vscode.window.createWebviewPanel(
      'catCoding', // Identifies the type of the webview. Used internally
      `${treeItem.label} logs`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [localResourceRoot]
      }
    )

    /*const cloudwatchlogs = new CloudWatchLogs({
      region: treeItem.settings.serverlessJSON.provider.region
    })
    const logStreams = await cloudwatchlogs
      .describeLogStreams({
        logGroupName: '/aws/lambda/backend-dev-getSignedUrl'
      })
      .promise()

    const log = await cloudwatchlogs
      .getLogEvents({
        logGroupName: '/aws/lambda/backend-dev-getSignedUrl',
        logStreamName: logStreams.logStreams[0].logStreamName
      })
      .promise()

    console.log(log)
    */
    const mainJsFileSrc = treeItem.panel.webview.asWebviewUri(mainJsFile)
    treeItem.panel.webview.html = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Cat Coding</title>
  </head>
  <body>
      <div id="root">root</div>
      <script src="${mainJsFileSrc}">
  </body>
  </html>`
  }

  treeItem.panel.reveal()
}
