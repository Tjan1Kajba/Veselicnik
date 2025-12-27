"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AdminSidebar from "../../components/AdminSidebar";
import UserSidebar from "../../components/UserSidebar";
import {
  FaUser,
  FaSignOutAlt,
  FaClipboardList,
  FaCalendar,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaUsers as FaUsersIcon,
  FaExclamationTriangle,
} from "react-icons/fa";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, UserResponse, Veselica } from "../../types";

const VeselicePregledPage = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [veselice, setVeselice] = useState<Veselica[]>([]);
  const [loadingVeselice, setLoadingVeselice] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.title = "Veselice";
  }, []);

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
    if (user) {
      fetchVeselice();
    }
  }, [user]);

  const fetchVeselice = async () => {
    setLoadingVeselice(true);
    try {
      const res = await fetch("http://localhost:8002/veselice", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje veselic.");
      }
      const data: Veselica[] = await res.json();
      setVeselice(data);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju veselic.", "error");
    } finally {
      setLoadingVeselice(false);
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

  const isUserRegistered = (veselica: Veselica) => {
    if (!user) return false;
    return veselica.prijavljeni_uporabniki?.includes(user.id) || false;
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

  if (error)
    return (
      <div className="modern-error">
        <div className="error-icon">
          <FaExclamationTriangle size={40} />
        </div>
        <h3 className="error-title">Napaka</h3>
        <p className="error-message">{error}</p>
        <button onClick={fetchUser} className="retry-button">
          Poskusi znova
        </button>
      </div>
    );

  if (!user) return null;

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      {user?.tip_uporabnika === "admin" ? (
        <AdminSidebar user={user} handleLogout={handleLogout} activeItem="veselice" />
      ) : (
        <UserSidebar user={user} handleLogout={handleLogout} activeItem="veselice" />
      )}

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Vse veselice</h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaUsersIcon size={16} />
            </span>
            <span className="badge-text">
              {veselice.length} {veselice.length === 1 ? "veselica" : "veselic"}
            </span>
          </div>
        </header>

        <div className="main-content">
          {/* Veselice List */}
          <div className="profile-card">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">
                  <FaUsersIcon size={20} />
                </span>
                Seznam veselic
              </h2>
              <span className="section-badge">Pregled</span>
            </div>

            {loadingVeselice ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam veselice...</p>
              </div>
            ) : veselice.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Trenutno ni na voljo nobene veselice.
                </p>
              </div>
            ) : (
              <div
                className="veselice-grid"
                style={{
                  display: "grid",
                  gap: "1.5rem",
                  gridTemplateColumns: "repeat(3, 1fr)",
                }}
              >
                {veselice.map((veselica) => {
                  const isRegistered = isUserRegistered(veselica);
                  return (
                    <Link
                      key={veselica.id}
                      href={`/veselice/${veselica.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          background: "var(--color-white)",
                          borderRadius: "16px",
                          overflow: "hidden",
                          border: isRegistered
                            ? "2px solid var(--color-primary)"
                            : "1px solid var(--color-border)",
                          boxShadow: isRegistered
                            ? "0 4px 20px rgba(237, 132, 88, 0.2)"
                            : "0 4px 20px rgba(0, 0, 0, 0.08)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          position: "relative",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-4px)";
                          e.currentTarget.style.boxShadow =
                            "0 8px 32px rgba(237, 132, 88, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = isRegistered
                            ? "0 4px 20px rgba(237, 132, 88, 0.2)"
                            : "0 4px 20px rgba(0, 0, 0, 0.08)";
                        }}
                      >
                        {isRegistered && (
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
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              zIndex: 10,
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                          >
                            Prijavljen
                          </div>
                        )}

                        {/* Image */}
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "200px",
                            overflow: "hidden",
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
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          {/* Gradient overlay */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: "60%",
                              background:
                                "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
                            }}
                          />
                          {/* Title overlay */}
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: "1.25rem",
                            }}
                          >
                            <h3
                              style={{
                                fontSize: "1.5rem",
                                fontWeight: 700,
                                color: "white",
                                margin: 0,
                                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                              }}
                            >
                              {veselica.ime_veselice}
                            </h3>
                          </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: "1.5rem", flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "1rem",
                            }}
                          >
                            {/* Date */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                              }}
                            >
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "10px",
                                  background:
                                    "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  flexShrink: 0,
                                }}
                              >
                                <FaCalendar size={18} />
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
                                    fontSize: "0.95rem",
                                    color: "var(--color-text)",
                                    margin: "0.25rem 0 0 0",
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
                                alignItems: "center",
                                gap: "0.75rem",
                              }}
                            >
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "10px",
                                  background: "var(--color-primary-light)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--color-primary)",
                                  flexShrink: 0,
                                }}
                              >
                                <FaMapMarkerAlt size={18} />
                              </div>
                              <div style={{ flex: 1 }}>
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
                                    fontSize: "0.95rem",
                                    color: "var(--color-text)",
                                    margin: "0.25rem 0 0 0",
                                    fontWeight: 600,
                                  }}
                                >
                                  {veselica.lokacija}
                                </p>
                              </div>
                            </div>

                            {/* Description preview */}
                            {veselica.opis_dogodka && (
                              <div
                                style={{
                                  padding: "1rem",
                                  background: "var(--color-input-bg)",
                                  borderRadius: "10px",
                                  marginTop: "0.5rem",
                                }}
                              >
                                <p
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-light)",
                                    margin: 0,
                                    lineHeight: 1.6,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                  }}
                                >
                                  {veselica.opis_dogodka}
                                </p>
                              </div>
                            )}

                            {/* Footer info */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: "1rem",
                                marginTop: "auto",
                                borderTop: "2px solid var(--color-border)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span style={{ color: "var(--color-primary)" }}>
                                  <FaUsersIcon size={16} />
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-light)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {veselica.prijavljeni_uporabniki?.length || 0}
                                  {veselica.max_udelezencev &&
                                  veselica.max_udelezencev > 0
                                    ? ` / ${veselica.max_udelezencev}`
                                    : ""}
                                </span>
                              </div>
                              {veselica.starost_za_vstop && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "var(--color-text-light)",
                                    }}
                                  >
                                    <FaInfoCircle size={14} />
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--color-text-light)",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {veselica.starost_za_vstop}+
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeselicePregledPage;
