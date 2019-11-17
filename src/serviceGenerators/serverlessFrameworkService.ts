import { spawn } from 'child_process'
import * as vscode from 'vscode'
import * as YAML from 'yaml'
import * as path from 'path'
import { readdirSync } from 'fs'
import { Service } from '../extension'

export type ServerlessYML = {
  org: string
  service: {
    name: string
  }
  provider: {
    region: string
    name: string
    runtime: string
  }
  functions: Record<
    string,
    {
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

export const serverlessDefaults = {
  provider: {
    region: 'us-east-1',
    stage: 'dev'
  }
}

export function serverlessFrameworkService(service: Service): Promise<Service> {
  return new Promise(resolve => {
    // using spawn instead of exec
    // because there was use case when stdout retutned a correct definition,
    // and yet after 5+ seconds, stderr returned "socket hang up" error

    const commandArr = service.command.split(' ')
    const child = spawn(commandArr[0], commandArr.slice(1), {
      cwd: service.cwd
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
        const yml: ServerlessYML = {
          ...outputJson,
          provider: {
            ...serverlessDefaults.provider,
            ...outputJson.provider
          }
        }

        resolve({
          ...service,
          title: yml.service.name,
          region: yml.provider.region,
          items: Object.keys(yml.functions).map(fnName => {
            const handler = yml.functions[fnName].handler
            const handlerArr = handler.split('/')
            const handlerRelativeDir = handlerArr
              .slice(0, handlerArr.length - 1)
              .join('/')

            const handlerAbsDir = path.join(service.cwd, handlerRelativeDir)

            const filesInDir = readdirSync(handlerAbsDir)
            const foundFile = filesInDir.find(fileName => {
              const nameArr = fileName.split('.')
              const handlerFileName = handlerArr[handlerArr.length - 1].split(
                '.'
              )[0]
              return nameArr.length === 2 && nameArr[0] === handlerFileName
            })

            const httpEvent = yml.functions[fnName].events.find(
              event => event.http
            )

            return {
              error: null,
              title: fnName,
              uri: foundFile
                ? vscode.Uri.file(path.join(handlerAbsDir, foundFile))
                : null,
              description: httpEvent
                ? `${httpEvent.http.method.toUpperCase()} /${
                    httpEvent.http.path
                  }`
                : null,
              tabs: service.stages.map(stage => ({
                title: stage,
                logs: `/aws/lambda/${yml.service.name}-${stage}-${fnName}`,
                lambda: `${yml.service.name}-${stage}-${fnName}`
              }))
            }
          })
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
        resolve({
          ...service,
          error: stderr || stdout,
          items: []
        })
      }
    })
  })
}
