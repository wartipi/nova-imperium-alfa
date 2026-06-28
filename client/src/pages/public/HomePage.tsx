import { Link } from "wouter";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";
import "../../styles/public-theme.css";

const PILLARS = [
  {
    icon: "🗺️",
    title: "Carte Hexagonale",
    desc: "Explorez un monde persistant composé de milliers d'hexagones générés procéduralement. Forêts, montagnes, plaines — chaque case est unique.",
  },
  {
    icon: "⚔️",
    title: "Serveur Autoritaire",
    desc: "Toutes les actions sont validées côté serveur. Pas de triche possible. Combats, déplacements et économie respectent des règles strictes.",
  },
  {
    icon: "🏛️",
    title: "Commerce & Marché",
    desc: "Fondez des villes, gérez leur trésor, passez des ordres sur le marché public. L'économie de jeu est entièrement pilotée par les joueurs.",
  },
  {
    icon: "⚜️",
    title: "Factions & Alliances",
    desc: "Formez des alliances, rédigez des traités, déclarez la guerre. Le destin de votre empire se joue autant dans la diplomatie que sur le champ de bataille.",
  },
];

const FEATURES = [
  {
    icon: "🌍",
    title: "Explorer",
    desc: "Parcourez la carte hexagonale, découvrez des ressources cachées, et étendez votre territoire au-delà de vos frontières actuelles.",
    detail: "Déplacements en temps réel · Zones de ressources · Brouillard de guerre",
  },
  {
    icon: "📊",
    title: "Maîtriser",
    desc: "Développez un arbre de compétences unique, montez en niveau, et devenez une référence dans votre domaine — commerce, combat ou diplomatie.",
    detail: "Arbre de compétences · Points d'action · Réputation par faction",
  },
  {
    icon: "🏗️",
    title: "Bâtir",
    desc: "Fondez des villes, lancez des chantiers de construction, approvisionnez vos entrepôts. Chaque décision économique a un impact durable.",
    detail: "Fondation de cités · Bâtiments · Trésor municipal",
  },
];

const WHY_ITEMS = [
  "Monde persistant — vos actions ont des conséquences durables",
  "Économie entièrement gérée par les joueurs",
  "Politique et diplomatie au cœur du jeu",
  "Pas de pay-to-win — compétences et stratégie priment",
  "Mises à jour régulières et feuille de route publique",
  "Communauté francophone active",
];

