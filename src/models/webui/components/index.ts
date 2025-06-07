import { otherComponents } from './other'

export const components = async () => {
  const results = await Promise.all([
    otherComponents()
  ])

  return results.flat()
}

export {
  otherComponents
}
