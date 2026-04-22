import { Link } from "wouter";

export function PublicFooter() {
  return (
    <footer className="ni-footer">
      <div className="ni-container">
        <ul className="ni-footer-links">
          <li><Link href="/">Accueil</Link></li>
          <li><a href="#monde">Le Monde</a></li>
          <li><a href="#fonctionnalites">Fonctionnalités</a></li>
          <li><Link href="/register">Créer un compte</Link></li>
          <li><Link href="/game">Se connecter</Link></li>
        </ul>
        <hr className="ni-divider" style={{ maxWidth: '200px', margin: '0 auto 1.2rem' }} />
        <p style={{ fontSize: '0.78rem', color: 'var(--ni-text-dim)', fontFamily: 'var(--ni-font-heading)', letterSpacing: '0.12em', margin: 0 }}>
          © 2025 Nova Imperium. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