export default function HomePage() {
  return (
    <div className="public-root">
      <PublicHeader />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="ni-hero">
        <div className="ni-container">
          <div className="ni-hero-content">
            <p className="ni-hero-kicker">Jeu de Stratégie Médiéval-Fantastique</p>

            <h1 className="ni-title-xl" style={{ marginBottom: '1.2rem' }}>
              Forgez Votre Histoire<br />Sur la Carte du Monde
            </h1>

            <div className="ni-divider-sm" style={{ marginBottom: '1.4rem', background: 'var(--ni-gold)' }} />

            <p style={{ fontSize: '1.2rem', color: 'var(--ni-text)', maxWidth: '560px', lineHeight: 1.7, fontStyle: 'italic' }}>
              Entrez dans un monde médiéval-fantastique persistant où vos décisions forgent l'histoire.
              Commercez, conquérez, bâtissez — chaque action compte.
            </p>

            <div className="ni-hero-ctas">
              <Link href="/register" className="ni-btn-primary" style={{ fontSize: '0.82rem', padding: '0.85rem 2rem' }}>
                ⚜ Rejoindre l'Empire
              </Link>
              <a href="#fonctionnalites" className="ni-btn-secondary" style={{ fontSize: '0.82rem', padding: '0.82rem 1.8rem' }}>
                Découvrir le Jeu
              </a>
            </div>

            <div style={{ marginTop: '2.4rem', display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              {[["∞", "Monde Persistant"], ["3", "Comptes Actifs"], ["100+", "Hexagones Explorés"]].map(([val, label]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span style={{ fontFamily: 'var(--ni-font-heading)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--ni-gold-light)' }}>{val}</span>
                  <span className="ni-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillar cards ───────────────────────────────────────────────────── */}
      <section className="ni-section ni-section-darker" id="monde">
        <div className="ni-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="ni-label" style={{ marginBottom: '0.6rem' }}>Les Quatre Piliers</p>
            <h2 className="ni-title-lg">Un Monde Vivant, des Règles Robustes</h2>
            <div className="ni-divider" style={{ maxWidth: '240px', margin: '1rem auto 0' }} />
          </div>

          <div className="ni-pillars">
            {PILLARS.map((p) => (
              <div key={p.title} className="ni-panel ni-pillar-card">
                <div className="ni-icon-box">{p.icon}</div>
                <h3 className="ni-title-md">{p.title}</h3>
                <p style={{ fontSize: '0.98rem', color: 'var(--ni-text-dim)', lineHeight: 1.65, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preview ─────────────────────────────────────────────────────────── */}
      <section className="ni-section ni-section-mid" id="apercu">
        <div className="ni-container">
          <div className="ni-preview-grid">
            <div className="ni-preview-mock">
              <img src="/nova-hero.png" alt="Aperçu de l'interface de jeu Nova Imperium" style={{ filter: 'saturate(0.8) brightness(0.9)' }} />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(transparent, rgba(10,5,2,0.95))',
                padding: '1.5rem 1rem 1rem',
              }}>
                <span className="ni-label">Interface de jeu</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', justifyContent: 'center' }}>
              <div>
                <p className="ni-label" style={{ marginBottom: '0.5rem' }}>Aperçu du Jeu</p>
                <h2 className="ni-title-lg" style={{ fontSize: '1.6rem', marginBottom: '0.8rem' }}>
                  Une Interface Taillée pour la Stratégie
                </h2>
                <div className="ni-divider-sm" style={{ marginBottom: '1rem' }} />
              </div>

              {[
                { icon: "📍", title: "HUD Médiéval Unifié", desc: "Tous vos panneaux de gestion dans une interface claire : inventaire, trésor, actions, commerce." },
                { icon: "🗺️", title: "Carte Interactive", desc: "Naviguez sur la carte hexagonale, cliquez sur chaque case pour en découvrir le contenu et les ressources." },
                { icon: "⚡", title: "Actions en Temps Réel", desc: "Déplacements, récoltes, transferts — chaque action est validée en temps réel côté serveur." },
              ].map((item) => (
                <div key={item.title} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div className="ni-icon-box" style={{ width: '36px', height: '36px', fontSize: '1rem', flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <p className="ni-title-md" style={{ marginBottom: '0.25rem', fontSize: '0.88rem' }}>{item.title}</p>
                    <p style={{ fontSize: '0.95rem', color: 'var(--ni-text-dim)', margin: 0, lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                </div>
              ))}

              <Link href="/register" className="ni-btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                Commencer à Jouer →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="ni-section ni-section-darker" id="fonctionnalites">
        <div className="ni-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p className="ni-label" style={{ marginBottom: '0.6rem' }}>Ce Que Vous Faites</p>
            <h2 className="ni-title-lg">Explorer · Maîtriser · Bâtir</h2>
            <div className="ni-divider" style={{ maxWidth: '200px', margin: '1rem auto 0' }} />
          </div>

          <div className="ni-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="ni-panel ni-feature-item">
                <div style={{ fontSize: '2rem', lineHeight: 1 }}>{f.icon}</div>
                <h3 className="ni-title-lg" style={{ fontSize: '1.3rem' }}>{f.title}</h3>
                <div className="ni-divider-sm" />
                <p style={{ fontSize: '1rem', color: 'var(--ni-text)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--ni-text-dim)', fontFamily: 'var(--ni-font-heading)', letterSpacing: '0.06em', margin: 0 }}>
                  {f.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ──────────────────────────────────────────────────────────────── */}
      <section className="ni-section ni-section-mid">
        <div className="ni-container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <div>
              <p className="ni-label" style={{ marginBottom: '0.6rem' }}>Pourquoi Nous Choisir</p>
              <h2 className="ni-title-lg" style={{ marginBottom: '1rem' }}>
                Pourquoi Nova Imperium ?
              </h2>
              <div className="ni-divider-sm" style={{ marginBottom: '1.5rem' }} />
              <p style={{ fontSize: '1.05rem', color: 'var(--ni-text-dim)', lineHeight: 1.75, marginBottom: '1.5rem' }}>
                Nova Imperium n'est pas un énième jeu de stratégie. C'est un monde vivant où chaque décision a un impact durable — économique, politique et militaire.
              </p>
              <Link href="/register" className="ni-btn-primary">⚜ Rejoindre maintenant</Link>
            </div>

            <div className="ni-why-grid">
              {WHY_ITEMS.map((item) => (
                <div key={item} className="ni-check-item">
                  <span className="ni-check-icon">◆</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────────────────────── */}
      <section className="ni-section ni-section-darker">
        <div className="ni-container">
          <div className="ni-cta-box">
            <p className="ni-label" style={{ marginBottom: '0.8rem' }}>Prêt à Forger votre Destin ?</p>
            <h2 className="ni-title-lg" style={{ marginBottom: '0.6rem', fontSize: '1.8rem' }}>
              Rejoignez l'Empire Maintenant
            </h2>
            <div className="ni-divider" style={{ maxWidth: '180px', margin: '0.8rem auto 1.2rem' }} />
            <p style={{ fontSize: '1.05rem', color: 'var(--ni-text-dim)', marginBottom: '2rem', maxWidth: '460px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
              Créez votre compte gratuitement et commencez votre conquête dès aujourd'hui. Le monde attend son prochain Imperator.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/register" className="ni-btn-primary" style={{ fontSize: '0.85rem', padding: '0.85rem 2.2rem' }}>
                ⚜ Créer mon Compte
              </Link>
              <Link href="/game" className="ni-btn-secondary" style={{ fontSize: '0.82rem' }}>
                Se Connecter
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
