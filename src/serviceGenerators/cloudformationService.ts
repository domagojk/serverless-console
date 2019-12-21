import { Service } from '../extension'
import { getAwsSdk } from '../getAwsSdk'
import * as YAML from 'yaml'

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

      let runs = 0
      const listAllResources = async (
        currentResources: AWS.CloudFormation.StackResourceSummaries,
        stackName: string,
        nextToken?: string
      ) => {
        runs++
        const resources = await cloudformation
          .listStackResources({
            StackName: stack.stackName,
            NextToken: nextToken
          })
          .promise()

        const merged = [
          ...currentResources,
          ...resources.StackResourceSummaries
        ]
        if (resources.NextToken && runs < 5) {
          return listAllResources(merged, stackName, resources.NextToken)
        } else {
          return merged
        }
      }

      const resources = await listAllResources([], stack.stackName)

      const functions = resources
        .filter(r => r.ResourceType === 'AWS::Lambda::Function')
        .filter(
          r =>
            r.LogicalResourceId !==
            'CustomDashresourceDashapigwDashcwDashroleLambdaFunction'
        )
        .map(res => {
          return {
            ...res,
            title: res.LogicalResourceId,
            region,
            functionName: res.PhysicalResourceId,
            log: `/aws/lambda/${res.PhysicalResourceId}`
          }
        })

      functionsAllStages = functions.reduce((acc, curr) => {
        return {
          ...acc,
          [curr.LogicalResourceId]: {
            ...curr,
            stages: {
              ...(acc[curr.LogicalResourceId]?.stages || {}),
              [stack.stage]: {
                logs: curr.log,
                lambda: curr.functionName,
                region: curr.region
              }
            }
          }
        }
      }, functionsAllStages)

      try {
        // parsing template to get method details
        // (can fail)

        const template = await cloudformation
          .getTemplate({
            TemplateStage: 'Original',
            StackName: stack.stackName
          })
          .promise()

        const parsed = YAML.parse(template.TemplateBody)
        const resources = parsed.Resources

        // trying to parse SAM template
        Object.keys(resources).forEach(resId => {
          if (functionsAllStages[resId]) {
            const resEvents = resources[resId]?.Properties?.Events
            if (resEvents) {
              Object.keys(resEvents).forEach(key => {
                const props = resEvents[key]?.Properties
                if (props?.Method) {
                  const description = `${props?.Method?.toUpperCase()} ${
                    props?.Path
                  }`
                  functionsAllStages[resId].method = description
                }
              })
            }
          }
        })

        // trying to parse cloudformation JSON
        const resourcesArr = Object.keys(resources).reduce((acc, curr) => {
          return [
            ...acc,
            {
              id: curr,
              ...resources[curr]
            }
          ]
        }, [])

        const methods = resourcesArr
          .filter(i => i.Type === 'AWS::ApiGateway::Method')
          .map(res => {
            const resId = res.Properties?.ResourceId?.Ref
            const resource = resources[resId]
            const pathPart = resource?.Properties?.PathPart

            if (pathPart) {
              return {
                ...res,
                pathPart
              }
            }
            return res
          })

        methods.forEach(method => {
          const uri = method.Properties?.Integration?.Uri
          const uriResolved = uri?.['Fn::Join']?.flat() || []

          const lambdaIndex = uriResolved.findIndex(i => {
            return typeof i === 'string' && i.startsWith(':lambda:')
          })

          const lambdaFn = uriResolved?.[lambdaIndex + 1]?.['Fn::GetAtt']?.[0]

          if (lambdaFn && functionsAllStages[lambdaFn]) {
            const desc = `${method.Properties.HttpMethod} /${method.pathPart}`
            functionsAllStages[lambdaFn].method = desc
          }
        })
      } catch (err) {
        // ignore errors
      }
    }

    const functionsArr = Object.keys(functionsAllStages).reduce((acc, curr) => {
      return [...acc, functionsAllStages[curr]]
    }, [])

    return {
      ...service,
      items: functionsArr
        .filter(fn => fn.log)
        .map(fn => {
          return {
            title:
              fn.title !== 'LambdaFunction' &&
              fn.title.endsWith('LambdaFunction')
                ? fn.title.replace(/LambdaFunction$/, '')
                : fn.title,
            description: fn.method,
            tabs: Object.keys(fn.stages).map(stage => {
              return {
                title: stage,
                logs: fn.stages[stage].logs,
                lambda: fn.stages[stage].lambda,
                region: fn.stages[stage].region
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
