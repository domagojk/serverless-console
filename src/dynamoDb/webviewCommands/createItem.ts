import * as os from 'os'
import * as path from 'path'
import { Service } from '../../extension'
import { Uri, workspace, window, ViewColumn, Position } from 'vscode'
import { getTableDescription } from '../getTableDescription'
import { getFormattedJSON } from '../getFormattedJSON'

export async function createItem(service: Service) {
  if (!service.context?.tableDescribeOutput) {
    service.context = await getTableDescription(service)
  }

  const localDocPath = path.join(
    os.tmpdir(),
    `vscode-sls-console/${service.hash}/scan-default`,
    `create-${Date.now()}.json`
  )

  const uri = Uri.file(localDocPath).with({
    scheme: 'untitled'
  })

  const doc = await workspace.openTextDocument(uri)
  const editor = await window.showTextDocument(doc, ViewColumn.Beside)

  const initialData = service.context.tableDescribeOutput.AttributeDefinitions.reduce(
    (acc, curr) => {
      // todo add all attribute values
      return {
        ...acc,
        [curr.AttributeName]:
          curr.AttributeType === 'N'
            ? 0
            : curr.AttributeType === 'S'
            ? ''
            : null
      }
    },
    {}
  )

  editor.edit(edit => {
    const { stringified } = getFormattedJSON(initialData)
    edit.insert(new Position(0, 0), stringified)
  })
}
