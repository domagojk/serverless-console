import { spawn } from 'cross-spawn'
import * as vscode from 'vscode'
import * as YAML from 'yaml'
import * as path from 'path'
import { readdirSync } from 'fs'

interface ServerlessFrameworkInput {
  hash: string
  awsProfile: string
  type: 'serverlessFramework'
  timeOffsetInMs?: number
  region?: string
  title?: string
  cwd?: string
  command?: string
  stages?: any[]
  envVars?: { key: string; value: string }[]
}

export interface ServerlessFrameworkOutput extends ServerlessFrameworkInput {
  icon?: string
  error?: string
  items?: {
    title?: string
    type?: string
    description?: string
    command?: {
      command: string
      title: string
      arguments?: any[]
    }
    uri?: any
    icon?: string
    contextValue?: string
  }[]
}

type ServerlessYML = {
  org: string
  service: {
    name: string
  }
  provider: {
    region: string
    name: string
    runtime: string
  }
  resources?: any
  functions: Record<
    string,
    {
      name?: string
      handler: string
      events: {
        http: {
          method: string
          path: string
        }
      }[]
    }
  >
}

const serverlessDefaults = {
  provider: {
    region: 'us-east-1',
    stage: 'dev',
  },
}

export function serverlessFrameworkService(
  service: ServerlessFrameworkInput
): Promise<ServerlessFrameworkOutput> {
  return new Promise((resolve) => {
    // using spawn instead of exec
    // because there was use case when stdout retutned a correct definition,
    // and yet after 5+ seconds, stderr returned "socket hang up" error

    const commandArr = service.command.split(' ')

    const child =
      service.envVars && service.envVars.length
        ? spawn(commandArr[0], commandArr.slice(1), {
            cwd: service.cwd,
            env: {
              ...process.env,
              SLS_WARNING_DISABLE: '*',
              ...service.envVars.reduce((acc, curr) => {
                return {
                  ...acc,
                  [curr.key]: curr.value,
                }
              }, {}),
            },
          })
        : spawn(commandArr[0], commandArr.slice(1), {
            cwd: service.cwd,
            env: {
              ...process.env,
              SLS_WARNING_DISABLE: '*',
            },
          })

    let stdout = ''
    let outputJson = null
    let stdOutEndCalled = false
    const onStdOutEnd = () => {
      if (!outputJson && stdout) {
        // try ignoring possible warning messages
        // by reading output from the first occurance of "service:"
        const start = stdout.indexOf('service:')
        if (start !== -1) {
          try {
            const output = stdout.slice(start)
            outputJson = YAML.parse(output)
          } catch (err) {
            outputJson = null
          }
        }
      }
      if (stdOutEndCalled === false && outputJson && outputJson.service) {
        stdOutEndCalled = true
        let yml: ServerlessYML = {
          ...outputJson,
          provider: {
            ...serverlessDefaults.provider,
            ...outputJson.provider,
          },
        }

        if (typeof yml.service === 'string') {
          yml.service = {
            name: yml.service,
          }
        }

        if (yml.provider.name.toLowerCase() !== 'aws') {
          resolve({
            ...service,
            error: 'only aws provider is supported at the moment',
            items: [],
          })
        }

        if (Array.isArray(yml.functions)) {
          let functionsArr = yml.functions
          yml.functions = {}
          functionsArr.forEach((fun) => {
            yml.functions = {
              ...yml.functions,
              ...fun,
            }
          })
        }

        const dynamodbResources = Object.keys(yml.resources?.Resources || {})
          .reduce((acc, curr) => {
            return [...acc, yml.resources.Resources[curr]]
          }, [])
          .filter((resource) => {
            return (
              resource.Type === 'AWS::DynamoDB::Table' &&
              resource?.Properties?.TableName
            )
          })
          .map((resource) => {
            return {
              type: 'dynamodb',
              title: resource.Properties.TableName,
              tableName: resource.Properties.TableName,
              awsProfile: service.awsProfile,
              region: service.region || yml.provider.region,
            }
          })

        resolve({
          ...service,
          title: service.title || yml.service.name,
          region: service.region || yml.provider.region,
          icon: 'serverless-logs.png',
          items: [
            ...Object.keys(yml.functions).map((fnName) => {
              const handler = yml.functions[fnName].handler
              const handlerArr = handler.split(path.sep)
              const handlerRelativeDir = handlerArr
                .slice(0, handlerArr.length - 1)
                .join(path.sep)

              const handlerAbsDir = path.join(service.cwd, handlerRelativeDir)

              let foundFile
              try {
                const filesInDir = readdirSync(handlerAbsDir)
                foundFile = filesInDir.find((fileName) => {
                  const nameArr = fileName.split('.')
                  const handlerFileName = handlerArr[
                    handlerArr.length - 1
                  ].split('.')[0]
                  return nameArr.length === 2 && nameArr[0] === handlerFileName
                })
              } catch (err) {}

              const httpEvent =
                yml.functions[fnName].events &&
                yml.functions[fnName].events.length
                  ? yml.functions[fnName].events.find((event) => event.http)
                  : null

              const fnNameWithCustom = yml.functions[fnName].name || fnName

              return {
                error: null,
                title: fnNameWithCustom,
                uri: foundFile
                  ? vscode.Uri.file(path.join(handlerAbsDir, foundFile))
                  : null,
                description: httpEvent
                  ? `${httpEvent.http.method.toUpperCase()} /${
                      httpEvent.http.path
                    }`
                  : null,
                command: {
                  command: 'serverlessConsole.openLogs',
                  title: 'Open Logs',
                  arguments: [
                    {
                      region: service.region || yml.provider.region,
                      awsProfile: service.awsProfile,
                      timeOffsetInMs: service.timeOffsetInMs,
                      tabs: service.stages.map((stage) => {
                        if (typeof stage === 'string') {
                          return {
                            title: stage,
                            logs: `/aws/lambda/${yml.service.name}-${stage}-${fnNameWithCustom}`,
                            lambda: `${yml.service.name}-${stage}-${fnNameWithCustom}`,
                          }
                        } else {
                          return {
                            title: stage.title || stage.stage,
                            logs: `/aws/lambda/${yml.service.name}-${stage.stage}-${fnNameWithCustom}`,
                            lambda: `${yml.service.name}-${stage.stage}-${fnNameWithCustom}`,
                            awsProfile: stage.awsProfile,
                            region: stage.region,
                          }
                        }
                      }),
                    },
                  ],
                },
                icon: 'lambda',
              }
            }),
            ...dynamodbResources,
          ],
        })
        child.kill()
      } else if (outputJson) {
        stdout = String(outputJson)
        outputJson = null
      }
    }

    child.stdout.setEncoding('utf8')

    let chunkTimeout
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      try {
        outputJson = YAML.parse(stdout)
      } catch (err) {
        outputJson = null
      }
      if (outputJson) {
        // if chunk can be parsed, wait 1 sec of possible next chunk
        // if there is none, the process is probably done
        // this is done because somethimes waiting for stdout.on('end')
        // takes too long
        clearTimeout(chunkTimeout)
        chunkTimeout = setTimeout(onStdOutEnd, 1000)
      }
    })

    child.stdout.on('end', onStdOutEnd)

    let stderr = ''

    child.on('error', (err) => {
      if (!stderr) {
        stderr = err.message

        if (stderr.includes('ENOENT')) {
          stderr += `\n\n\nENOENT error sometimes occur when command is not found.
            Make sure "${commandArr[0]}" can be executed in "${service.cwd}"
          `
        }
        child.kill()
      }
    })

    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('close', () => {
      if (!outputJson) {
        resolve({
          ...service,
          error: stderr || stdout,
          items: [],
        })
      }
    })
  })
}
