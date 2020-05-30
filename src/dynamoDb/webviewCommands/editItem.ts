import * as vscode from 'vscode'
import { join } from 'path'
import { getFormattedJSON } from '../getFormattedJSON'
import { getLocalItem } from '../getLocalItem'
import { writeFileSync, ensureFileSync, readJSON } from 'fs-extra'
import { Store } from '../../store'

export async function editItem(
  store: Store,
  serviceHash: string,
  message: any
) {
  const serviceState = store.getState(serviceHash)

  const compositKey =
    message.payload.sortKey !== undefined
      ? `${message.payload.hashKey}-${message.payload.sortKey}`
      : message.payload.hashKey

  const relativeFilePath = join(
    `${message.payload.queryType}-${message.payload.index}`,
    String(message.payload.hashKey),
    `update-${compositKey}.json`
  )
  const localDocPathOriginal = join(
    serviceState.tmpDir,
    'original',
    relativeFilePath
  )

  const localDocPath = join(serviceState.tmpDir, 'changes', relativeFilePath)

  const originalFormated = getFormattedJSON(
    message.payload.originalContent,
    message.payload.columns
  )
  ensureFileSync(localDocPathOriginal)
  writeFileSync(localDocPathOriginal, originalFormated.stringified)

  const webviewItemFormatted = getFormattedJSON(
    message.payload.content,
    message.payload.columns
  )

  const existingChange = await readJSON(localDocPath).catch((err) => {})
  const existingChangeFormatted = existingChange
    ? getFormattedJSON(existingChange, message.payload.columns)
    : null

  if (
    existingChangeFormatted?.stringified !== webviewItemFormatted.stringified
  ) {
    // item is different that saved locally
    // overwrite with the one from webview
    ensureFileSync(localDocPath)
    writeFileSync(localDocPath, webviewItemFormatted.stringified)
  }

  const uri = vscode.Uri.file(localDocPath)

  const doc = await vscode.workspace.openTextDocument(uri)
  const editor = await vscode.window.showTextDocument(
    doc,
    vscode.ViewColumn.Beside
  )

  const openedFromWebview = store.getState(serviceHash)?.openedFromWebview || []
  store.setState(serviceHash, {
    openedFromWebview: [...openedFromWebview, localDocPath],
  })

  try {
    let content = getLocalItem(localDocPath)
    let columns = Object.keys(content)

    const { json, stringified, space } = getFormattedJSON(content, columns)

    const shouldSelectProperty =
      json &&
      message.payload.selectColumn &&
      json[message.payload.selectColumn] !== undefined

    if (shouldSelectProperty) {
      const res = getEditorSelection(doc, space, message.payload.selectColumn)
      editor.selection = res.selection

      setTimeout(() => {
        // without timeout after change is made after it was previously deleted
        // selection is canceled for some reason
        editor.revealRange(res.range)
        editor.selection = res.selection
      }, 100)
    }
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

  return {
    selection: new vscode.Selection(
      new vscode.Position(lineStart, chStart),
      new vscode.Position(lineEnd, chEnd)
    ),
    range: new vscode.Range(
      new vscode.Position(lineStart, chStart),
      new vscode.Position(lineEnd, chEnd)
    ),
  }
}
