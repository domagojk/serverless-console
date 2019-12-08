import { Service } from '../extension'
import { getAwsSdk } from '../getAwsSdk'

export async function cloudformationService(
  service: Service
): Promise<Service> {
  let functionsAllStages = {}

  try {
    for (const stack of service.stacks) {
      const region = stack.region || 'us-east-1'
      const profile = service.awsProfile || 'default'

      const AWS = getAwsSdk(profile, region)
      const cloudformation = new AWS.CloudFormation({
        region
      })

      const template = await cloudformation
        .getTemplate({
          StackName: stack.stackName
        })
        .promise()

      const parsed = JSON.parse(template.TemplateBody)
      const resourcesObj = parsed.Resources
      const resourcesArr = Object.keys(resourcesObj).reduce((acc, curr) => {
        return [
          ...acc,
          {
            id: curr,
            ...resourcesObj[curr]
          }
        ]
      }, [])

      const functions = resourcesArr
        .filter(i => i.Type === 'AWS::Lambda::Function')
        .map(res => {
          const logs = res.DependsOn.reduce((acc, resourceId) => {
            return [...acc, resourcesObj[resourceId]]
          }, []).filter(i => i.Type === 'AWS::Logs::LogGroup')

          const fnName = res.Properties.FunctionName
          return {
            ...res,
            title: fnName.replace(`${stack.stackName}-`, ''),
            functionName: fnName,
            log: logs.length ? logs[0].Properties.LogGroupName : null
          }
        })

      const methods = resourcesArr
        .filter(i => i.Type === 'AWS::ApiGateway::Method')
        .map(res => {
          const resId = res.Properties?.ResourceId?.Ref
          const resource = resourcesObj[resId]
          const pathPart = resource?.Properties?.PathPart

          if (pathPart) {
            return {
              ...res,
              pathPart
            }
          }
          return res
        })

      functionsAllStages = functions.reduce((acc, curr) => {
        return {
          ...acc,
          [curr.id]: {
            ...curr,
            stages: {
              ...(acc[curr.id]?.stages || {}),
              [stack.stage]: {
                logs: curr.log
              }
            }
          }
        }
      }, functionsAllStages)

      methods.forEach(method => {
        const uri = method.Properties?.Integration?.Uri
        const joined = uri && uri['Fn::Join'] ? uri['Fn::Join'].flat() : []

        const lambdaIndex = joined.findIndex(i => {
          return typeof i === 'string' && i.startsWith(':lambda:')
        })

        const lambdaFn = joined[lambdaIndex + 1]
          ? joined[lambdaIndex + 1]['Fn::GetAtt'][0]
          : null

        if (functionsAllStages[lambdaFn]) {
          functionsAllStages[lambdaFn].method = method
        }
      })
    }

    const functionsArr = Object.keys(functionsAllStages).reduce((acc, curr) => {
      return [...acc, functionsAllStages[curr]]
    }, [])

    return {
      region: 'us-east-1',
      ...service,
      items: functionsArr
        .filter(fn => fn.log)
        .map(fn => {
          return {
            title: fn.title,
            description: fn.method
              ? `${fn.method.Properties.HttpMethod} /${fn.method.pathPart}`
              : '',
            tabs: Object.keys(fn.stages).map(stage => {
              return {
                title: stage,
                logs: fn.stages[stage].logs,
                lambda: fn.functionName
              }
            })
          }
        })
    }
  } catch (err) {
    return {
      ...service,
      error: err.message,
      items: []
    }
  }
}
