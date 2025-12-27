"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminSidebar from "../../components/AdminSidebar";
import {
  FaUser,
  FaSignOutAlt,
  FaClipboardList,
  FaLock,
  FaCog,
  FaShieldAlt,
  FaExclamationTriangle,
  FaUsers,
  FaPlus,
  FaCalendar,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaUsers as FaUsersIcon,
  FaTrash,
} from "react-icons/fa";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, UserResponse, Veselica } from "../../types";

const VeselicePage = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [veselice, setVeselice] = useState<Veselica[]>([]);
  const [loadingVeselice, setLoadingVeselice] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    ime_veselice: "",
    cas: "",
    lokacija: "",
    max_udelezencev: 0,
    starost_za_vstop: 18,
    opis_dogodka: "",
  });

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
          showToast("Nimate dostopa do te strani.", "error");
          router.push("/uporabnik");
          return;
        }

        setUser(userData);
      })
      .catch((err) => {
        setError(err.message);
        showToast(err.message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  useEffect(() => {
    if (user && user.tip_uporabnika === "admin") {
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

  const handleCreateVeselica = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // Convert datetime-local to ISO string
      const casISO = new Date(formData.cas).toISOString();

      const res = await fetch("http://localhost:8002/veselice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ime_veselice: formData.ime_veselice,
          cas: casISO,
          lokacija: formData.lokacija,
          max_udelezencev: formData.max_udelezencev || 0,
          starost_za_vstop: formData.starost_za_vstop || 18,
          opis_dogodka: formData.opis_dogodka || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri ustvarjanju veselice.");
      }

      showToast("Veselica uspešno ustvarjena!", "success");
      setShowCreateForm(false);
      setFormData({
        ime_veselice: "",
        cas: "",
        lokacija: "",
        max_udelezencev: 0,
        starost_za_vstop: 18,
        opis_dogodka: "",
      });
      fetchVeselice();
    } catch (err: any) {
      showToast(err.message || "Napaka pri ustvarjanju veselice.", "error");
    } finally {
      setCreating(false);
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

  const handleDeleteVeselica = async (
    veselicaId: string,
    imeVeselice: string
  ) => {
    if (
      !confirm(
        `Ali ste prepričani, da želite izbrisati veselico "${imeVeselice}"?`
      )
    ) {
      return;
    }

    setDeletingId(veselicaId);
    try {
      const res = await fetch(`http://localhost:8002/veselice/${veselicaId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri brisanju veselice.");
      }

      showToast("Veselica uspešno izbrisana!", "success");
      fetchVeselice();
    } catch (err: any) {
      showToast(err.message || "Napaka pri brisanju veselice.", "error");
    } finally {
      setDeletingId(null);
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

  if (!user || user.tip_uporabnika !== "admin") return null;

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      <AdminSidebar user={user} handleLogout={handleLogout} activeItem="upravljanje" />

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Upravljanje veselic</h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaShieldAlt size={16} />
            </span>
            <span className="badge-text">Administrator</span>
          </div>
        </header>

        <div className="main-content">
          {/* Create Veselica Form */}
          {showCreateForm && (
            <div
              className="profile-card"
              style={{
                marginBottom: "1.5rem",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.98) 100%)",
                border: "2px solid var(--color-primary-light)",
                boxShadow: "0 8px 32px rgba(237, 132, 88, 0.15)",
              }}
            >
              <div className="card-header">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
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
                    }}
                  >
                    <FaPlus size={24} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: "1.5rem",
                        fontWeight: 700,
                        margin: 0,
                        background:
                          "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      Ustvari novo veselico
                    </h2>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      Izpolnite podatke za novo veselico
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "1.75rem",
                    cursor: "pointer",
                    color: "var(--color-text-light)",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-input-bg)";
                    e.currentTarget.style.color = "var(--color-text)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-text-light)";
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleCreateVeselica}
                style={{ marginTop: "2rem" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "2rem",
                    alignItems: "start",
                  }}
                >
                  {/* Left Column - Main Fields */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Ime veselice */}
                    <div className="input-group">
                      <label className="input-label">
                        Ime veselice{" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.ime_veselice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ime_veselice: e.target.value,
                          })
                        }
                        className="text-input"
                        placeholder="npr. Novoletska zabava 2025"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Datum in ura */}
                    <div className="input-group">
                      <label className="input-label">
                        Datum in ura{" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={formData.cas}
                        onChange={(e) =>
                          setFormData({ ...formData, cas: e.target.value })
                        }
                        className="text-input"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Lokacija */}
                    <div className="input-group">
                      <label className="input-label">
                        Lokacija{" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.lokacija}
                        onChange={(e) =>
                          setFormData({ ...formData, lokacija: e.target.value })
                        }
                        className="text-input"
                        placeholder="npr. Ljubljana, Kongresni trg 1"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Maksimalno število prijavljenih */}
                    <div className="input-group">
                      <label className="input-label">
                        Maksimalno število prijavljenih
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.max_udelezencev}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            max_udelezencev: parseInt(e.target.value) || 0,
                          })
                        }
                        className="text-input"
                        placeholder="0 = brez omejitve"
                        style={{ width: "100%" }}
                      />

                    </div>

                    {/* Minimalna starost */}
                    <div className="input-group">
                      <label className="input-label">
                        Minimalna starost za vstop
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.starost_za_vstop}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            starost_za_vstop: parseInt(e.target.value) || 18,
                          })
                        }
                        className="text-input"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Right Column - Description and Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "space-between", height: "100%" }}>
                    {/* Opis dogodka */}
                    <div className="input-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <label className="input-label">Opis dogodka</label>
                      <textarea
                        value={formData.opis_dogodka}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            opis_dogodka: e.target.value,
                          })
                        }
                        className="text-input"
                        placeholder="Dodajte opis dogodka, temo, posebnosti..."
                        style={{
                          width: "100%",
                          resize: "vertical",
                          fontFamily: "inherit",
                          flex: 1,
                          minHeight: "200px",
                        }}
                      />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button
                        type="submit"
                        disabled={creating}
                        className="modern-button primary"
                        style={{
                          flex: 1,
                          padding: "1rem 2rem",
                          fontSize: "1rem",
                          fontWeight: 600,
                          height: "48px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                        }}
                      >
                        {creating ? (
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
                            Ustvarjam...
                          </>
                        ) : (
                          <>
                            <FaPlus size={16} />
                            Ustvari veselico
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        style={{
                          flex: 1,
                          padding: "1rem 2rem",
                          marginTop: "8px",
                          fontSize: "1rem",
                          fontWeight: 600,
                          background: "var(--color-input-bg)",
                          color: "var(--color-text)",
                          border: "2px solid var(--color-border)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          height: "48px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "var(--color-border)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "var(--color-input-bg)";
                        }}
                      >
                        Prekliči
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Veselice List */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="title-icon">
                  <FaUsers size={20} />
                </span>
                Seznam veselic
              </h2>
              <div
                style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <span className="badge">Admin panel</span>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="modern-button"
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <FaPlus size={14} />
                  Nova veselica
                </button>
              </div>
            </div>

            {loadingVeselice ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam veselice...</p>
              </div>
            ) : veselice.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Ni veselic. Ustvarite prvo veselico!
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
                {veselice.map((veselica) => (
                  <div
                    key={veselica.id}
                    style={{
                      background: "var(--color-white)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      border: "1px solid var(--color-border)",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                      transition: "all 0.3s ease",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 32px rgba(237, 132, 88, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 20px rgba(0, 0, 0, 0.08)";
                    }}
                  >
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
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                        }}
                      >
                        <h3
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 700,
                            color: "white",
                            margin: 0,
                            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            flex: 1,
                          }}
                        >
                          {veselica.ime_veselice}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVeselica(
                              veselica.id,
                              veselica.ime_veselice
                            );
                          }}
                          disabled={deletingId === veselica.id}
                          style={{
                            background: "rgba(211, 47, 47, 0.9)",
                            border: "none",
                            borderRadius: "8px",
                            width: "36px",
                            height: "36px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor:
                              deletingId === veselica.id
                                ? "not-allowed"
                                : "pointer",
                            color: "white",
                            transition: "all 0.2s",
                            opacity: deletingId === veselica.id ? 0.6 : 1,
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                            marginLeft: "0.75rem",
                          }}
                          onMouseEnter={(e) => {
                            if (deletingId !== veselica.id) {
                              e.currentTarget.style.background =
                                "rgba(211, 47, 47, 1)";
                              e.currentTarget.style.transform = "scale(1.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (deletingId !== veselica.id) {
                              e.currentTarget.style.background =
                                "rgba(211, 47, 47, 0.9)";
                              e.currentTarget.style.transform = "scale(1)";
                            }
                          }}
                          title="Izbriši veselico"
                        >
                          {deletingId === veselica.id ? (
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
                          ) : (
                            <FaTrash size={16} />
                          )}
                        </button>
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

                        {/* Description */}
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
                                WebkitLineClamp: 1,
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
                                style={{ color: "var(--color-text-light)" }}
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeselicePage;
