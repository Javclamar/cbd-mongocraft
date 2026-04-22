

export interface QueryPayload {
  type: 'find' | 'aggregate'
  collection: string
  filter?: Record<string, unknown>
  projection?: Record<string, unknown>
  sort?: Record<string, unknown>
  limit?: number
  pipeline?: Array<Record<string, unknown>>
}


export function parseMongoQuery(code: string): QueryPayload {
  let capturedPayload: QueryPayload | null = null

  const dbProxy = new Proxy({}, {
    get: (_target, collectionName: string) => {
      // Ignore non-string symbols or prototype methods
      if (typeof collectionName !== 'string') return undefined
      if (collectionName === 'then' || collectionName === 'catch') return undefined

      return {
        find: (filter: Record<string, unknown> = {}, projection?: Record<string, unknown>) => {
          const payload: QueryPayload = {
            type: 'find',
            collection: collectionName,
            filter
          }
          if (projection) {
            payload.projection = projection
          }
          
          capturedPayload = payload
          
          return chainableModifiers(payload)
        },
        aggregate: (pipeline: Array<Record<string, unknown>> = []) => {
          const payload: QueryPayload = {
            type: 'aggregate',
            collection: collectionName,
            pipeline
          }
          
          capturedPayload = payload
          
          return chainableModifiers(payload)
        }
      }
    }
  })

  function chainableModifiers(payload: QueryPayload) {
    const chain = {
      sort: (sortSpec: Record<string, unknown>) => {
        if (payload.type === 'find') {
          payload.sort = sortSpec
        }
        return chain
      },
      limit: (limitValue: number) => {
        if (payload.type === 'find') {
          payload.limit = limitValue
        }
        return chain
      },
      toArray: () => {
        return []
      }
    }
    return chain
  }

  try {
    const runner = new Function('db', code)
    runner(dbProxy)
  } catch (error: any) {
    throw new Error(`Syntax Error: ${error.message || 'Invalid JavaScript code'}`)
  }

  if (!capturedPayload) {
    throw new Error('No valid MongoDB command detected. Make sure to use db.collection.find() or db.collection.aggregate().')
  }

  return capturedPayload
}
