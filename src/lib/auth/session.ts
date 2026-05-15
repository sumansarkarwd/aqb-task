export interface Session {
  userId: string
  email: string
  role: 'admin' | 'finance' | 'viewer'
}

/**
 * Stub session for local testing. Set MOCK_AUTH=false to simulate unauthenticated requests.
 */
export async function getSession(): Promise<Session | null> {
  if (process.env.MOCK_AUTH === 'false') {
    return null
  }

  return {
    userId: 'dev-user-1',
    email: 'finance@fintrack.local',
    role: 'finance',
  }
}
