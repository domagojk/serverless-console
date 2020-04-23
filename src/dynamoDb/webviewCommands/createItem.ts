import { join } from 'path'
import { Uri, workspace, window, ViewColumn, Position } from 'vscode'
import { ServiceState } from '../../types'
import { getFormattedJSON } from '../getFormattedJSON'

export async function createItem(
  serviceState: ServiceState,
  prepopulatedItem?: any
) {
  const localDocPath = join(
    serviceState.tmpDir,
    'changes',
    `scan-default`,
    Date.now().toString(),
    `create-${Date.now()}.json`
  )

  const uri = Uri.file(localDocPath).with({
    scheme: 'untitled',
  })

  const doc = await workspace.openTextDocument(uri)
  const editor = await window.showTextDocument(doc, ViewColumn.Beside)

  const tableDetails = serviceState.tableDetails

  const initialData =
    prepopulatedItem ||
    tableDetails.descOutput.AttributeDefinitions.reduce((acc, curr) => {
      return {
        ...acc,
        [curr.AttributeName]:
          curr.AttributeType === 'N'
            ? 0
            : curr.AttributeType === 'S'
            ? ''
            : null,
      }
    }, {})

  editor.edit((edit) => {
    const { stringified } = getFormattedJSON(initialData)
    edit.insert(new Position(0, 0), stringified)
  })
}
