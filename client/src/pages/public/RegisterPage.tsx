import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";
import { useAuth } from "../../lib/auth/AuthContext";
import "../../styles/public-theme.css";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (username.trim().length < 3) {
      setStatus("error");
      setMessage("Le nom d'utilisateur doit comporter au moins 3 caractères.");
      return;
    }

    if (password.length < 6) {
      setStatus("error");
      setMessage("Le mot de passe doit comporter au moins 6 caractères.");
      return;
    }

    if (password !== confirm) {
      setStatus("error");
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
      });

      if (res.ok) {
        const ok = await login(username.trim().toLowerCase(), password);
        if (ok) {
          setStatus("success");
          setMessage("Compte créé. Vous êtes connecté — bienvenue dans l'Empire !");
          setTimeout(() => navigate("/game"), 1800);
        } else {
          setStatus("success");
          setMessage("Compte créé avec succès ! Connectez-vous pour jouer.");
          setTimeout(() => navigate("/game"), 2000);
        }
      } else {
        let errMsg = "Erreur lors de la création du compte.";
        try {
          const data = await res.json();
          if (data?.error) errMsg = data.error;
          else if (data?.message) errMsg = data.message;
        } catch {}
        setStatus("error");
        setMessage(errMsg);
      }
    } catch {
      setStatus("error");
      setMessage("Impossible de joindre le serveur. Veuillez réessayer.");
    }
  };

  return (
    <div className="public-root">
      <PublicHeader />

      <section style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        background: `
          linear-gradient(to bottom, rgba(8,4,1,0.92), rgba(5,2,1,0.96)),
          url('/nova-hero.png') center 30% / cover no-repeat
        `,
      }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Panel header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--ni-border-mid)',
              background: 'linear-gradient(135deg, rgba(201,162,39,0.2), rgba(201,162,39,0.05))',
              fontSize: '1.6rem',
            }}>⚜</div>
            <h1 className="ni-title-lg" style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>
              Créer un Compte
            </h1>
            <div className="ni-divider" style={{ maxWidth: '140px', margin: '0.6rem auto' }} />
            <p style={{ fontSize: '0.92rem', color: 'var(--ni-text-dim)' }}>
              Rejoignez le monde de Nova Imperium
            </p>
          </div>

          {/* Form */}
          <div className="ni-panel" style={{ padding: '2rem 2rem' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

              <div className="ni-form-field">
                <label className="ni-form-label">Nom d'utilisateur</label>
                <input
                  type="text"
                  className="ni-form-input"
                  placeholder="ex : valdrick"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                />
              </div>

              <div className="ni-form-field">
                <label className="ni-form-label">Mot de passe</label>
                <input
                  type="password"
                  className="ni-form-input"
                  placeholder="Min. 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div className="ni-form-field">
                <label className="ni-form-label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  className="ni-form-input"
                  placeholder="Répétez le mot de passe"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              {status === "error" && (
                <div className="ni-form-error">{message}</div>
              )}
              {status === "success" && (
                <div className="ni-form-success">{message}</div>
              )}

              <button
                type="submit"
                className="ni-btn-primary"
                disabled={status === "loading" || status === "success"}
                style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.82rem', opacity: status === "loading" ? 0.7 : 1 }}
              >
                {status === "loading" ? "Création en cours…" : "⚜ Créer mon Compte"}
              </button>
            </form>

            <hr className="ni-divider" style={{ margin: '1.5rem 0' }} />

            <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'var(--ni-text-dim)', margin: 0 }}>
              Déjà un compte ?{" "}
              <Link href="/game" style={{ color: 'var(--ni-gold)', textDecoration: 'none', fontFamily: 'var(--ni-font-heading)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
                Se connecter
              </Link>
            </p>
          </div>

          {/* Note auth */}
          <div style={{
            marginTop: '1.2rem',
            padding: '0.8rem 1rem',
            border: '1px solid rgba(201,162,39,0.2)',
            background: 'rgba(201,162,39,0.04)',
          }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--ni-text-dim)', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--ni-gold)', fontFamily: 'var(--ni-font-heading)', fontSize: '0.72rem', letterSpacing: '0.1em' }}>
                NOTE
              </strong>
              {" "}— Nova Imperium est actuellement en accès restreint. L'inscription est soumise à validation par les administrateurs.
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
