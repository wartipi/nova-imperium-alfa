import { Request, Response, NextFunction } from 'express';

// Interface pour étendre Express Request avec les données utilisateur
export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

// Utilisateurs autorisés (dans une vraie application, ceci serait dans une base de données)
const AUTHORIZED_USERS = {
  'admin': { id: 'admin', password: 'nova2025', role: 'admin' },
  'joueur1': { id: 'joueur1', password: 'imperium123', role: 'player' },
  'maitre': { id: 'maitre', password: 'pandem456', role: 'gm' }
};

// Middleware pour vérifier l'authentification
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  const token = authHeader.substring(7); // Enlever "Bearer "
  
  try {
    // Dans une vraie application, on vérifierait un JWT token
    // Ici, on fait une vérification simple
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');
    
    const user = AUTHORIZED_USERS[username.toLowerCase()];
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    req.user = {
      id: user.id,
      username: username.toLowerCase()
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

// Middleware pour l'authentification optionnelle (pour les endpoints publics qui peuvent bénéficier d'informations utilisateur)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [username, password] = decoded.split(':');
      
      const user = AUTHORIZED_USERS[username.toLowerCase()];
      if (user && user.password === password) {
        req.user = {
          id: user.id,
          username: username.toLowerCase()
        };
      }
    } catch (error) {
      // Ignore les erreurs d'authentification pour les endpoints optionnels
    }
  }
  
  next();
}

// Endpoint pour la connexion
export function loginEndpoint(req: Request, res: Response) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
  }

  const user = AUTHORIZED_USERS[username.toLowerCase()];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  // Créer un token simple (dans une vraie application, utiliser JWT)
  const token = Buffer.from(`${username.toLowerCase()}:${password}`).toString('base64');
  
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: username.toLowerCase(),
      role: user.role
    }
  });
}

export { AUTHORIZED_USERS };