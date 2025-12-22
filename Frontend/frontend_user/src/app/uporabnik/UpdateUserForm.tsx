"use client";
import React, { useState } from 'react';

interface UpdateUserFormProps {
  onSuccess: () => void;
}

const UpdateUserForm: React.FC<UpdateUserFormProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(
        "http://localhost:8002/uporabnik/posodobi-uporabnika",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username, email }),
        }
      );
      if (!res.ok) throw new Error('Napaka pri posodabljanju.');
      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <h2>Posodobi podatke</h2>
      <div>
        <label>Uporabniško ime: </label>
        <input value={username} onChange={e => setUsername(e.target.value)} />
      </div>
      <div>
        <label>Email: </label>
        <input value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <button type="submit">Posodobi</button>
      {success && <div style={{ color: 'green' }}>Uspešno posodobljeno!</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </form>
  );
};

export default UpdateUserForm;
