export function shallowObjectDiff(original: any, change: any) {
  const originalKeys = Object.keys(original)
  const changeKeys = Object.keys(change)

  let deleted = [] as string[]
  let added = [] as string[]
  let updated = [] as string[]

  changeKeys.forEach((key) => {
    if (!originalKeys.includes(key)) {
      added.push(key)
    } else if (JSON.stringify(change[key]) !== JSON.stringify(original[key])) {
      updated.push(key)
    }
  })

  originalKeys.forEach((key) => {
    if (!changeKeys.includes(key)) {
      deleted.push(key)
    }
  })

  return {
    updated,
    added,
    deleted,
  }
}
