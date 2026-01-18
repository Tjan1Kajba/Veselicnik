"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FaUser,
  FaSignOutAlt,
  FaGift,
  FaPlus,
  FaEdit,
  FaTrash,
  FaArrowLeft,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";
import AdminSidebar from "../../components/AdminSidebar";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, Prize, CreatePrizeRequest, UpdatePrizeRequest, Veselica } from "../../types";

const PrizesManagementPage = () => {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [veselice, setVeselice] = useState<Veselica[]>([]);
  const [loadingPrizes, setLoadingPrizes] = useState(false);
  const [loadingVeselice, setLoadingVeselice] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    probability: 0.1,
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
      fetchPrizes();
      fetchVeselice();
    }
  }, [user]);

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

  const handleCreatePrize = async () => {
    if (!formData.name.trim()) {
      showToast("Vnesite ime nagrade.", "error");
      return;
    }

    if (formData.probability <= 0 || formData.probability > 1) {
      showToast("Verjetnost mora biti med 0 in 1.", "error");
      return;
    }

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

      const res = await fetch("http://localhost:9001/prizes", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri ustvarjanju nagrade.");
      }

      showToast("Nagrada uspešno ustvarjena!", "success");
      setShowCreateForm(false);
      setFormData({ name: "", probability: 0.1, veselica_id: "" });
      fetchPrizes();
    } catch (err: any) {
      showToast(err.message || "Napaka pri ustvarjanju nagrade.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleEditPrize = (prize: Prize) => {
    setEditingPrize(prize);
    setFormData({
      name: prize.name,
      probability: prize.probability,
      veselica_id: prize.veselica_id,
    });
  };

  const handleUpdatePrize = async () => {
    if (!editingPrize) return;

    if (!formData.name.trim()) {
      showToast("Vnesite ime nagrade.", "error");
      return;
    }

    if (formData.probability <= 0 || formData.probability > 1) {
      showToast("Verjetnost mora biti med 0 in 1.", "error");
      return;
    }

    if (!formData.veselica_id) {
      showToast("Izberite veselico.", "error");
      return;
    }

    setUpdating(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:9001/prizes/${editingPrize._id}`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          probability: formData.probability,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri posodabljanju nagrade.");
      }

      showToast("Nagrada uspešno posodobljena!", "success");
      setEditingPrize(null);
      setFormData({ name: "", probability: 0.1, veselica_id: "" });
      fetchPrizes();
    } catch (err: any) {
      showToast(err.message || "Napaka pri posodabljanju nagrade.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    if (!confirm("Ali ste prepričani, da želite izbrisati to nagrado?")) {
      return;
    }

    setDeleting(prizeId);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:9001/prizes/${prizeId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri brisanju nagrade.");
      }

      showToast("Nagrada uspešno izbrisana!", "success");
      fetchPrizes();
    } catch (err: any) {
      showToast(err.message || "Napaka pri brisanju nagrade.", "error");
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

  if (loading || loadingPrizes || loadingVeselice) {
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
        <AdminSidebar user={user || { id: "", username: "", email: "" }} handleLogout={handleLogout} activeItem="prizes" />
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
      <AdminSidebar user={user} handleLogout={handleLogout} activeItem="prizes" />

      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Upravljanje nagrad</h1>
        </header>

        <div className="main-content">
          {/* Create Prize Form */}
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
                      Dodaj novo nagrado
                    </h2>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      Izpolnite podatke za novo nagrado
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
                onSubmit={(e) => { e.preventDefault(); handleCreatePrize(); }}
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
                    {/* Ime nagrade */}
                    <div className="input-group">
                      <label className="input-label">
                        Ime nagrade{" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            name: e.target.value,
                          })
                        }
                        className="text-input"
                        placeholder="npr. Velika nagrada"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Verjetnost */}
                    <div className="input-group">
                      <label className="input-label">
                        Verjetnost (0.01 - 1.0){" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max="1.0"
                        required
                        value={formData.probability}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            probability: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="text-input"
                        placeholder="0.10"
                        style={{ width: "100%" }}
                      />
                    </div>
                  </div>

                  {/* Right Column - Veselica and Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "space-between", height: "100%" }}>
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
                            Dodajam...
                          </>
                        ) : (
                          <>
                            <FaPlus size={16} />
                            Dodaj nagrado
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

          {/* Prizes List */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="title-icon">
                  <FaGift size={20} />
                </span>
                Seznam nagrad
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
                  Nova nagrada
                </button>
              </div>
            </div>

            {loadingPrizes ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam nagrade...</p>
              </div>
            ) : prizes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Ni nagrad. Dodajte prvo nagrado!
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
                {prizes.map((prize) => (
                  editingPrize && editingPrize._id === prize._id ? (
                    // Edit Form
                    <div
                      key={prize._id}
                      style={{
                        background: "var(--color-input-bg)",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "2px solid var(--color-primary-light)",
                        boxShadow: "0 4px 12px rgba(237, 132, 88, 0.15)",
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
                          Uredi nagrado
                        </h3>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text-light)",
                            margin: 0,
                          }}
                        >
                          Veselica: {getVeselicaName(prize.veselica_id)}
                        </p>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <div className="input-group">
                          <label className="input-label">
                            Ime nagrade{" "}
                            <span style={{ color: "var(--color-error)" }}>*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                name: e.target.value,
                              })
                            }
                            className="text-input"
                            placeholder="npr. Velika nagrada"
                            style={{ width: "100%" }}
                          />
                        </div>

                        <div className="input-group">
                          <label className="input-label">
                            Verjetnost (0.01 - 1.0){" "}
                            <span style={{ color: "var(--color-error)" }}>*</span>
                          </label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max="1.0"
                            required
                            value={formData.probability}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                probability: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="text-input"
                            placeholder="0.10"
                            style={{ width: "100%" }}
                          />
                        </div>

                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => setEditingPrize(null)}
                            style={{
                              padding: "0.5rem",
                              background: "var(--color-input-bg)",
                              color: "var(--color-text)",
                              border: "2px solid var(--color-border)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Prekliči"
                          >
                            <FaTimes size={14} />
                          </button>
                          <button
                            onClick={handleUpdatePrize}
                            disabled={updating}
                            style={{
                              padding: "0.5rem",
                              background: updating ? "var(--color-text-light)" : "var(--color-primary)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: updating ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Posodobi"
                          >
                            {updating ? (
                              <FaSpinner size={14} />
                            ) : (
                              <FaEdit size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Prize Card
                    <div
                      key={prize._id}
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
                          {prize.name}
                        </h3>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-text-light)",
                            margin: "0 0 0.5rem 0",
                          }}
                        >
                          Veselica: {getVeselicaName(prize.veselica_id)}
                        </p>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--color-primary)",
                            margin: 0,
                            fontWeight: 600,
                          }}
                        >
                          Verjetnost: {(prize.probability * 100).toFixed(1)}%
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
                          onClick={() => handleEditPrize(prize)}
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
                          title="Uredi"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeletePrize(prize._id)}
                          disabled={deleting === prize._id}
                          style={{
                            padding: "0.5rem",
                            background: deleting === prize._id ? "var(--color-text-light)" : "var(--color-error)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            cursor: deleting === prize._id ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Izbriši"
                        >
                          {deleting === prize._id ? (
                            <FaSpinner size={14} />
                          ) : (
                            <FaTrash size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

export default PrizesManagementPage;
