import { readdir } from 'fs'

export async function findExistingChange(
  dir: string,
  fileWithoutSuffix: string
): Promise<string> {
  return new Promise((resolve) =>
    readdir(dir, (err, files) => {
      if (err) {
        return resolve()
      }

      resolve(
        files.find((name) => {
          const withoutSufix = name.split('.').slice(0, -2).join('.')
          if (withoutSufix === fileWithoutSuffix) {
            return true
          }
        })
      )
    })
  )
}
