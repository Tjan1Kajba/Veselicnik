/* Stran: /login */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showToast } from "../../utils/toast";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Prijava";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:8002/uporabnik/prijava", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uporabnisko_ime_ali_email: usernameOrEmail,
          geslo: password,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        console.log("Login failed, status:", res.status);
        let errorMsg = "Prijava ni uspela";
        try {
          const data = await res.json();
          console.log("Error response JSON:", data);
          errorMsg =
            data.detail ||
            data.message ||
            (res.status === 401
              ? "Napačni prijavni podatki"
              : "Prijava ni uspela");
        } catch (e) {
          console.log("Failed to parse error JSON:", e);
          // ignore JSON parse errors and use default message
        }

        setError(errorMsg);
        showToast(errorMsg, "error");
      } else {
        console.log("Login success, about to parse JSON");
        // Best-effort JSON parse; don't block redirect on failure
        try {
          const data = await res.json();
          console.log("Success response JSON:", data);
        } catch (e) {
          console.log("Failed to parse success JSON:", e);
        }
        try {
          console.log("Showing success toast");
          showToast("Prijava uspešna. Preusmerjam ...", "success");
        } catch (e) {
          console.log("Toast failed:", e);
          // even if toast fails, still redirect
        }
        console.log("Calling router.push('/uporabnik')");
        // Use Next.js router for client-side navigation
        router.push("/uporabnik");
        console.log("router.push called");
      }
    } catch (err: any) {
      const msg = "Napaka omrežja pri prijavi";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-section">
      <div className="left">
        <div className="left-content-card">
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
      <div className="right">
        <main>
          <h1>Prijava</h1>
          <form onSubmit={handleSubmit}>
            <label htmlFor="usernameOrEmail">
              E-naslov ali uporabniško ime
            </label>
            <input
              id="usernameOrEmail"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              autoComplete="username"
            />
            <label htmlFor="password">Geslo</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <div className="error-message">{error}</div>}
            <button type="submit" disabled={loading}>
              {loading ? "Preverjam podatke..." : "Prijava"}
            </button>
          </form>
          <p>
            Nimate računa? <a href="/register">Registracija</a>
          </p>
        </main>
      </div>
    </div>
  );
}
