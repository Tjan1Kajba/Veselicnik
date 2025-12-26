import Link from "next/link";
import React from "react";

interface UserData {
  id: string;
  username: string;
  email: string;
  tip_uporabnika?: string;
  [key: string]: any;
}

interface UserNavigationProps {
  user: UserData | null;
  loading: boolean;
  handleLogout: () => void;
}

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
