import * as AWS from 'aws-sdk'

export async function getAwsCredentials(profile = 'default') {
  var credentials = new AWS.SharedIniFileCredentials({
    profile
  })
  if (credentials['roleArn']) {
    const sts = new AWS.STS()
    const role = await sts
      .assumeRole({
        RoleSessionName: `assumeRole-${Date.now()}`,
        RoleArn: credentials['roleArn']
      })
      .promise()

    return {
      accessKeyId: role.Credentials.AccessKeyId,
      secretAccessKey: role.Credentials.SecretAccessKey,
      sessionToken: role.Credentials.SessionToken
    }
  }
  return {
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken
  }
}
