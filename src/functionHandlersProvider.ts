import * as vscode from 'vscode'
import * as YAML from 'yaml'
import { TreeItem } from './TreeItem'
import { SlsConfig, serverlessDefaults } from './extension'
import { exec, spawn } from 'child_process'

export class FunctionHandlersProvider
  implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | null> = new vscode.EventEmitter<TreeItem | null>()
  readonly onDidChangeTreeData: vscode.Event<TreeItem | null> = this
    ._onDidChangeTreeData.event

  constructor(public slsConfig: SlsConfig) {}

  refresh(slsConfig?: SlsConfig) {
    if (slsConfig) {
      this.slsConfig = slsConfig
    }
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: TreeItem): Promise<TreeItem[]> {
    if (!element) {
      if (this.slsConfig.slsCommands.length === 0) {
        return [
          new TreeItem(
            {
              label: 'no "serverless print" commands found',
              serverlessJSON: null,
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.None
          )
        ]
      } else if (this.slsConfig.status === 'error') {
        console.log(this.slsConfig.error)
        return [
          new TreeItem(
            {
              label: `error running "${this.slsConfig.errorCommand.command}"`,
              serverlessJSON: null,
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.None
          )
        ]
      } else if (this.slsConfig.status === 'done') {
        return this.slsConfig.config.map(
          slsConfig =>
            new TreeItem(
              {
                label: slsConfig.yml.service.name,
                serverlessJSON: slsConfig.yml,
                serverlessPath: `${slsConfig.command.cwd}`,
                type: 'service'
              },
              vscode.TreeItemCollapsibleState.Expanded
            )
        )
      } else {
        return [
          new TreeItem(
            {
              label: `loading...`,
              description: 'running "sls print" command(s)',
              serverlessJSON: null,
              type: 'service'
            },
            vscode.TreeItemCollapsibleState.None
          )
        ]
      }
    } else if (element.settings.type === 'service') {
      return Object.keys(element.settings.serverlessJSON.functions).map(
        fnName => {
          return new TreeItem(
            {
              ...element.settings,
              label: fnName,
              type: 'function',
              function: fnName
            },
            vscode.TreeItemCollapsibleState.None
          )
        }
      )
    }
  }

  slsPrintRefresh(slsCommands) {
    this.refresh({
      slsCommands,
      config: []
    })

    Promise.all(
      slsCommands.map((slsPrintCommand, index) => {
        return new Promise((resolve, reject) => {
          // using spawn instead of exec
          // because there was use case when stdout retutned a correct definition,
          // and yet after 5+ seconds, stderr returned "socket hang up" error
          const commandArr = slsPrintCommand.command.split(' ')
          const child = spawn(commandArr[0], commandArr.slice(1), {
            cwd: slsPrintCommand.cwd
          })

          let stdout = ''
          let outputJson = null
          child.stdout.setEncoding('utf8')
          child.stdout.on('data', chunk => {
            stdout += chunk
            try {
              outputJson = YAML.parse(stdout)
            } catch (err) {
              outputJson = null
            }

            if (outputJson && outputJson.service) {
              resolve({
                command: slsCommands[index],
                yml: {
                  ...outputJson,
                  provider: {
                    ...serverlessDefaults.provider,
                    ...outputJson.provider
                  }
                }
              })
              child.kill()
            }
          })

          let stderr = ''
          child.stderr.setEncoding('utf8')
          child.stderr.on('data', chunk => {
            stderr += chunk
          })

          child.on('close', () => {
            if (!outputJson) {
              reject({
                index,
                error: stderr || stdout
              })
            }
          })

          /*
          exec(
            slsPrintCommand.command,
            {
              cwd: slsPrintCommand.cwd
            },
            (err, stdout, stderr) => {
              if (err) {
                reject({
                  index,
                  error: stderr
                })
              } else {
                const yml = YAML.parse(stdout)
                resolve({
                  command: slsCommands[index],
                  yml: {
                    ...yml,
                    provider: {
                      ...serverlessDefaults.provider,
                      ...yml.provider
                    }
                  }
                })
              }
            }
          )
          */
        })
      })
    )
      .then((config: any) => {
        this.refresh({
          slsCommands: slsCommands,
          config,
          status: 'done'
        })
      })
      .catch(({ error, index }) => {
        this.refresh({
          slsCommands: slsCommands,
          config: [],
          status: 'error',
          errorCommand: slsCommands[index],
          error: error.message
        })
      })
  }
}
