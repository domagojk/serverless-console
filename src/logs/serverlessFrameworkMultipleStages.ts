import * as vscode from 'vscode'
import * as path from 'path'
import { readdirSync } from 'fs'
import {
  ServerlessFrameworkInput,
  ServerlessFrameworkOutput,
  slsPrintOutputToJson,
} from './serverlessFrameworkService'

export async function serverlessFrameworkMultipleStages(
  service: ServerlessFrameworkInput
): Promise<ServerlessFrameworkOutput> {
  const results = await Promise.all(
    service.commandsPerStage.map((stage) =>
      slsPrintOutputToJson({
        command: stage.command,
        cwd: service.cwd,
        envVars: service.envVars,
      }).then((res) => {
        return {
          stage: stage.stage,
          yml: res.yml,
          error: res.error,
        }
      })
    )
  )

  if (results.find((r) => r.error)) {
    return {
      ...service,
      error: results.find((r) => r.error).error,
      items: [],
    }
  }

  // taking first command for listing functions
  // (other results are used in stages)
  const yml = results[0].yml

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

  return {
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
            const handlerFileName = handlerArr[handlerArr.length - 1].split(
              '.'
            )[0]
            return nameArr.length === 2 && nameArr[0] === handlerFileName
          })
        } catch (err) {}

        const httpEvent =
          yml.functions[fnName].events && yml.functions[fnName].events.length
            ? yml.functions[fnName].events.find((event) => event.http)
            : null

        return {
          error: null,
          title: fnName,
          uri: foundFile
            ? vscode.Uri.file(path.join(handlerAbsDir, foundFile))
            : null,
          description: httpEvent
            ? `${httpEvent.http.method.toUpperCase()} /${httpEvent.http.path}`
            : null,
          command: {
            command: 'serverlessConsole.openLogs',
            title: 'Open Logs',
            arguments: [
              {
                region: service.region || yml.provider.region,
                awsProfile: service.awsProfile,
                timeOffsetInMs: service.timeOffsetInMs,
                tabs: results.map((result) => {
                  const lambdaName =
                    yml.functions[fnName]?.name ||
                    `${yml.service.name}-${result.stage}-${fnName}`

                  return {
                    title: result.stage,
                    logs: `/aws/lambda/${lambdaName}`,
                    lambda: lambdaName,
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
  }
}
