import { ServiceState } from '../../types'
import { join } from 'path'
import { outputFile, existsSync } from 'fs-extra'
import { getFormattedJSON } from '../getFormattedJSON'

export async function deleteItem(serviceState: ServiceState, message: any) {
  const { sortKey, hashKey, index, queryType } = message.payload
  const compositKey = sortKey === undefined ? hashKey : `${hashKey}-${sortKey}`

  const localDirPath = join(
    serviceState.tmpDir,
    'changes',
    `${queryType}-${index}`,
    String(hashKey)
  )

  const fileName = `delete-${compositKey}.json`

  if (existsSync(join(localDirPath, fileName))) {
    // if file is already sceduled for deletion, no need to anything
    return null
  }

  const localDocPath = join(localDirPath, fileName)

  const originalFormated = getFormattedJSON(message.payload.originalContent)

  return outputFile(localDocPath, originalFormated.stringified)
}
