"use client";
import React, { useState } from "react";
import { showToast } from "../utils/toast";

interface ChangePasswordFormProps {
  onSuccess: () => void;
}

const ChangePasswordForm: React.FC<ChangePasswordFormProps> = ({
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Frontend validation
    if (!newPassword.trim() || !confirmPassword.trim()) {
      const msg = "Vsa polja so obvezna";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = "Novo geslo in potrditev gesla se ne ujemata";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    if (newPassword.length < 4) {
      // Changed from 6 to 4 to match backend
      const msg = "Novo geslo mora biti vsaj 4 znake dolgo";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "http://localhost:8002/uporabnik/posodobi-uporabnika/spremeni-geslo",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            novo_geslo: newPassword,
            ponovitev_novega_gesla: confirmPassword,
          }),
        }
      );

      if (!res.ok) {
        // Try to parse JSON; if it fails (e.g. plain-text 500), fall back to text
        let errorMessage = `Napaka (${res.status}) pri spremembi gesla`;

        try {
          const errorData = await res.json();
          console.log("Error response JSON:", errorData);

          if (res.status === 422) {
            // Handle Pydantic validation errors
            if (errorData.detail && Array.isArray(errorData.detail)) {
              const errorMessages = errorData.detail.map(
                (err: any) =>
                  `${err.loc ? err.loc.join(".") + ": " : ""}${err.msg}`
              );
              throw new Error(errorMessages.join(", "));
            }
            errorMessage =
              errorData.detail || "Napaka pri validaciji podatkov (422)";
          } else {
            errorMessage =
              errorData.detail ||
              errorData.message ||
              `Napaka (${res.status}) pri spremembi gesla`;
          }
        } catch (parseErr) {
          try {
            const text = await res.text();
            console.log("Error response text:", text);
            if (text) {
              errorMessage = text;
            }
          } catch {
            // ignore, keep default message
          }
        }

        throw new Error(errorMessage);
      }

      await res.json();
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      showToast("Geslo je bilo uspešno spremenjeno.", "success");
      onSuccess();
    } catch (err: any) {
      console.error("Error changing password:", err);
      const msg = err.message || "Napaka pri spremembi gesla";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="modern-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <p className="loading-text">
          Izberite novo, varno geslo za svoj račun.
        </p>
      </div>

      <div className="form-grid">
        <div className="input-group">
          <label className="input-label" htmlFor="new-password">
            Novo geslo
          </label>
          <input
            id="new-password"
            type="password"
            className="password-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            placeholder="Vsaj 4 znake"
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="confirm-password">
            Potrdi novo geslo
          </label>
          <input
            id="confirm-password"
            type="password"
            className="password-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            placeholder="Ponovite geslo"
          />
        </div>
      </div>

      <button
        type="submit"
        className="modern-button primary"
        disabled={loading}
      >
        {loading ? "Shranjujem novo geslo..." : "Spremeni geslo"}
      </button>

      {success && (
        <div className="success-banner">
          <div className="success-icon">✓</div>
          <div className="success-content">
            <h4>Geslo uspešno spremenjeno</h4>
            <p>Vaše novo geslo je bilo shranjeno.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="error-banner">
          <div className="error-icon">!</div>
          <div className="error-content">
            <h4>Napaka pri spremembi gesla</h4>
            <p>{error}</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default ChangePasswordForm;
