import { join } from 'path'
import { existsSync, statSync, readdirSync } from 'fs-extra'

export function readDirRecursive(
  root: string,
  files?: string[],
  prefix?: string
) {
  prefix = prefix || ''
  files = files || []

  var dir = join(root, prefix)

  if (!existsSync(dir)) {
    return files
  }

  if (statSync(dir).isDirectory()) {
    readdirSync(dir)
      .filter(function (name) {
        return noDotFiles(name)
      })
      .forEach(function (name) {
        readDirRecursive(root, files, join(prefix, name))
      })
  } else {
    files.push(prefix)
  }

  return files
}

function noDotFiles(x) {
  return x[0] !== '.'
}
