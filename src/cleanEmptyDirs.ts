import { statSync, readdirSync, removeSync } from 'fs-extra'
import { join } from 'path'

export function cleanEmptyDirs(folder) {
  try {
    const isDir = statSync(folder).isDirectory()
    if (!isDir) {
      return
    }
    // files in dir, exluding hidden ones
    let files = readdirSync(folder).filter((file) => file[0] !== '.')
    if (files.length > 0) {
      files.forEach(function (file) {
        const fullPath = join(folder, file)
        cleanEmptyDirs(fullPath)
      })

      // re-evaluate files; after deleting subfolder
      // we may have parent folder empty now
      files = readdirSync(folder)
    }

    if (files.length == 0) {
      removeSync(folder)
      return
    }
  } catch (err) {
    // fail silently
    if (err.code !== 'ENOENT') {
      console.log(err)
    }
  }
}
