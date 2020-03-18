import { workspace } from 'vscode'

export function getFormattedJSON(data: any, columns?: string[]) {
  let json = {}

  if (columns) {
    columns.forEach(column => {
      if (data[column] !== undefined) {
        json[column] = data[column]
      }
    })
  } else {
    json = data
  }

  const useSpaces: boolean = workspace
    .getConfiguration(null, null)
    .get('editor.insertSpaces')

  const tabSize: number = workspace
    .getConfiguration(null, null)
    .get('editor.tabSize')

  const space = useSpaces ? Array.from(Array(tabSize + 1)).join(' ') : '\t'

  const stringified = `${JSON.stringify(json, null, space)}`

  return { json, stringified, space }
}
