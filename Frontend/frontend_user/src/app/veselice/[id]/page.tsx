"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  FaUser,
  FaSignOutAlt,
  FaClipboardList,
  FaCalendar,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaUsers as FaUsersIcon,
  FaExclamationTriangle,
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import "../../uporabnik/dashboard.css";
import { showToast } from "../../../utils/toast";
import { UserData, UserResponse, Veselica } from "../../../types";

const VeselicaDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const veselicaId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [veselica, setVeselica] = useState<Veselica | null>(null);
  const [loadingVeselica, setLoadingVeselica] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);

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

        setUser(userData);
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
    if (user && veselicaId) {
      fetchVeselica();
    }
  }, [user, veselicaId]);

  const fetchVeselica = async () => {
    setLoadingVeselica(true);
    try {
      const res = await fetch(`http://localhost:8002/veselice/${veselicaId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje veselice.");
      }
      const data: Veselica = await res.json();
      setVeselica(data);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju veselice.", "error");
      setError(err.message);
    } finally {
      setLoadingVeselica(false);
    }
  };

  const isUserRegistered = () => {
    if (!user || !veselica) return false;
    return veselica.prijavljeni_uporabniki?.includes(user.id) || false;
  };

  const handleRegister = async () => {
    if (!veselica || !user) return;

    setIsRegistering(true);
    try {
      const res = await fetch(
        `http://localhost:8002/veselice/${veselica.id}/prijava`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri prijavi na veselico.");
      }

      showToast("Uspešno ste se prijavili na veselico!", "success");
      fetchVeselica();
    } catch (err: any) {
      showToast(err.message || "Napaka pri prijavi na veselico.", "error");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!veselica || !user) return;

    if (
      !confirm(
        `Ali ste prepričani, da se želite odjaviti z veselice "${veselica.ime_veselice}"?`
      )
    ) {
      return;
    }

    setIsUnregistering(true);
    try {
      const res = await fetch(
        `http://localhost:8002/veselice/${veselica.id}/odjava`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri odjavi z veselice.");
      }

      showToast("Uspešno ste se odjavili z veselice!", "success");
      fetchVeselica();
    } catch (err: any) {
      showToast(err.message || "Napaka pri odjavi z veselice.", "error");
    } finally {
      setIsUnregistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("sl-SI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
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

  const isFull = () => {
    if (!veselica) return false;
    const max = veselica.max_udelezencev || 0;
    if (max === 0) return false; // No limit
    const current = veselica.prijavljeni_uporabniki?.length || 0;
    return max > 0 && current >= max;
  };

  if (loading || loadingVeselica)
    return (
      <div className="modern-loading">
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-text">Nalagam podatke...</p>
      </div>
    );

  if (error || !veselica)
    return (
      <div className="modern-dashboard">
        <div className="modern-sidebar">
          <div className="sidebar-header">
            <div className="user-avatar">
              <div className="avatar-icon">
                <FaUser size={32} />
              </div>
            </div>
            <div className="user-info">
              <h3 className="username">
                {user?.uporabnisko_ime || user?.username || user?.email || ""}
              </h3>
              <p className="user-email">{user?.email || ""}</p>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button
              className="nav-item"
              onClick={() => router.push("/uporabnik")}
            >
              <span className="nav-icon">
                <FaClipboardList size={20} />
              </span>
              <span className="nav-text">Profil</span>
            </button>
            <button
              className="nav-item active"
              onClick={() => router.push("/veselice-pregled")}
            >
              <span className="nav-icon">
                <FaUsersIcon size={20} />
              </span>
              <span className="nav-text">Veselice</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <button className="logout-button" onClick={handleLogout}>
              <span className="logout-icon">
                <FaSignOutAlt size={20} />
              </span>
              <span className="logout-text">Odjava</span>
            </button>
          </div>
        </div>

        <div className="modern-main">
          <div className="modern-error">
            <div className="error-icon">
              <FaExclamationTriangle size={40} />
            </div>
            <h3 className="error-title">Napaka</h3>
            <p className="error-message">
              {error || "Veselica ne obstaja."}
            </p>
            <button
              onClick={() => router.push("/veselice-pregled")}
              className="retry-button"
            >
              Nazaj na seznam
            </button>
          </div>
        </div>
      </div>
    );

  if (!user) return null;

  const registered = isUserRegistered();
  const full = isFull();

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      <div className="modern-sidebar">
        <div className="sidebar-header">
          <div className="user-avatar">
            <div className="avatar-icon">
              <FaUser size={32} />
            </div>
          </div>
          <div className="user-info">
            <h3 className="username">
              {user.uporabnisko_ime || user.username || user.email}
            </h3>
            <p className="user-email">{user.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => router.push("/uporabnik")}
          >
            <span className="nav-icon">
              <FaClipboardList size={20} />
            </span>
            <span className="nav-text">Profil</span>
          </button>
          <button
            className="nav-item active"
            onClick={() => router.push("/veselice-pregled")}
          >
            <span className="nav-icon">
              <FaUsersIcon size={20} />
            </span>
            <span className="nav-text">Veselice</span>
          </button>
          {user.tip_uporabnika === "admin" && (
            <button
              className="nav-item"
              onClick={() => router.push("/veselice")}
            >
              <span className="nav-icon">
                <FaUsersIcon size={20} />
              </span>
              <span className="nav-text">Upravljanje</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <span className="logout-icon">
              <FaSignOutAlt size={20} />
            </span>
            <span className="logout-text">Odjava</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <button
            onClick={() => router.push("/veselice-pregled")}
            style={{
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--color-text)",
              cursor: "pointer",
              fontSize: "1rem",
              marginBottom: "1rem",
              padding: "0.5rem",
              borderRadius: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-input-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <FaArrowLeft size={16} />
            Nazaj na seznam
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          </div>
        </header>

        <div className="main-content">
          <div className="profile-card">
            {/* Image */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "400px",
                overflow: "hidden",
                borderRadius: "16px",
                marginBottom: "2rem",
                background:
                  "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
              }}
            >
              <Image
                src="/Gasilska_veselica_2002.jpg"
                alt={veselica.ime_veselice}
                fill
                style={{
                  objectFit: "cover",
                }}
                sizes="100vw"
              />
              {registered && (
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    background:
                      "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "20px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                    zIndex: 10,
                  }}
                >
                  <FaCheckCircle size={14} />
                  Prijavljen
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "70%",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 40%, transparent 100%)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "2rem",
                }}
              >
                <h1
                  style={{
                    color: "white",
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    margin: 0,
                    textShadow: "0 2px 4px rgba(0,0,0,0.3)",
                  }}
                >
                  {veselica.ime_veselice}
                </h1>
              </div>
            </div>

            {/* Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "2rem",
                marginBottom: "2rem",
              }}
            >
              {/* Date */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1.5rem",
                  background: "var(--color-input-bg)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background:
                      "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  <FaCalendar size={24} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-light)",
                      margin: 0,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Datum in ura
                  </p>
                  <p
                    style={{
                      fontSize: "1.125rem",
                      color: "var(--color-text)",
                      margin: "0.5rem 0 0 0",
                      fontWeight: 600,
                    }}
                  >
                    {formatDate(veselica.cas)}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1.5rem",
                  background: "var(--color-input-bg)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "var(--color-primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                    flexShrink: 0,
                  }}
                >
                  <FaMapMarkerAlt size={24} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-light)",
                      margin: 0,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Lokacija
                  </p>
                  <p
                    style={{
                      fontSize: "1.125rem",
                      color: "var(--color-text)",
                      margin: "0.5rem 0 0 0",
                      fontWeight: 600,
                    }}
                  >
                    {veselica.lokacija}
                  </p>
                </div>
              </div>

              {/* Participants */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1.5rem",
                  background: "var(--color-input-bg)",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "var(--color-primary-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--color-primary)",
                    flexShrink: 0,
                  }}
                >
                  <FaUsersIcon size={24} />
                </div>
                <div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-light)",
                      margin: 0,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Prijavljeni
                  </p>
                  <p
                    style={{
                      fontSize: "1.125rem",
                      color: "var(--color-text)",
                      margin: "0.5rem 0 0 0",
                      fontWeight: 600,
                    }}
                  >
                    {veselica.prijavljeni_uporabniki?.length || 0}
                    {veselica.max_udelezencev &&
                    veselica.max_udelezencev > 0
                      ? ` / ${veselica.max_udelezencev}`
                      : ""}
                    {full && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          color: "var(--color-error)",
                          fontSize: "0.875rem",
                        }}
                      >
                        (Polno)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Age requirement */}
              {veselica.starost_za_vstop && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1rem",
                    padding: "1.5rem",
                    background: "var(--color-input-bg)",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      background: "var(--color-primary-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-primary)",
                      flexShrink: 0,
                    }}
                  >
                    <FaInfoCircle size={24} />
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-light)",
                        margin: 0,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Minimalna starost
                    </p>
                    <p
                      style={{
                        fontSize: "1.125rem",
                        color: "var(--color-text)",
                        margin: "0.5rem 0 0 0",
                        fontWeight: 600,
                      }}
                    >
                      {veselica.starost_za_vstop}+ let
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {veselica.opis_dogodka && (
              <div
                style={{
                  padding: "1.5rem",
                  background: "var(--color-input-bg)",
                  borderRadius: "12px",
                  marginBottom: "2rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 1rem 0",
                    color: "var(--color-text)",
                  }}
                >
                  Opis dogodka
                </h3>
                <p
                  style={{
                    fontSize: "1rem",
                    color: "var(--color-text-light)",
                    margin: 0,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {veselica.opis_dogodka}
                </p>
              </div>
            )}

            {/* Registered Users List */}
            {veselica.prijavljeni_uporabniki_podatki && veselica.prijavljeni_uporabniki_podatki.length > 0 && (
              <div
                style={{
                  padding: "1.5rem",
                  background: "var(--color-input-bg)",
                  borderRadius: "12px",
                  marginBottom: "2rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    margin: "0 0 1rem 0",
                    color: "var(--color-text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaUsersIcon size={20} />
                  Prijavljeni uporabniki ({veselica.prijavljeni_uporabniki_podatki.length})
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {veselica.prijavljeni_uporabniki_podatki.map((username, index) => (
                    <div
                      key={username || index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem",
                        background: "var(--color-bg)",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        transition: "transform 0.2s, box-shadow 0.2s",
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
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        <FaUser size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-light)",
                            margin: 0,
                            marginBottom: "0.25rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            fontWeight: 500,
                          }}
                        >
                          Uporabnik
                        </p>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text)",
                            margin: 0,
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={username}
                        >
                          {username}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                paddingTop: "2rem",
                borderTop: "2px solid var(--color-border)",
              }}
            >
              {registered ? (
                <button
                  onClick={handleUnregister}
                  disabled={isUnregistering}
                  className="modern-button"
                  style={{
                    flex: 1,
                    padding: "1rem 2rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                    background: "var(--color-error)",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  {isUnregistering ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          border: "2px solid white",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                        }}
                      />
                      Odjavljam...
                    </>
                  ) : (
                    <>
                      <FaTimesCircle size={16} />
                      Odjavi se z veselice
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={isRegistering || full}
                  className="modern-button primary"
                  style={{
                    flex: 1,
                    padding: "1rem 2rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    opacity: full ? 0.6 : 1,
                    cursor: full ? "not-allowed" : "pointer",
                  }}
                >
                  {isRegistering ? (
                    <>
                      <span
                        style={{
                          display: "inline-block",
                          width: "16px",
                          height: "16px",
                          border: "2px solid white",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                        }}
                      />
                      Prijavljam...
                    </>
                  ) : full ? (
                    <>
                      <FaTimesCircle size={16} />
                      Veselica je polna
                    </>
                  ) : (
                    <>
                      <FaCheckCircle size={16} />
                      Prijavi se na veselico
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeselicaDetailPage;
