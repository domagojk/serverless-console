import { Service } from '../../extension'
import { getFormattedJSON } from '../getFormattedJSON'
import { writeFile } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export async function deleteItem(service: Service, { sortKey, hashKey }) {
  const compositKey = sortKey === undefined ? hashKey : `${hashKey}-${sortKey}`

  const fileName = `delete-${compositKey}.json`

  const localDocPath = join(
    tmpdir(),
    `vscode-sls-console/${service.hash}/scan-default`,
    fileName
  )

  const { stringified } = getFormattedJSON(
    service.context.sortKey
      ? {
          [service.context.hashKey]: hashKey,
          [service.context.sortKey]: sortKey
        }
      : {
          [service.context.hashKey]: hashKey
        }
  )

  await new Promise(resolve =>
    writeFile(localDocPath, stringified, () => {
      resolve()
    })
  )
}
