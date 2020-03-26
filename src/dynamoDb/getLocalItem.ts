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
    throw new Error('Unable to parse JSON file')
  }
  return json
}
