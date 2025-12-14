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
      <div className="left">
        <div className="big">CUSTOM MINT MAMBO SWITCH</div>
        <div className="desc">
          With thick-lubed custom linear switches combo with a gasket form factor, K689 PRO features cushioned rich linear travel with silky creamy and cozy typing feedback. The brand new upgraded socket is nearly all switches (3/5 pins) compatible.
        </div>
        <div className="specs">
          <div>Actuation Travel<br /><span style={{fontSize:'1.5rem',fontWeight:700}}>2.0±0.5 mm</span></div>
          <div>Actuation Force<br /><span style={{fontSize:'1.5rem',fontWeight:700}}>40±10 gf</span></div>
          <div>Total Travel<br /><span style={{fontSize:'1.5rem',fontWeight:700}}>3.60 mm</span></div>
        </div>
      </div>
      <div className="right">
        <main>
          <h1>Register</h1>
          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <label htmlFor="confirmPassword">Confirm Password</label>
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
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
          <p>Already have an account? <a href="/login">Login</a></p>
        </main>
      </div>
    </div>
  );
}
