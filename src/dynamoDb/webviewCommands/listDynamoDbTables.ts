import { DynamoDB } from 'aws-sdk'
import { getAwsCredentials } from '../../getAwsCredentials'

export async function listDynamoDbTables(awsProfile: string, region: string) {
  const credentials = await getAwsCredentials(awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region,
  })

  const listTablesRecursive = async (
    currentResults = [],
    ExclusiveStartTableName = null
  ) => {
    if (currentResults.length > 1000) {
      // limit to 10 requests
      return currentResults
    }
    const res = await dynamoDb
      .listTables({
        ExclusiveStartTableName,
      })
      .promise()

    if (res.LastEvaluatedTableName) {
      return listTablesRecursive(
        [...currentResults, ...res.TableNames],
        res.LastEvaluatedTableName
      )
    } else {
      return [...currentResults, ...res.TableNames]
    }
  }

  return listTablesRecursive()
}
