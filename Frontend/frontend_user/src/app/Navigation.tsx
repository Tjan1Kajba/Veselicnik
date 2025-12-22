"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  // Hide nav on login/register
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) return null;

  const handleLogout = async () => {
    await fetch('/uporabnik/odjava', { method: 'POST', credentials: 'include' });
    router.push('/login');
  };

  return (
    <nav style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
      <Link href="/">Domov</Link>
      <Link href="/uporabnik">Profil</Link>
      {/* Add more links as needed */}
      <button onClick={handleLogout}>Odjava</button>
    </nav>
  );
}