interface CustomLogsInput {
  hash: string
  awsProfile: string
  type: 'custom'
  timeOffsetInMs?: number
  region?: string
  title?: string
  items?: {
    tabs?: {
      title: string
      logs?: string
      lambda?: string
      region?: string
    }[]
  }[]
}

export interface CustomLogsOutput extends CustomLogsInput {
  icon?: string
}

export function customService(
  service: CustomLogsInput
): Promise<CustomLogsOutput> {
  return new Promise((resolve) => {
    return resolve({
      ...service,
      icon: 'serverless-logs.png',
      items: service.items?.map((item) => {
        const isLambda = item.tabs?.find((t) => t.lambda)
        const isCloudwatchLog = item.tabs?.find((t) => t.logs)

        return {
          ...item,
          command: {
            command: 'serverlessConsole.openLogs',
            title: 'Open Logs',
            arguments: [
              {
                awsProfile: service.awsProfile,
                region: service.region,
                timeOffsetInMs: service.timeOffsetInMs,
                tabs: item.tabs,
              },
            ],
          },
          icon: isLambda ? 'lambda' : isCloudwatchLog ? 'cloudwatch' : null,
        }
      }),
    })
  })
}
