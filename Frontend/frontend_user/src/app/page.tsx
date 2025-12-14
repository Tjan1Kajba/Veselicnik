
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    // Placeholder: check for auth token in localStorage
    const isLoggedIn = typeof window !== "undefined" && localStorage.getItem("authToken");
    if (!isLoggedIn) {
      router.replace("/login");
    }
    // else, stay on home page
  }, [router]);

  // Optionally, show a loading spinner or nothing while redirecting
  return null;
}
