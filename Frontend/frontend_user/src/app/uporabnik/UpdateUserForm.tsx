"use client";
import React, { useState } from "react";
import { showToast } from "../utils/toast";

interface UpdateUserFormProps {
  onSuccess: () => void;
}

const UpdateUserForm: React.FC<UpdateUserFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!username.trim() && !email.trim()) {
      const msg = "Vnesite vsaj eno polje za posodobitev.";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setLoading(true);

    try {
      // Build request body with only non-empty fields
      const requestBody: { uporabnisko_ime?: string; email?: string } = {};
      if (username.trim()) {
        requestBody.uporabnisko_ime = username.trim();
      }
      if (email.trim()) {
        requestBody.email = email.trim();
      }

      const res = await fetch(
        "http://localhost:8002/uporabnik/posodobi-uporabnika",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) {
        let msg = "Napaka pri posodabljanju podatkov.";
        try {
          const data = await res.json();
          msg = data.detail || data.message || msg;
        } catch {
          // ignore, keep default
        }
        setError(msg);
        showToast(msg, "error");
        return;
      }

      setSuccess(true);
      setUsername("");
      setEmail("");
      showToast("Podatki so bili uspešno posodobljeni.", "success");
      onSuccess();
    } catch (err: any) {
      const msg = err.message || "Napaka pri posodabljanju podatkov.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="modern-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <p className="form-description">
          Posodobite svoje uporabniško ime ali e-poštni naslov. Pustite polje
          prazno, če ga ne želite spremeniti.
        </p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label" htmlFor="update-username">
            Novo uporabniško ime
          </label>
          <input
            id="update-username"
            type="text"
            className="modern-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            placeholder="Vnesite novo uporabniško ime"
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="update-email">
            Nov e-poštni naslov
          </label>
          <input
            id="update-email"
            type="email"
            className="modern-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            placeholder="Vnesite nov e-poštni naslov"
          />
        </div>
      </div>

      <button
        type="submit"
        className="modern-button primary"
        disabled={loading || (!username.trim() && !email.trim())}
      >
        {loading ? "Shranjujem..." : "Posodobi podatke"}
      </button>

      {success && (
        <div className="success-banner">
          <div className="success-icon">✓</div>
          <div className="success-content">
            <h4>Podatki uspešno posodobljeni</h4>
            <p>Vaši podatki so bili shranjeni.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="error-banner">
          <div className="error-icon">!</div>
          <div className="error-content">
            <h4>Napaka pri posodabljanju</h4>
            <p>{error}</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default UpdateUserForm;
