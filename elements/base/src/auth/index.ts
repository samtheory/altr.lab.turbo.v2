/**
 * Auth stub — session / JWT / provider wiring lands here later.
 */

export type AuthUser = {
  id: string;
  email?: string;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt?: Date;
};

export async function getSession(): Promise<AuthSession | null> {
  return null;
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("[@altr/base/auth] No session — auth not implemented yet.");
  }
  return session;
}
