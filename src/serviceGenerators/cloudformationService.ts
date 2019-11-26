import { Service } from '../extension'
import { CloudFormation } from 'aws-sdk'

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

export async function cloudformationService(
  service: Service
): Promise<Service> {
  const cloudformation = new CloudFormation({
    region: 'us-east-1'
  })

  try {
    const template = await cloudformation
      .getTemplate({
        StackName: service.stackName
      })
      .promise()

    console.log(template.TemplateBody)
    return {
      ...service,
      items: []
    }
  } catch (err) {
    return {
      ...service,
      error: err.message,
      items: []
    }
  }
}
