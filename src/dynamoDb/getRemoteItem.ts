import { Service } from '../types'
import { join } from 'path'
import { tmpdir } from 'os'
import { readFileSync } from 'fs-extra'
import { DynamoDB } from 'aws-sdk'
import { uniq } from 'lodash'
import { getTableDetails } from './getTableDescription'
import { getAwsCredentials } from '../getAwsCredentials'
import { getFilterExpression } from './getFilterExpression'
import { getFormattedJSON } from './getFormattedJSON'
import { getLocalItem } from './getLocalItem'

export async function getRemoteItem({
  service,
  path,
  localItem,
}: {
  service: Service
  path: string
  localItem?: any
}) {
  const [queryTypeIndex, fileName] = path.split('/').slice(-2)
  const splitted = queryTypeIndex.split('-')
  splitted.shift() // first item removed
  const index = splitted.join('-') // rest is joined

  const filePath = join(
    tmpdir(),
    `vscode-sls-console/${service.hash}/${queryTypeIndex}`,
    fileName
  )

  const json = localItem || getLocalItem(filePath)

  const tableDetails = await getTableDetails(service)
  const indexDetails = tableDetails.indexes.find(({ id }) => id === index)

  if (!indexDetails) {
    throw new Error('Unable to getItem')
  }

  const credentials = await getAwsCredentials(service.awsProfile)
  const dynamoDb = new DynamoDB({
    credentials,
    region: service.region,
  })

  const hashKey = json[indexDetails.keys[0]]
  const rangeKey = json[indexDetails.keys[1]]

  const queryParams = {
    TableName: service.tableName,
    IndexName: index === 'default' ? null : index,
    ...getFilterExpression(
      [
        {
          comparison: '=',
          dataType: tableDetails.descOutput.AttributeDefinitions.find(
            (attr) => attr.AttributeName === indexDetails.keys[0]
          )?.AttributeType,
          fieldName: indexDetails.keys[0],
          value: hashKey,
          keyCondition: true,
        },
        {
          comparison: '=',
          dataType: tableDetails.descOutput.AttributeDefinitions.find(
            (attr) => attr.AttributeName === indexDetails.keys[1]
          )?.AttributeType,
          fieldName: indexDetails.keys[1],
          value: rangeKey,
          keyCondition: true,
        },
      ],
      'query'
    ),
  }
  const item = await dynamoDb
    .query({
      TableName: service.tableName,
      IndexName: index === 'default' ? null : index,
      ...getFilterExpression(
        [
          {
            comparison: '=',
            dataType: tableDetails.descOutput.AttributeDefinitions.find(
              (attr) => attr.AttributeName === indexDetails.keys[0]
            )?.AttributeType,
            fieldName: indexDetails.keys[0],
            value: hashKey,
            keyCondition: true,
          },
          {
            comparison: '=',
            dataType: tableDetails.descOutput.AttributeDefinitions.find(
              (attr) => attr.AttributeName === indexDetails.keys[1]
            )?.AttributeType,
            fieldName: indexDetails.keys[1],
            value: rangeKey,
            keyCondition: true,
          },
        ],
        'query'
      ),
    })
    .promise()
    .then((res) => {
      if (res.Count !== 1) {
        throw Error(`found ${res.Count} items, expected 1`)
      }
      return DynamoDB.Converter.unmarshall(res.Items[0])
    })

  const columns = uniq([...Object.keys(json), ...Object.keys(item)])

  return getFormattedJSON(item, columns)
}
