import { Service } from '../../types'
import { getFormattedJSON } from '../getFormattedJSON'
import { writeFile } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { getTableDetails } from '../getTableDescription'

export async function deleteItem(service: Service, { sortKey, hashKey }) {
  const compositKey = sortKey === undefined ? hashKey : `${hashKey}-${sortKey}`

  const fileName = `delete-${compositKey}.json`

  const localDocPath = join(
    tmpdir(),
    `vscode-sls-console/${service.hash}/scan-default`,
    fileName
  )

  const tableDetails = await getTableDetails(service)

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

  await new Promise((resolve) =>
    writeFile(localDocPath, stringified, () => {
      resolve()
    })
  )
}
