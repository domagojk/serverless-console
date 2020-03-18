import { Service } from '../../extension'
import * as vscode from 'vscode'
import { getFormattedJSON } from '../getFormattedJSON'
import { existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export async function editItem(service: Service, message: any) {
  const { sortKey, hashKey } = service.context

  const { json, stringified, space } = getFormattedJSON(
    message.payload.content,
    message.payload.columns
  )

  const compositKey = !sortKey
    ? json[hashKey]
    : `${json[hashKey]}-${json[sortKey]}`

  const localDirPath = join(
    tmpdir(),
    `vscode-sls-console/${service.hash}/${message.payload.queryType}-${message.payload.index}`
  )
  const localDocPath = join(localDirPath, `update-${compositKey}.json`)

  const doesFileExists = existsSync(localDocPath)
  const uri = doesFileExists
    ? vscode.Uri.file(localDocPath)
    : vscode.Uri.file(localDocPath).with({ scheme: 'untitled' })

  const doc = await vscode.workspace.openTextDocument(uri)
  const editor = await vscode.window.showTextDocument(
    doc,
    vscode.ViewColumn.Beside
  )

  const shouldSelectProperty =
    json &&
    message.payload.selectColumn &&
    json[message.payload.selectColumn] !== undefined

  if (doc.getText()) {
    if (shouldSelectProperty) {
      editor.selection = getEditorSelection(
        doc,
        space,
        message.payload.selectColumn
      )
    }
    return
  }

  editor.edit(edit => {
    edit.insert(new vscode.Position(0, 0), stringified)
    if (!shouldSelectProperty) {
      // if there is no text that should be selected
      // exit the function
      return
    }

    // since it seems there is no vscode api which could indicate
    // that editing document is done
    // perform a "dirty" check (max 10 times every 25ms)
    let selectionTimesTried = 0
    const selectClickedProperty = () => {
      selectionTimesTried++
      if (selectionTimesTried > 10) {
        return
      }

      if (!doc.getText()) {
        // doc is not ready yet
        setTimeout(selectClickedProperty, 25)
      } else {
        // doc is ready
        editor.selection = getEditorSelection(
          doc,
          space,
          message.payload.selectColumn
        )
        return
      }
    }
    selectClickedProperty()
  })
}

function getEditorSelection(
  doc: vscode.TextDocument,
  space: string,
  selectColumn: string
) {
  const splitted = doc.getText().split(/\r?\n/)

  const propStart = `${space}"${selectColumn}":`
  const lineStart = splitted.findIndex(ln => ln.startsWith(propStart))
  const lineEnd =
    splitted
      .slice(lineStart + 1)
      .findIndex(ln => ln.startsWith(`${space}"`) || ln.startsWith('}')) +
    lineStart

  if (lineStart < 0 || lineEnd < 0) {
    return
  }

  let chStart = propStart.length + 1
  let chEnd = splitted[lineEnd].length

  const firstSelected = doc.getText(
    new vscode.Range(
      new vscode.Position(lineStart, chStart),
      new vscode.Position(lineStart, chStart + 1)
    )
  )

  if (firstSelected === '"') {
    chStart++
  }

  const lastTwoSelected = doc.getText(
    new vscode.Range(
      new vscode.Position(lineEnd, chEnd - 2),
      new vscode.Position(lineEnd, chEnd)
    )
  )

  if (lastTwoSelected === '",') {
    chEnd = chEnd - 2
  } else if (lastTwoSelected[1] === ',') {
    chEnd = chEnd - 1
  }

  return new vscode.Selection(
    new vscode.Position(lineStart, chStart),
    new vscode.Position(lineEnd, chEnd)
  )
}
