import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

const AUTHORIZED_USERS: Record<string, { id: string; password: string; role: string }> = {
  'admin':   { id: 'admin',   password: 'nova2025',     role: 'admin'  },
  'joueur1': { id: 'joueur1', password: 'imperium123',  role: 'player' },
  'maitre':  { id: 'maitre',  password: 'pandem456',    role: 'admin'  },
};

// Cache en mémoire des utilisateurs DB authentifiés — alimenté au login, consulté par SSE (sync).
// Clé : username ; Valeur : plaintext password tel que stocké en DB.
const DB_USERS_CACHE = new Map<string, string>();

// Helper async : cherche username+password dans la table DB users.
// Si trouvé, alimente DB_USERS_CACHE pour les usages synchrones (SSE).
async function lookupDBUser(
  username: string,
  password: string,
): Promise<{ id: string; username: string; role: string } | null> {
  try {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (rows.length === 0) return null;
    if (rows[0].password !== password) return null;
    DB_USERS_CACHE.set(username, password);
    return { id: username, username, role: 'player' };
  } catch {
    return null;
  }
}

// Middleware d'authentification obligatoire.
// Vérifie d'abord AUTHORIZED_USERS, puis la DB si non trouvé.
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [rawUsername, password] = decoded.split(':');
    const username = rawUsername?.toLowerCase();

    // 1. Comptes hardcodés — chemin inchangé
    const hardcoded = AUTHORIZED_USERS[username];
    if (hardcoded && hardcoded.password === password) {
      req.user = { id: hardcoded.id, username, role: hardcoded.role };
      return next();
    }

    // 2. Fallback DB
    const dbUser = await lookupDBUser(username, password);
    if (dbUser) {
      req.user = dbUser;
      return next();
    }

    return res.status(401).json({ error: 'Identifiants invalides' });
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Middleware d'authentification optionnelle — ne bloque pas si absent.
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [rawUsername, password] = decoded.split(':');
      const username = rawUsername?.toLowerCase();

      // 1. Comptes hardcodés
      const hardcoded = AUTHORIZED_USERS[username];
      if (hardcoded && hardcoded.password === password) {
        req.user = { id: hardcoded.id, username, role: hardcoded.role };
      } else {
        // 2. Fallback DB
        const dbUser = await lookupDBUser(username, password);
        if (dbUser) req.user = dbUser;
      }
    } catch {
      // Ignore — auth optionnelle
    }
  }

  next();
}

// Endpoint de connexion.
// Vérifie d'abord AUTHORIZED_USERS, puis DB. Format token inchangé : base64(username:password).
export async function loginEndpoint(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  const uname = username.toLowerCase();

  // 1. Comptes hardcodés
  const hardcoded = AUTHORIZED_USERS[uname];
  if (hardcoded && hardcoded.password === password) {
    const token = Buffer.from(`${uname}:${password}`).toString('base64');
    return res.json({
      success: true,
      token,
      user: { id: hardcoded.id, username: uname, role: hardcoded.role },
    });
  }

  // 2. Fallback DB
  const dbUser = await lookupDBUser(uname, password);
  if (dbUser) {
    const token = Buffer.from(`${uname}:${password}`).toString('base64');
    return res.json({ success: true, token, user: dbUser });
  }

  return res.status(401).json({ error: 'Identifiants incorrects' });
}

// ─── getUserFromBearerToken ────────────────────────────────────────────────────
// Fonction synchrone — usage exclusif : route SSE marché (EventSource ne supporte
// pas les headers custom). Consulte AUTHORIZED_USERS puis DB_USERS_CACHE.
// Le cache est alimenté à chaque login réussi d'un utilisateur DB.
// Ne jamais loguer le token brut.
export function getUserFromBearerToken(
  token: string,
): { id: string; username: string; role: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [rawUsername, password] = decoded.split(':');
    const username = rawUsername?.toLowerCase();

    // 1. Comptes hardcodés
    const hardcoded = AUTHORIZED_USERS[username];
    if (hardcoded && hardcoded.password === password) {
      return { id: hardcoded.id, username, role: hardcoded.role };
    }

    // 2. Cache DB (alimenté lors du login)
    const cached = DB_USERS_CACHE.get(username);
    if (cached !== undefined && cached === password) {
      return { id: username, username, role: 'player' };
    }

    return null;
  } catch {
    return null;
  }
}

export { AUTHORIZED_USERS };
