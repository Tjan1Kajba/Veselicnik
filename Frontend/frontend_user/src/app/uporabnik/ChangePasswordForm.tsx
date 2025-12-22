"use client";
import React, { useState } from "react";

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
      setError("Vsa polja so obvezna");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Novo geslo in potrditev gesla se ne ujemata");
      return;
    }

    if (newPassword.length < 4) {
      // Changed from 6 to 4 to match backend
      setError("Novo geslo mora biti vsaj 4 znake dolgo");
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
        const errorData = await res.json();
        console.log("Error response:", errorData); // For debugging

        // Check if it's a validation error
        if (res.status === 422) {
          // Handle Pydantic validation errors
          if (errorData.detail && Array.isArray(errorData.detail)) {
            const errorMessages = errorData.detail.map(
              (err: any) =>
                `${err.loc ? err.loc.join(".") + ": " : ""}${err.msg}`
            );
            throw new Error(errorMessages.join(", "));
          }
          throw new Error(errorData.detail || "Napaka pri validaciji podatkov");
        }

        throw new Error(errorData.detail || "Napaka pri spremembi gesla");
      }

      const data = await res.json();
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      onSuccess();
    } catch (err: any) {
      console.error("Error changing password:", err);
      setError(err.message || "Napaka pri spremembi gesla");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24, maxWidth: 400 }}>
      <h2>Spremeni geslo</h2>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4 }}>
          Novo geslo:{" "}
        </label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ width: "100%", padding: 8 }}
          disabled={loading}
          placeholder="Vsaj 4 znake"
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4 }}>
          Potrdi novo geslo:{" "}
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ width: "100%", padding: 8 }}
          disabled={loading}
          placeholder="Ponovite geslo"
        />
      </div>

      <button
        type="submit"
        style={{
          padding: "8px 16px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "not-allowed" : "pointer",
        }}
        disabled={loading}
      >
        {loading ? "Nalagam..." : "Spremeni geslo"}
      </button>

      {success && (
        <div
          style={{
            color: "green",
            marginTop: 12,
            padding: 8,
            backgroundColor: "#f0fff0",
            borderRadius: 4,
          }}
        >
          ✓ Geslo uspešno spremenjeno!
        </div>
      )}
      {error && (
        <div
          style={{
            color: "red",
            marginTop: 12,
            padding: 8,
            backgroundColor: "#fff0f0",
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}
    </form>
  );
};

export default ChangePasswordForm;
