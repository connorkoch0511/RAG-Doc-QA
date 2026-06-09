import { neon } from '@neondatabase/serverless'

// Neon serverless HTTP client — one round-trip per query, no pooling needed.
// Tagged-template usage parameterizes values safely: sql`select ... where id = ${id}`
export const sql = neon(process.env.DATABASE_URL!)

// pgvector accepts a vector literal as a string: '[0.1,0.2,...]'
export function toVector(values: number[]): string {
  return `[${values.join(',')}]`
}
