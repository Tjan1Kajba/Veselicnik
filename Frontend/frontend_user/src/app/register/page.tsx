"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/uporabnik/registracija", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uporabnisko_ime: username, email, geslo: password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || data.message || "Registration failed");
      } else {
        router.push("/login");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-section">
      <div className="right">
        <main>
          <h1>Register</h1>
          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Uporabniško ime</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <label htmlFor="email">E-naslov</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <label htmlFor="password">Geslo</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <label htmlFor="confirmPassword">Potrdi geslo</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {error && <div className="error-message">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Registriranje..." : "Registriraj se"}
            </button>
          </form>
          <p>Že imate račun? <a href="/login">Prijavite se</a></p>
        </main>
      </div>
      <div className="left">
        <div className="big">VESELIČNIK</div>
          <div className="desc">
            Vaša vse‑v‑enem digitalna rešitev za brezhibno veselico. Planiranje
            dogodka je izziv. Veseličnik pretvori ta izziv v enostavno, gladko
            in zabavno izkušnjo za organizatorje in goste. Ne skrbite več za
            kaos – vse, kar potrebujete, je v eni pametni aplikaciji.
          </div>
          <ul className="feature-list">
            <li>
              <span
                className="feature-dot"
                style={{ background: "#ed8458" }}
              ></span>
              <span role="img" aria-label="food">
                🍔
              </span>
              <span style={{ marginLeft: 8 }}>Naročanje hrane & pijač</span>
            </li>
            <li>
              <span
                className="feature-dot"
                style={{ background: "#ed8458" }}
              ></span>
              <span role="img" aria-label="music">
                🎵
              </span>
              <span style={{ marginLeft: 8 }}>Glasbene želje</span>
            </li>
            <li>
              <span
                className="feature-dot"
                style={{ background: "#ed8458" }}
              ></span>
              <span role="img" aria-label="lottery">
                🎟️
              </span>
              <span style={{ marginLeft: 8 }}>Srečkolov</span>
            </li>
            <li>
              <span
                className="feature-dot"
                style={{ background: "#ed8458" }}
              ></span>
              <span role="img" aria-label="lost-found">
                🧳
              </span>
              <span style={{ marginLeft: 8 }}>Izgubljeno & najdeno</span>
            </li>
          </ul>
    
      </div>
    </div>
  );
}
