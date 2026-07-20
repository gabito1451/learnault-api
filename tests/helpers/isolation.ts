import type { PrismaClient } from '@prisma/client'

export interface IsolatedTestContext {
  prisma: PrismaClient
  rollback: () => Promise<void>
}

export async function withIsolation<T>(
  prisma: PrismaClient,
  fn: (ctx: IsolatedTestContext) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const ctx: IsolatedTestContext = {
      prisma: tx as unknown as PrismaClient,
      rollback: async () => {
        throw new IsolatedTestRollback()
      },
    }
    try {
      return await fn(ctx)
    } catch (err) {
      if (err instanceof IsolatedTestRollback) {
        return undefined as T
      }
      throw err
    }
  })
}

class IsolatedTestRollback extends Error {
  constructor() {
    super('Isolated test rollback')
    this.name = 'IsolatedTestRollback'
  }
}

export function createIsolatedTest(
  prisma: PrismaClient,
  fn: (ctx: IsolatedTestContext) => Promise<void>,
): () => Promise<void> {
  return async () => {
    await withIsolation(prisma, fn)
  }
}
