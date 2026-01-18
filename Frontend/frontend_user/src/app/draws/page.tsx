"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser,
  FaSignOutAlt,
  FaDice,
  FaPlus,
  FaTrophy,
  FaTrash,
  FaArrowLeft,
  FaSpinner,
  FaCalendar,
  FaTimes,
} from "react-icons/fa";
import AdminSidebar from "../../components/AdminSidebar";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, Draw, DrawWinner, Veselica, Prize } from "../../types";

const DrawsManagementPage = () => {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draws, setDraws] = useState<Draw[]>([]);
  const [veselice, setVeselice] = useState<Veselica[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loadingDraws, setLoadingDraws] = useState(false);
  const [loadingVeselice, setLoadingVeselice] = useState(false);
  const [loadingPrizes, setLoadingPrizes] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showWinnersModal, setShowWinnersModal] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<Draw | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    veselica_id: "",
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
      if (user.tip_uporabnika !== "admin") {
        showToast("Nimate dovoljenja za dostop do te strani.", "error");
        router.push("/uporabnik");
        return;
      }
      fetchDraws();
      fetchVeselice();
      fetchPrizes();
    }
  }, [user]);

  const fetchDraws = async () => {
    setLoadingDraws(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("http://localhost:9001/draws", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje žrebanj.");
      }

      const data: Draw[] = await res.json();
      setDraws(data);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju žrebanj.", "error");
    } finally {
      setLoadingDraws(false);
    }
  };

  const fetchVeselice = async () => {
    setLoadingVeselice(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("http://localhost:8002/veselice", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje veselice.");
      }

      const data: Veselica[] = await res.json();
      setVeselice(data);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju veselice.", "error");
    } finally {
      setLoadingVeselice(false);
    }
  };

  const fetchPrizes = async () => {
    setLoadingPrizes(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("http://localhost:9001/prizes", {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje nagrad.");
      }

      const data: Prize[] = await res.json();
      setPrizes(data);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju nagrad.", "error");
    } finally {
      setLoadingPrizes(false);
    }
  };

  const handleCreateDraw = async () => {
    if (!formData.veselica_id) {
      showToast("Izberite veselico.", "error");
      return;
    }

    setCreating(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:9001/draws/${formData.veselica_id}`, {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri ustvarjanju žrebanja.");
      }

      showToast("Žrebanje uspešno ustvarjeno!", "success");
      setShowCreateForm(false);
      setFormData({ veselica_id: "" });
      fetchDraws();
    } catch (err: any) {
      showToast(err.message || "Napaka pri ustvarjanju žrebanja.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleViewWinners = async (draw: Draw) => {
    setSelectedDraw(draw);

    // Fetch winners for this draw
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:9001/draws/${draw._id}/winners`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri pridobivanju zmagovalcev.");
      }

      const winnersData: DrawWinner[] = await res.json();
      const drawWithWinners = { ...draw, winners: winnersData };
      setSelectedDraw(drawWithWinners);
      setShowWinnersModal(true);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju zmagovalcev.", "error");
    }
  };

  const handleDeleteDraw = async (drawId: string) => {
    if (!confirm("Ali ste prepričani, da želite izbrisati to žrebanje?")) {
      return;
    }

    setDeleting(drawId);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:9001/draws/${drawId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri brisanju žrebanja.");
      }

      showToast("Žrebanje uspešno izbrisano!", "success");
      fetchDraws();
    } catch (err: any) {
      showToast(err.message || "Napaka pri brisanju žrebanja.", "error");
    } finally {
      setDeleting(null);
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

  const getVeselicaName = (veselicaId: string) => {
    const veselica = veselice.find(v => v.id === veselicaId);
    return veselica ? veselica.ime_veselice : "Neznana veselica";
  };

  const getPrizeName = (prizeId: string | any) => {
    // Handle both string ID and populated Prize object
    if (typeof prizeId === 'string') {
      const prize = prizes.find(p => p._id === prizeId);
      return prize ? prize.name : "Neznana nagrada";
    } else if (prizeId && typeof prizeId === 'object' && prizeId.name) {
      // prizeId is a populated Prize object
      return prizeId.name;
    }
    return "Neznana nagrada";
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

  if (loading || loadingDraws || loadingVeselice || loadingPrizes) {
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
        <AdminSidebar user={user || { id: "", username: "", email: "" }} handleLogout={handleLogout} activeItem="draws" />
        <div className="modern-main">
          <div className="modern-error">
            <div className="error-icon">
              <FaUser size={40} />
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
  }

  return (
    <div className="modern-dashboard">
      <AdminSidebar user={user} handleLogout={handleLogout} activeItem="draws" />

      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Upravljanje žrebanj</h1>
        </header>

        <div className="main-content">
          {/* Create Draw Form */}
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
              <div className="card-header" style={{ position: "relative" }}>
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
                      Ustvari novo žrebanje
                    </h2>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      Izberite veselico za žrebanje
                    </p>
                  </div>
                </div>

                {/* Close X button */}
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    background: "var(--color-input-bg)",
                    border: "2px solid var(--color-border)",
                    borderRadius: "8px",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    color: "var(--color-text-light)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-border)";
                    e.currentTarget.style.color = "var(--color-error)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--color-input-bg)";
                    e.currentTarget.style.color = "var(--color-text-light)";
                  }}
                  title="Zapri"
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleCreateDraw(); }}
                style={{ marginTop: "2rem" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Veselica */}
                  <div className="input-group">
                    <label className="input-label">
                      Veselica{" "}
                      <span style={{ color: "var(--color-error)" }}>*</span>
                    </label>
                    <select
                      value={formData.veselica_id}
                      onChange={(e) => setFormData({ ...formData, veselica_id: e.target.value })}
                      className="text-input"
                      style={{ width: "100%" }}
                      required
                    >
                      <option value="">Izberite veselico</option>
                      {veselice.map((veselica) => (
                        <option key={veselica.id} value={veselica.id}>
                          {veselica.ime_veselice}
                        </option>
                      ))}
                    </select>
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
                          <FaDice size={16} />
                          Ustvari žrebanje
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
              </form>
            </div>
          )}

          {/* Draws List */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="title-icon">
                  <FaDice size={20} />
                </span>
                Seznam žrebanj
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
                  Novo žrebanje
                </button>
              </div>
            </div>

            {loadingDraws ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam žrebanja...</p>
              </div>
            ) : draws.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Ni žrebanj. Ustvarite prvo žrebanje!
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                }}
              >
                {draws.map((draw) => (
                  <div
                    key={draw._id}
                    style={{
                      background: "var(--color-input-bg)",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid var(--color-border)",
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
                    <div style={{ marginBottom: "1rem" }}>
                      <h3
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: 600,
                          margin: "0 0 0.5rem 0",
                          color: "var(--color-text)",
                        }}
                      >
                        {getVeselicaName(draw.veselica_id)}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.875rem",
                          color: "var(--color-text-light)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <FaCalendar size={14} />
                        <span>{formatDate(draw.date)}</span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--color-primary)",
                          margin: 0,
                          fontWeight: 600,
                        }}
                      >
                        Zmagovalcev: {draw.winners?.length || 0}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => handleViewWinners(draw)}
                        style={{
                          padding: "0.5rem",
                          background: "var(--color-primary)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Prikaži zmagovalce"
                      >
                        <FaTrophy size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteDraw(draw._id)}
                        disabled={deleting === draw._id}
                        style={{
                          padding: "0.5rem",
                          background: deleting === draw._id ? "var(--color-text-light)" : "var(--color-error)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: deleting === draw._id ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Izbriši"
                      >
                        {deleting === draw._id ? (
                          <FaSpinner size={14} />
                        ) : (
                          <FaTrash size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Winners Modal */}
      {showWinnersModal && selectedDraw && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--color-bg)",
              borderRadius: "12px",
              padding: "2rem",
              width: "90%",
              maxWidth: "600px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h3 style={{ margin: "0 0 1.5rem 0", fontSize: "1.25rem", fontWeight: 600 }}>
              Zmagovalci žrebanja - {getVeselicaName(selectedDraw.veselica_id)}
            </h3>

            {selectedDraw.winners && selectedDraw.winners.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {selectedDraw.winners.map((winner, index) => (
                  <div
                    key={index}
                    style={{
                      background: "var(--color-input-bg)",
                      borderRadius: "8px",
                      padding: "1rem",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <FaTrophy size={16} color="var(--color-primary)" />
                      <span
                        style={{
                          fontSize: "1rem",
                          fontWeight: 600,
                          color: "var(--color-text)",
                        }}
                      >
                        {getPrizeName(winner.prizeId)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        margin: 0,
                      }}
                    >
                      Srečka ID: {winner.ticketId && typeof winner.ticketId === 'object' ? winner.ticketId._id : winner.ticketId}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <FaTrophy size={48} color="var(--color-text-light)" />
                <h4 style={{ color: "var(--color-text-light)", margin: "1rem 0" }}>
                  Ni zmagovalcev
                </h4>
                <p style={{ color: "var(--color-text-light)" }}>
                  Žrebanje še ni bilo izvedeno ali ni bilo srečk.
                </p>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
                marginTop: "2rem",
              }}
            >
              <button
                onClick={() => {
                  setShowWinnersModal(false);
                  setSelectedDraw(null);
                }}
                className="modern-button primary"
                style={{
                  padding: "0.75rem 1.5rem",
                }}
              >
                Zapri
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawsManagementPage;
