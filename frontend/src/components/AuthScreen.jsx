import { useState } from "react";
import { login, register } from "../services/auth";

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const currentUser =
        mode === "login"
          ? await login(username, password)
          : await register(username, password);
      onAuthenticated(currentUser);
    } catch (requestError) {
      setError(requestError.message || "Não foi possível autenticar.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "register" : "login"));
    setError("");
  }

  return (
    <main className="app auth-page">
      <section className="login">
        <div className="auth-brand">
          <img src="/icone.png?v=2" alt="" />
          <div className="auth-brand-copy">
            <div className="auth-kicker">CONEXÃO PRIVADA</div>
            <h1>Pokinex</h1>
            <span>Comunicação em tempo real</span>
          </div>
        </div>

        <div className="auth-intro">
          <span className="auth-status-dot" />
          <p>
            {mode === "login"
              ? "Entre e continue sua conversa de onde parou."
              : "Crie sua conta e entre na conversa."}
          </p>
        </div>

        {error && <div className="status disconnected">🔴 {error}</div>}

        <form className="login-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Seu username"
              minLength={3}
              maxLength={20}
              autoComplete="username"
              autoFocus
            />
          </label>

          <label className="auth-field">
            <span>Senha</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Sua senha"
              minLength={8}
              maxLength={128}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          <button className="auth-submit" type="submit" disabled={loading}>
            <span>{loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <small>{mode === "login" ? "Primeiro acesso?" : "Já possui uma conta?"}</small>
          <span />
        </div>

        <button className="auth-switch" type="button" onClick={switchMode}>
          {mode === "login" ? "Criar uma conta" : "Voltar para entrar"}
        </button>

        <div className="auth-footer">
          <span>Pokinex</span>
          <span aria-hidden="true">•</span>
          <span>WebSocket</span>
          <span aria-hidden="true">•</span>
          <span>Tempo real</span>
        </div>
      </section>
    </main>
  );
}
