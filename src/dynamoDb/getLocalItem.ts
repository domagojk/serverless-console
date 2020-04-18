import { readFileSync } from 'fs-extra'

export function getLocalItem(path: string) {
  let json
  try {
    json = JSON.parse(
      readFileSync(path, {
        encoding: 'utf-8',
      })
    )
  } catch (err) {
    let error: any = new Error('Unable to parse JSON file')
    error.code = 'JSON_PARSE_ERROR'
    throw error
  }
  return json
}
