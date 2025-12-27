"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser,
  FaSignOutAlt,
  FaMusic,
  FaHeart,
  FaTrash,
  FaRedo,
  FaTrophy,
} from "react-icons/fa";
import AdminSidebar from "../../components/AdminSidebar";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, UserResponse, MusicRequest } from "../../types";

const GlasbaAdminPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Music data
  const [topRequests, setTopRequests] = useState<MusicRequest[]>([]);
  const [allRequests, setAllRequests] = useState<MusicRequest[]>([]);
  const [veselice, setVeselice] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const fetchUser = () => {
    setLoading(true);
    fetch("http://localhost:8002/uporabnik/prijavljen", {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Neuspešno pridobivanje podatkov o uporabniku.");
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

        // Check if user is admin
        if (userData.tip_uporabnika !== "admin") {
          router.push("/uporabnik");
          return;
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
    if (user && user.tip_uporabnika === "admin") {
      fetchMusicData();
    }
  }, [user]);

  const fetchMusicData = async () => {
    setLoadingRequests(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // Fetch veselice data
      const veseliceRes = await fetch("http://localhost:8002/veselice", {
        method: "GET",
        credentials: "include",
      });

      if (veseliceRes.ok) {
        const veseliceData = await veseliceRes.json();
        setVeselice(veseliceData);
      }

      // Fetch top requests
      const topRes = await fetch("http://localhost:8004/music/requests/top?limit=10", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!topRes.ok) {
        throw new Error("Neuspešno pridobivanje najboljših glasbenih želja.");
      }

      const topData: MusicRequest[] = await topRes.json();
      setTopRequests(topData);

      // Fetch all requests
      const allRes = await fetch("http://localhost:8004/music/requests", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!allRes.ok) {
        throw new Error("Neuspešno pridobivanje vseh glasbenih želja.");
      }

      const allData: MusicRequest[] = await allRes.json();
      setAllRequests(allData);
    } catch (err: any) {
      const errorMessage = err.message || err.detail || err.error || "Napaka pri pridobivanju glasbenih želja.";
      showToast(typeof errorMessage === 'string' ? errorMessage : "Napaka pri pridobivanju glasbenih želja.", "error");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Ali ste prepričani, da želite izbrisati to glasbeno željo?")) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8004/music/requests/${encodeURIComponent(requestId)}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || errorData.error || "Napaka pri brisanju glasbene želje.";
        throw new Error(typeof errorMessage === 'string' ? errorMessage : "Napaka pri brisanju glasbene želje.");
      }

      showToast("Glasbena želja uspešno izbrisana!", "success");
      fetchMusicData(); // Refresh the data
    } catch (err: any) {
      showToast(err.message || "Napaka pri brisanju glasbene želje.", "error");
    }
  };

  const handleResetVotes = async (requestId: string) => {
    if (!confirm("Ali ste prepričani, da želite ponastaviti glasove za to glasbeno željo?")) {
      return;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8004/music/requests/${encodeURIComponent(requestId)}/reset_votes`, {
        method: "PUT",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || errorData.error || "Napaka pri ponastavitvi glasov.";
        throw new Error(typeof errorMessage === 'string' ? errorMessage : "Napaka pri ponastavitvi glasov.");
      }

      showToast("Glasovi uspešno ponastavljeni!", "success");
      fetchMusicData(); // Refresh the data
    } catch (err: any) {
      showToast(err.message || "Napaka pri ponastavitvi glasov.", "error");
    }
  };

  const handleLogout = () => {
    fetch("http://localhost:8002/uporabnik/odjava", {
      method: "POST",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Odjava ni uspela.");
        }
        showToast("Uspešno ste se odjavili.", "success");
        router.push("/");
      })
      .catch((err) => {
        showToast(err.message || "Napaka pri odjavi.", "error");
      });
  };

  // Group requests by veselica
  const groupedRequests = allRequests.reduce((groups, request) => {
    const veselicaId = request.id_veselica || "unknown";
    if (!groups[veselicaId]) {
      groups[veselicaId] = [];
    }
    groups[veselicaId].push(request);
    return groups;
  }, {} as Record<string, MusicRequest[]>);

  // Helper function to get veselica name by ID
  const getVeselicaName = (veselicaId: string) => {
    const veselica = veselice.find(v => v.id === veselicaId);
    return veselica ? veselica.ime_veselice : `Veselica: ${veselicaId}`;
  };

  if (loading)
    return (
      <div className="modern-loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-text">Nalagam podatke...</p>
      </div>
    );

  if (error || !user)
    return (
      <div className="modern-dashboard">
        <AdminSidebar user={user!} handleLogout={handleLogout} activeItem="glasba" />
        <div className="modern-main">
          <div className="modern-error">
            <div className="error-icon">
              <FaSignOutAlt size={40} />
            </div>
            <h3 className="error-title">Napaka</h3>
            <p className="error-message">
              {error || "Napaka pri nalaganju podatkov."}
            </p>
            <button
              onClick={() => router.push("/uporabnik")}
              className="retry-button"
            >
              Nazaj na profil
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="modern-dashboard">
      <AdminSidebar user={user} handleLogout={handleLogout} activeItem="glasba" />

      <div className="modern-main">
        <header className="main-header">
          <h1 style={{ fontSize: "1.5rem", fontWeight: "600", color: "var(--color-text)" }}>
            Upravljanje glasbenih želja
          </h1>
        </header>

        <div className="main-content">
          {/* Top Requests Section */}
          <div
            style={{
              background: "var(--color-input-bg)",
              borderRadius: "12px",
              padding: "2rem",
              marginBottom: "2rem",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                margin: "0 0 1.5rem 0",
                color: "var(--color-text)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaTrophy size={20} color="#FFD700" />
              Najbolj priljubljene pesmi
            </h2>

            {loadingRequests ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam najbolj priljubljene pesmi...</p>
              </div>
            ) : topRequests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Še ni glasbenih želja.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                }}
              >
                {topRequests.map((request, index) => (
                  <div
                    key={request.id}
                    style={{
                      background: "var(--color-bg)",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      position: "relative",
                    }}
                  >
                    {/* Rank Badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        background: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32",
                        color: index === 0 ? "#000" : "#fff",
                        borderRadius: "50%",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                      }}
                    >
                      {index + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: 600,
                          margin: "0 0 0.5rem 0",
                          color: "var(--color-text)",
                        }}
                      >
                        {request.song_name}
                      </h4>
                      {request.artist && (
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text-light)",
                            margin: "0 0 0.5rem 0",
                          }}
                        >
                          {request.artist}
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "var(--color-text-light)",
                        }}
                      >
                        <FaHeart size={14} color="var(--color-error)" />
                        <span>{request.votes} glasov</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() => handleResetVotes(request.id)}
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          background: "var(--color-warning)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "32px",
                        }}
                        title="Ponastavi glasove"
                      >
                        <FaRedo size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
                        style={{
                          padding: "0.5rem 0.75rem",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          background: "var(--color-error)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "32px",
                        }}
                        title="Izbriši željo"
                      >
                        <FaTrash size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All Requests by Veselica */}
          <div
            style={{
              background: "var(--color-input-bg)",
              borderRadius: "12px",
              padding: "2rem",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                margin: "0 0 1.5rem 0",
                color: "var(--color-text)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaMusic size={20} />
              Vse glasbene želje po veselici
            </h2>

            {loadingRequests ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam glasbene želje...</p>
              </div>
            ) : Object.keys(groupedRequests).length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Še ni glasbenih želja.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {Object.entries(groupedRequests).map(([veselicaId, requests]) => (
                  <div key={veselicaId}>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 600,
                        margin: "0 0 1rem 0",
                        color: "var(--color-text)",
                        borderBottom: "2px solid var(--color-border)",
                        paddingBottom: "0.5rem",
                      }}
                    >
                      {getVeselicaName(veselicaId)}
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gap: "1rem",
                        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                      }}
                    >
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          style={{
                            background: "var(--color-bg)",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            border: "1px solid var(--color-border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "none";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h4
                              style={{
                                fontSize: "1.125rem",
                                fontWeight: 600,
                                margin: "0 0 0.5rem 0",
                                color: "var(--color-text)",
                              }}
                            >
                              {request.song_name}
                            </h4>
                            {request.artist && (
                              <p
                                style={{
                                  fontSize: "0.875rem",
                                  color: "var(--color-text-light)",
                                  margin: "0 0 0.5rem 0",
                                }}
                              >
                                {request.artist}
                              </p>
                            )}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.875rem",
                                color: "var(--color-text-light)",
                              }}
                            >
                              <FaHeart size={14} color="var(--color-error)" />
                              <span>{request.votes} glasov</span>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() => handleResetVotes(request.id)}
                              style={{
                                padding: "0.5rem 0.75rem",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                background: "var(--color-warning)",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "32px",
                              }}
                              title="Ponastavi glasove"
                            >
                              <FaRedo size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(request.id)}
                              style={{
                                padding: "0.5rem 0.75rem",
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                background: "var(--color-error)",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: "32px",
                              }}
                              title="Izbriši željo"
                            >
                              <FaTrash size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlasbaAdminPage;
