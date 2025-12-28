import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const DEV_JWT_SECRET = 'nova-imperium-dev-secret-do-not-use-in-production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.warn('⚠️ JWT_SECRET non défini. Utilisation d\'une clé de développement (non recommandé en production)');
    return DEV_JWT_SECRET;
  }
  return secret;
}

const JWT_EXPIRES_IN = '24h';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export interface JWTPayload {
  id: string;
  username: string;
  role: string;
}

const AUTHORIZED_USERS: Record<string, { id: string; password: string; role: string }> = {
  'admin': { id: 'admin', password: 'nova2025', role: 'admin' },
  'joueur1': { id: 'joueur1', password: 'imperium123', role: 'player' },
  'maitre': { id: 'maitre', password: 'pandem456', role: 'gm' }
};

export function generateToken(user: { id: string; username: string; role: string }): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const token = authHeader.substring(7);
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  req.user = {
    id: decoded.id,
    username: decoded.username,
    role: decoded.role
  };

  next();
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded) {
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role
      };
    }
  }
  
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès non autorisé pour ce rôle' });
    }
    
    next();
  };
}

export function requireOwnership(getResourceOwnerId: (req: AuthRequest) => Promise<string | null>) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }
    
    if (req.user.role === 'admin' || req.user.role === 'gm') {
      return next();
    }
    
    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (ownerId === null) {
        return res.status(404).json({ error: 'Ressource non trouvée' });
      }
      
      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette ressource' });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Erreur de vérification des permissions' });
    }
  };
}

export function loginEndpoint(req: Request, res: Response) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  const user = AUTHORIZED_USERS[username.toLowerCase()];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = generateToken({
    id: user.id,
    username: username.toLowerCase(),
    role: user.role
  });
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: username.toLowerCase(),
      role: user.role
    },
    expiresIn: JWT_EXPIRES_IN
  });
}

export { AUTHORIZED_USERS };
