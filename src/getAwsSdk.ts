import * as AWS from 'aws-sdk'

export function getAwsSdk(profile = 'default', region?: string) {
  var credentials = new AWS.SharedIniFileCredentials({
    profile
  })
  AWS.config.credentials = credentials
  if (region) {
    AWS.config.region = region
  }

  return AWS
}
