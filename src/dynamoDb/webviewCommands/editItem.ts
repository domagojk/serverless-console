import * as vscode from 'vscode'
import { join } from 'path'
import { ServiceState } from '../../types'
import { getFormattedJSON } from '../getFormattedJSON'
import { getLocalItem } from '../getLocalItem'
import { findExistingChange } from '../findExistingChange'
import { readFileSync } from 'fs-extra'

export async function editItem(serviceState: ServiceState, message: any) {
  const localDirPath = join(
    serviceState.tmpDir,
    `${message.payload.queryType}-${message.payload.index}`,
    String(message.payload.hashKey)
  )
  const compositKey =
    message.payload.sortKey !== undefined
      ? `${message.payload.hashKey}-${message.payload.sortKey}`
      : message.payload.hashKey

  // using randSufix as filename end because vscode already exists
  // alert even after file is removed from disc (probably the file is stored in cache)
  const randSufix = String(Math.round(Math.random() * 10000)).padStart(4, '0')

  const existingChange = await findExistingChange(
    localDirPath,
    `update-${compositKey}`
  )

  const localDocPath = join(
    localDirPath,
    existingChange ? existingChange : `update-${compositKey}.${randSufix}.json`
  )

  const uri = existingChange
    ? vscode.Uri.file(localDocPath)
    : vscode.Uri.file(localDocPath).with({ scheme: 'untitled' })

  const doc = await vscode.workspace.openTextDocument(uri)
  const editor = await vscode.window.showTextDocument(
    doc,
    vscode.ViewColumn.Beside
  )

  try {
    let content = existingChange
      ? getLocalItem(localDocPath)
      : message.payload.content

    let columns = existingChange
      ? Object.keys(content)
      : message.payload.columns

    const { json, stringified, space } = getFormattedJSON(content, columns)

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

    editor.edit((edit) => {
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
  } catch (err) {
    if (err.code === 'JSON_PARSE_ERROR') {
      // ignore
      // since this can only happen to localy saved file,
      // no need to do any insering or selecting
    } else {
      vscode.window.showErrorMessage(`Error editing item. ${err.message}`)
    }
  }
}

function getEditorSelection(
  doc: vscode.TextDocument,
  space: string,
  selectColumn: string
) {
  const splitted = doc.getText().split(/\r?\n/)

  const propStart = `${space}"${selectColumn}":`
  const lineStart = splitted.findIndex((ln) => ln.startsWith(propStart))
  const lineEnd =
    splitted
      .slice(lineStart + 1)
      .findIndex((ln) => ln.startsWith(`${space}"`) || ln.startsWith('}')) +
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
  } else if (lastTwoSelected[1] === ',' || lastTwoSelected[1] === '"') {
    chEnd = chEnd - 1
  }

  return new vscode.Selection(
    new vscode.Position(lineStart, chStart),
    new vscode.Position(lineEnd, chEnd)
  )
}
