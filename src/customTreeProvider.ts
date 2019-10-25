import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import * as YAML from 'yaml'
import * as AWS from 'aws-sdk'
import * as moment from 'moment'
import { TreeItem } from './TreeItem'
import { ServerlessYML } from './extension'

export class CustomTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      const serverlessPath = vscode.workspace.workspaceFolders
        ? path.join(
            vscode.workspace.workspaceFolders[0].uri.path,
            'serverless.yml'
          )
        : null

      if (serverlessPath && this.pathExists(serverlessPath)) {
        const serverlessFile = fs.readFileSync(serverlessPath, 'utf8')
        const serverlessJSON: ServerlessYML = YAML.parse(serverlessFile)

        const serviceName = serverlessJSON.service.name

        return [
          new TreeItem(
            {
              label: serviceName,
              serverlessJSON,
              serverlessPath: serverlessPath.split('/serverless.yml')[0],
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.Collapsed
          )
        ]
      } else {
        vscode.window.showInformationMessage('Workspace has no serverless.yml')
        return []
      }
    } else if (element.settings.type === 'service') {
      return ['dev'].map(stage => {
        return new TreeItem(
          {
            ...element.settings,
            label: stage,
            type: 'stage',
            stage
          },
          vscode.TreeItemCollapsibleState.Collapsed
        )
      })
    } else if (element.settings.type === 'stage') {
      return Object.keys(element.settings.serverlessJSON.functions).map(
        fnName => {
          return new TreeItem(
            {
              ...element.settings,
              label: fnName,
              type: 'function',
              function: fnName
            },
            vscode.TreeItemCollapsibleState.Collapsed
          )
        }
      )
    } else if (element.settings.type === 'function') {
      const cloudwatchlogs = new AWS.CloudWatchLogs({
        region: 'us-east-1'
      })

      const streams = await cloudwatchlogs
        .describeLogStreams({
          descending: true,
          logGroupName: `/aws/lambda/${element.settings.serverlessJSON.service.name}-${element.settings.stage}-${element.settings.function}`
        })
        .promise()
        .then(a => a.logStreams)
        .catch(err => {
          console.log(err)
          return [] as AWS.CloudWatchLogs.LogStream[]
        })

      return streams.map(log => {
        return new TreeItem(
          {
            ...element.settings,
            type: 'log',
            label: Math.round(Math.random())
              ? '✓ 100 ms (340 MB)'
              : '✖ 100 ms (340 MB)',
            description: moment(log.creationTime).fromNow()
          },
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'extension.openPackageOnNpm',
            title: '',
            arguments: [log.logStreamName]
          }
        )
      })
    }
  }

  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p)
    } catch (err) {
      return false
    }

    return true
  }
}
