import { Store } from './types'

export function createStore(): Store {
  let subscribers = []
  let state = {}

  return {
    getState: (serviceHash) => state[serviceHash],
    setState: (serviceHash, serviceState, options) => {
      if (!state[serviceHash]) {
        state[serviceHash] = serviceState
      } else {
        Object.keys(serviceState).forEach((prop) => {
          state[serviceHash][prop] = serviceState[prop]
        })
      }

      if (options?.silent) {
        return null
      }
      subscribers.forEach((subscriber) => {
        if (subscriber.serviceHash === serviceHash) {
          subscriber.cb(state[serviceHash])
        }
      })
    },
    subscribe: (cb, serviceHash) => {
      subscribers.push({
        serviceHash,
        cb,
      })
    },
    unsubscribe: (cb, serviceHash) => {
      subscribers = subscribers.filter(
        (s) => !(s.serviceHash === serviceHash && s.cb === cb)
      )
    },
  }
}
