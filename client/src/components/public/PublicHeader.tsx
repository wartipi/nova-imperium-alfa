import { Link, useLocation } from "wouter";
import { useAuth } from "../../lib/auth/AuthContext";

export function PublicHeader() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();

  return (
    <header className="ni-header">
      <div className="ni-container">
        <div className="ni-header-inner">
          <Link href="/" className="ni-logo">
            <div className="ni-logo-emblem">⚜</div>
            <div className="ni-logo-text">
              <span className="ni-logo-name">Nova Imperium</span>
              <span className="ni-logo-sub">Stratégie · Commerce · Conquête</span>
            </div>
          </Link>

          <nav>
            <ul className="ni-nav">
              <li><Link href="/" className={location === "/" ? "active" : ""}>Accueil</Link></li>
              <li><a href="#monde">Le Monde</a></li>
              <li><a href="#fonctionnalites">Fonctionnalités</a></li>
              {isAuthenticated ? (
                <li><Link href="/game">Jouer</Link></li>
              ) : (
                <li><Link href="/game" className={location === "/game" ? "active" : ""}>Connexion</Link></li>
              )}
            </ul>
          </nav>

          <Link href="/register" className="ni-btn-primary" style={{ fontSize: '0.7rem', padding: '0.55rem 1.2rem' }}>
            Créer un compte
          </Link>
        </div>
      </div>
      <hr className="ni-divider" style={{ margin: 0 }} />
    </header>
  );
}
