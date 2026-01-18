"use client";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import AdminNavigation from "./AdminNavigation";
import UserNavigation from "./UserNavigation";
import { UserData, UserResponse } from "../types";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Hide nav on login/register
  if (pathname?.startsWith("/login") || pathname?.startsWith("/register"))
    return null;

  useEffect(() => {
    // Fetch user data to check admin status
    fetch("http://localhost:8002/uporabnik/prijavljen", {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data: UserResponse = await res.json();

        let userData: UserData;
        if (data.user) {
          userData = data.user;
        } else {
          const {
            access_token,
            refresh_token,
            token_type,
            expires_in,
            ...userDataRest
          } = data;
          userData = userDataRest as UserData;
        }

        setUser(userData);
      })
      .catch(() => {
        // Silently fail - user might not be logged in
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("http://localhost:8002/uporabnik/odjava", {
      method: "POST",
      credentials: "include",
    });
    router.push("/login");
  };

  if (!loading && user?.tip_uporabnika === "admin") {
    return <AdminNavigation handleLogout={handleLogout} />;
  } else {
    return <UserNavigation user={user} loading={loading} handleLogout={handleLogout} />;
  }
}
