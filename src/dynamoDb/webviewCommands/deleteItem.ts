import { ServiceState } from '../../types'
import { getFormattedJSON } from '../getFormattedJSON'
import { join } from 'path'
import { outputFile, readdirSync, existsSync } from 'fs-extra'

export async function deleteItem(serviceState: ServiceState, message: any) {
  const { sortKey, hashKey, index, queryType } = message.payload
  const compositKey = sortKey === undefined ? hashKey : `${hashKey}-${sortKey}`

  const localDirPath = join(
    serviceState.tmpDir,
    `${queryType}-${index}`,
    String(hashKey)
  )

  const randSufix = '0000'
  const fileName = `delete-${compositKey}.${randSufix}.json`

  if (existsSync(join(localDirPath, fileName))) {
    // if file is already sceduled for deletion, no need to anything
    return null
  }

  const localDocPath = join(localDirPath, fileName)

  const tableDetails = serviceState.tableDetails

  const { stringified } = getFormattedJSON(
    tableDetails.sortKey
      ? {
          [tableDetails.hashKey]: hashKey,
          [tableDetails.sortKey]: sortKey,
        }
      : {
          [tableDetails.hashKey]: hashKey,
        }
  )

  await outputFile(localDocPath, stringified)
}
