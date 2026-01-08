// Simple event emitter for cross-component communication

type EventCallback = () => void

const listeners: Map<string, Set<EventCallback>> = new Map()

export const events = {
  on(event: string, callback: EventCallback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set())
    }
    listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      listeners.get(event)?.delete(callback)
    }
  },

  emit(event: string) {
    listeners.get(event)?.forEach(callback => callback())
  }
}

// Event names
export const SESSION_CREATED = 'session:created'
export const SESSION_UPDATED = 'session:updated'
export const SESSION_DELETED = 'session:deleted'
