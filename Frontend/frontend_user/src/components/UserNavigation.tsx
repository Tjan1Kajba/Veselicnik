import Link from "next/link";
import React from "react";
import { UserNavigationProps } from "../types";

export default function UserNavigation({ user, loading, handleLogout }: UserNavigationProps) {
  return (
    <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
      <Link href="/">Domov</Link>
      <Link href="/uporabnik">Profil</Link>
      {!loading && user && <Link href="/veselice-pregled">Veselice</Link>}
      <button onClick={handleLogout}>Odjava</button>
    </nav>
  );
}
