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
    <main className="app">
      <section className="login">
        <h1>💬 Poknex</h1>
        <p>
          {mode === "login"
            ? "Entre na sua conta para conversar em tempo real."
            : "Crie sua conta para começar a usar o Poknex."}
        </p>
        {error && <div className="status disconnected">🔴 {error}</div>}

        <form className="login-form" onSubmit={submit}>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            minLength={3}
            maxLength={20}
            autoFocus
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="Senha"
            minLength={8}
            maxLength={128}
          />
          <button type="submit" disabled={loading}>
            {loading
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <button className="auth-switch" type="button" onClick={switchMode}>
          {mode === "login"
            ? "Ainda não tenho uma conta"
            : "Já tenho uma conta"}
        </button>
      </section>
    </main>
  );
}
