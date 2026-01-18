"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser,
  FaSignOutAlt,
  FaGift,
  FaTrophy,
  FaExclamationTriangle,
} from "react-icons/fa";
import UserSidebar from "../../components/UserSidebar";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, Draw, Prize, Veselica, UserResponse } from "../../types";

const MyPrizesPage = () => {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userPrizes, setUserPrizes] = useState<{ prize: Prize; draw: Draw; winner: any; veselica?: Veselica }[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);

  const fetchUser = () => {
    setLoading(true);
    fetch("http://localhost:8002/uporabnik/prijavljen", {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Neuspešno pridobivanje podatkov o uporabniku.");
        }
        const data = await res.json();

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
        setAccessToken(data.access_token || null);
      })
      .catch((err) => {
        setError(err.message);
        showToast(err.message, "error");
        router.push("/login");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchUserPrizes();
    }
  }, [user]);

  const fetchUserPrizes = async () => {
    if (!user) return;

    setLoadingPrizes(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // Fetch all draws
      const drawsRes = await fetch("http://localhost:9001/draws", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!drawsRes.ok) {
        throw new Error("Neuspešno pridobivanje žrebanj.");
      }

      const draws: Draw[] = await drawsRes.json();

      // Filter winners for current user
      const userWins = [];
      for (const draw of draws) {
        for (const winner of draw.winners) {
          if (winner.userId === user.id) {
            userWins.push({ winner, draw });
          }
        }
      }

      // Fetch all prizes first
      const allPrizesRes = await fetch("http://localhost:9001/prizes", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!allPrizesRes.ok) {
        throw new Error("Neuspešno pridobivanje nagrad.");
      }

      const allPrizes: Prize[] = await allPrizesRes.json();

      // Process each win
      const prizesPromises = userWins.map(async ({ winner, draw }) => {
        // Find the prize for this winner
        const prize = allPrizes.find(p => p._id === winner.prizeId);

        if (prize) {
          // Fetch veselica details
          const veselicaRes = await fetch(`http://localhost:8002/veselice/${draw.veselica_id}`, {
            method: "GET",
            headers,
            credentials: "include",
          });

          let veselica: Veselica | undefined;
          if (veselicaRes.ok) {
            veselica = await veselicaRes.json();
          }

          return { prize, draw, winner, veselica };
        }
        return null;
      });

      const prizesResults = await Promise.all(prizesPromises);
      const validPrizes = prizesResults.filter(result => result !== null) as { prize: Prize; draw: Draw; winner: any; veselica?: Veselica }[];

      setUserPrizes(validPrizes);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju nagrad.", "error");
    } finally {
      setLoadingPrizes(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8002/uporabnik/odjava", {
        method: "POST",
        credentials: "include",
      });
      showToast("Uspešno ste se odjavili.", "success");
      router.push("/login");
    } catch (err: any) {
      showToast(err.message || "Napaka pri odjavi.", "error");
    }
  };

  if (loading || loadingPrizes) {
    return (
      <div className="modern-loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-text">Nalagam podatke...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="modern-dashboard">
        <UserSidebar user={user || { id: "", username: "", email: "" }} handleLogout={handleLogout} activeItem="nagrade" />
        <div className="modern-main">
          <div className="modern-error">
            <div className="error-icon">
              <FaExclamationTriangle size={40} />
            </div>
            <h3 className="error-title">Napaka</h3>
            <p className="error-message">
              {error || "Napaka pri nalaganju podatkov."}
            </p>
            <button
              onClick={() => router.push("/uporabnik")}
              className="retry-button"
            >
              Poskusi znova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard">
      <UserSidebar user={user} handleLogout={handleLogout} activeItem="nagrade" />

      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Moje nagrade</h1>
        </header>

        <div className="main-content">
          {userPrizes.length === 0 ? (
            <div className="profile-card">
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <FaGift size={48} color="var(--color-text-light)" />
                </div>
                <h3 style={{ color: "var(--color-text-light)", marginBottom: "0.5rem" }}>
                  Še niste zmagali nobene nagrade
                </h3>
                <p style={{ color: "var(--color-text-light)" }}>
                  Sreče pri naslednjem žrebanju! Kupite srečke in poskusite znova.
                </p>
              </div>
            </div>
          ) : (
            <div className="profile-card">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaGift size={20} />
                  </span>
                  Vaše nagrade
                </h2>
                <span className="section-badge">Pregled</span>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "2rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                }}
              >
                {userPrizes.map((item, index) => (
                  <div
                    key={`${item.draw._id}-${index}`}
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      padding: "2rem",
                      border: "1px solid black",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1.5rem",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Decorative elements */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-20px",
                        right: "-20px",
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        background: "var(--color-success)",
                        opacity: 0.1,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-15px",
                        left: "-15px",
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "var(--color-primary)",
                        opacity: 0.1,
                      }}
                    />



                    {/* Prize Name - Prominently displayed */}
                    <div
                      style={{
                        background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        textAlign: "center",
                        color: "white",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <FaGift size={20} />
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, opacity: 0.9 }}>NAGRADA</span>
                      </div>
                      <h3
                        style={{
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          margin: 0,
                          textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                        }}
                      >
                        {item.prize.name}
                      </h3>
                    </div>

                    {/* Prize Details Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          background: "var(--color-bg)",
                          borderRadius: "8px",
                          padding: "1rem",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-light)",
                            margin: "0 0 0.5rem 0",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Verjetnost
                        </p>
                        <p
                          style={{
                            fontSize: "1.25rem",
                            color: "var(--color-text)",
                            margin: 0,
                            fontWeight: 700,
                          }}
                        >
                          {(item.prize.probability * 100).toFixed(1)}%
                        </p>
                      </div>

                      <div
                        style={{
                          background: "var(--color-bg)",
                          borderRadius: "8px",
                          padding: "1rem",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-light)",
                            margin: "0 0 0.5rem 0",
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Zmagovalna srečka
                        </p>
                        <p
                          style={{
                            fontSize: "1rem",
                            color: "var(--color-text)",
                            margin: 0,
                            fontWeight: 600,
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {item.winner.ticketId}
                        </p>
                      </div>
                    </div>

                    {/* Additional Information */}
                    <div
                      style={{
                        background: "var(--color-bg)",
                        borderRadius: "8px",
                        padding: "1rem",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)", fontWeight: 500 }}>
                            Veselica:
                          </span>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-text)", fontWeight: 600 }}>
                            {item.veselica?.ime_veselice || "Neznana veselica"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)", fontWeight: 500 }}>
                            Datum žrebanja:
                          </span>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-text)", fontWeight: 600 }}>
                            {new Date(item.draw.date).toLocaleDateString("sl-SI", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-text-light)", fontWeight: 500 }}>
                            Ustvarjeno:
                          </span>
                          <span style={{ fontSize: "0.875rem", color: "var(--color-text)", fontWeight: 600 }}>
                            {new Date(item.prize.createdAt).toLocaleDateString("sl-SI", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>


                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPrizesPage;
