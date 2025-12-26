import Link from "next/link";
import React from "react";

interface AdminNavigationProps {
  handleLogout: () => void;
}

export default function AdminNavigation({ handleLogout }: AdminNavigationProps) {
  return (
    <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
      <Link href="/">Domov</Link>
      <Link href="/uporabnik">Profil</Link>
      <Link href="/veselice-pregled">Veselice</Link>
      <Link href="/veselice">Upravljanje</Link>
      <button onClick={handleLogout}>Odjava</button>
    </nav>
  );
}
