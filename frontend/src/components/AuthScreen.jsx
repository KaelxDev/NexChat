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
      const currentUser = mode === "login" ? await login(username, password) : await register(username, password);
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
          <img src="/icone.png?v=2" alt="Pokinex" />
          <div className="auth-brand-copy">
            <div className="auth-kicker">POKINEX // PRIVATE SIGNAL</div>
            <h1>Pokinex</h1>
            <span>Conversa direta. Sinal em tempo real.</span>
          </div>
        </div>

        <div className="auth-intro">
          <span className="auth-status-dot" />
          <p>{mode === "login" ? "Entre e retome sua conversa." : "Crie sua identidade na rede."}</p>
        </div>

        {error && <div className="status disconnected">{error}</div>}

        <form className="login-form" onSubmit={submit}>
          <label className="auth-field">
            <span>Identificador</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Seu username" minLength={3} maxLength={20} autoComplete="username" autoFocus />
          </label>
          <label className="auth-field">
            <span>Chave de acesso</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Sua senha" minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          <button className="auth-submit" type="submit" disabled={loading}>
            <span>{loading ? "Sincronizando..." : mode === "login" ? "Entrar na rede" : "Criar identidade"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="auth-divider"><span /><small>{mode === "login" ? "Novo na rede?" : "Já possui identidade?"}</small><span /></div>
        <button className="auth-switch" type="button" onClick={switchMode}>{mode === "login" ? "Criar uma conta" : "Voltar para entrar"}</button>
        <div className="auth-footer"><span>PKX / 01</span><span aria-hidden="true">•</span><span>WEBSOCKET</span><span aria-hidden="true">•</span><span>REALTIME</span></div>
      </section>
    </main>
  );
}
