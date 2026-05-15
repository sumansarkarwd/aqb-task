import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'drizzle-kit'

function resolveDbPath(): string {
  const url = process.env.DATABASE_URL ?? './data/fintrack.db'
  const dbPath = path.isAbsolute(url) ? url : path.join(process.cwd(), url)
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  return dbPath
}

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolveDbPath(),
  },
})
