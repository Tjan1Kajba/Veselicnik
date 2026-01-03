"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserSidebar from "../../components/UserSidebar";
import AdminSidebar from "../../components/AdminSidebar";
import {
  FaPlus,
  FaList,
  FaExclamationTriangle,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaMapMarkerAlt,
  FaTimes,
} from "react-icons/fa";
import "../uporabnik/dashboard.css";
import "./izgubljeni.css";
import { showToast } from "../../utils/toast";
import { UserData } from "../../types";

interface LostItem {
  _id: string;
  type: "lost";
  name: string;
  description: string;
  veselica_id: string;
  createdAt: string;
  updatedAt: string;
}

interface FoundItem {
  _id: string;
  type: "found";
  name: string;
  description: string;
  veselica_id: string;
  createdAt: string;
  updatedAt: string;
}

interface Veselica {
  id: string;
  ime_veselice: string;
  cas: string;
  lokacija: string;
  max_udelezencev?: number;
  st_prijaveljenih?: number;
  starost_za_vstop?: number;
  opis_dogodka?: string;
  ustvaril_uporabnik_id?: string;
  ustvaril_uporabnik_ime?: string;
  ustvarjeno?: string;
  prijavljeni_uporabniki?: string[];
  prijavljeni_uporabniki_podatki?: string[];
}

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  available: boolean;
}

const LostAndFoundPage = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"lost" | "found">("lost");
  const [lostItems, setLostItems] = useState<LostItem[]>([]);
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [veselice, setVeselice] = useState<Veselica[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LostItem | FoundItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    found_veselica_id: "",
    reward_veselica_id: "",
    food_name: "",
  });
  const router = useRouter();

  useEffect(() => {
    document.title = "Izgubljeno & najdeno";
    fetchUser();
  }, []);

  const fetchUser = () => {
    fetch("http://localhost:8002/uporabnik/prijavljen", {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Neuspešno pridobivanje podatkov o uporabniku.");
        }
        const data = await res.json();

        // Store access token for API calls
        if (data.access_token) {
          localStorage.setItem("access_token", data.access_token);
        }

        if (data.user) {
          setUser(data.user);
        } else {
          const {
            access_token,
            refresh_token,
            token_type,
            expires_in,
            ...userData
          } = data;
          setUser(userData as UserData);
        }
      })
      .catch((err) => {
        setError(err.message);
        showToast(err.message, "error");
      })
      .finally(() => setLoading(false));
  };

  const fetchLostItems = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showToast("Ni dostopnega žetona", "error");
      return;
    }

    fetch("http://localhost:9000/lost", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Napaka pri pridobivanju izgubljenih predmetov");
        }
        const data = await res.json();
        setLostItems(data);
      })
      .catch((err) => {
        showToast(err.message, "error");
      });
  };

  const fetchFoundItems = () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showToast("Ni dostopnega žetona", "error");
      return;
    }

    fetch("http://localhost:9000/found", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Napaka pri pridobivanju najdenih predmetov");
        }
        const data = await res.json();
        setFoundItems(data);
      })
      .catch((err) => {
        showToast(err.message, "error");
      });
  };

  const fetchVeselice = async () => {
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
      console.error("Napaka pri pridobivanju veselic:", err);
      // Don't show toast for this error as it's not critical for the main functionality
    }
  };

  const fetchMenu = async (veselica_id?: string) => {
    try {
      const url = veselica_id
        ? `http://localhost:8001/menu?veselica_id=${veselica_id}`
        : "http://localhost:8001/menu";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje menija.");
      }
      const data: MenuItem[] = await res.json();
      setMenuItems(data);
    } catch (err: any) {
      console.error("Napaka pri pridobivanju menija:", err);
      // Don't show toast for this error as it's not critical for the main functionality
    }
  };

  useEffect(() => {
    if (user) {
      fetchLostItems();
      fetchFoundItems();
      fetchVeselice();
      fetchMenu();
    }
  }, [user]);

  // Fetch menu when reward veselica changes
  useEffect(() => {
    if (showAddForm && activeTab === "found" && formData.reward_veselica_id) {
      fetchMenu(formData.reward_veselica_id);
    }
  }, [formData.reward_veselica_id, showAddForm, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      showToast("Ni dostopnega žetona", "error");
      return;
    }

    let endpoint = "/lost";
    let method = editingItem ? "PUT" : "POST";
    let url = "";
    let bodyData: any = { name: formData.name, description: formData.description, veselica_id: formData.found_veselica_id };

    if (activeTab === "found") {
      if (editingItem) {
        // For editing found items, use PUT /found/:id
        endpoint = "/found";
        url = `http://localhost:9000${endpoint}/${editingItem._id}`;
      } else {
        // For new found items, use POST /foundAndOrderFood
        endpoint = "/foundAndOrderFood";
        url = `http://localhost:9000${endpoint}`;
        // Transform formData for API call - map found_veselica_id to veselica_id
        bodyData = {
          ...bodyData,
          userId: user?.uporabnisko_ime,
          food_name: formData.food_name
        };
      }
    } else {
      // Lost items
      url = editingItem
        ? `http://localhost:9000${endpoint}/${editingItem._id}`
        : `http://localhost:9000${endpoint}`;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        throw new Error("Napaka pri shranjevanju");
      }

      const responseData = await res.json();

      if (activeTab === "found" && !editingItem) {
        if (responseData.foodOrderResponse) {
          showToast(
            "Najden predmet uspešno oddan! Preverite naročila za vaše darilo.",
            "success"
          );
        } else {
          showToast(
            "Najden predmet uspešno oddan! (Darilo ni bilo mogoče obdelati)",
            "success"
          );
        }
      } else {
        showToast(
          editingItem ? "Predmet posodobljen" : "Predmet dodan",
          "success"
        );
      }
      setShowAddForm(false);
      setEditingItem(null);
      setFormData({ name: "", description: "", found_veselica_id: "", reward_veselica_id: "", food_name: "" });

      if (activeTab === "lost") {
        fetchLostItems();
      } else {
        fetchFoundItems();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (item: LostItem | FoundItem) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showToast("Ni dostopnega žetona", "error");
      return;
    }

    const endpoint = item.type === "lost" ? "/lost" : "/found";

    try {
      const res = await fetch(`http://localhost:9000${endpoint}/${item._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Napaka pri brisanju");
      }

    showToast("Predmet izbrisan", "success");

    // Refresh both lists to ensure UI is updated correctly
    fetchLostItems();
    fetchFoundItems();
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleEdit = (item: LostItem | FoundItem) => {
    setActiveTab(item.type);
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      found_veselica_id: item.veselica_id,
      reward_veselica_id: "",
      food_name: "",
    });
    setShowAddForm(true);
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

  if (!user)
    return (
      <div className="not-logged">
        <h2>Ni prijave</h2>
        <p>Za ogled te strani se morate prijaviti.</p>
        <button
          onClick={() => router.push("/login")}
          className="login-button"
        >
          Prijava
        </button>
      </div>
    );

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      {user?.tip_uporabnika === "admin" ? (
        <AdminSidebar user={user} handleLogout={handleLogout} />
      ) : (
        <UserSidebar user={user} handleLogout={handleLogout} activeItem="izgubljeni" />
      )}

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Izgubljeno & najdeno</h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaSearch size={16} />
            </span>
            <span className="badge-text">Prijavite predmete</span>
          </div>
        </header>

        <div className="main-content">
          {/* Create Item Form */}
          {showAddForm && (
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
                      {editingItem
                        ? `Uredi ${editingItem.type === "lost" ? "izgubljen" : "najden"} predmet`
                        : "Dodaj nov predmet"}
                    </h2>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      {editingItem
                        ? "Posodobite podatke o predmetu"
                        : "Izpolnite podatke za nov predmet"}
                    </p>
                  </div>
                </div>

                {/* Close X button */}
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingItem(null);
                      setFormData({ name: "", description: "", found_veselica_id: "", reward_veselica_id: "", food_name: "" });
                  }}
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
                onSubmit={handleSubmit}
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

                    {/* Ime predmeta */}
                    <div className="input-group">
                      <label className="input-label">
                        Ime predmeta{" "}
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
                        placeholder="npr. Denarnica"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Na kateri veselic je bil predmet najden */}
                    <div className="input-group">
                      <label className="input-label">
                        Na kateri veselici je bil predmet najden{" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <select
                        required
                        value={formData.found_veselica_id}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            found_veselica_id: e.target.value,
                          })
                        }
                        className="text-input"
                        style={{ width: "100%" }}
                      >
                        <option value="">Izberi veselico...</option>
                        {veselice.map((veselica) => (
                          <option key={veselica.id} value={veselica.id}>
                            {veselica.ime_veselice} - {veselica.lokacija} ({new Date(veselica.cas).toLocaleDateString("sl-SI")})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Veselic bo pa za kje bo dobil nagrado - samo za najden predmet */}
                    {activeTab === "found" && !editingItem && (
                      <div className="input-group">
                        <label className="input-label">
                          Veselica za nagrado (meni){" "}
                          <span style={{ color: "var(--color-error)" }}>*</span>
                        </label>
                        <select
                          required
                          value={formData.reward_veselica_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              reward_veselica_id: e.target.value,
                            })
                          }
                          className="text-input"
                          style={{ width: "100%" }}
                        >
                          <option value="">Izberi veselico za nagrado...</option>
                          {veselice.map((veselica) => (
                            <option key={veselica.id} value={veselica.id}>
                              {veselica.ime_veselice} - {veselica.lokacija} ({new Date(veselica.cas).toLocaleDateString("sl-SI")})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Izberi hrano - samo za najden predmet */}
                    {activeTab === "found" && !editingItem && (
                      <div className="input-group">
                        <label className="input-label">
                          Izberi hrano{" "}
                          <span style={{ color: "var(--color-error)" }}>*</span>
                        </label>
                        <select
                          required
                          value={formData.food_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              food_name: e.target.value,
                            })
                          }
                          className="text-input"
                          style={{ width: "100%" }}
                        >
                          <option value="">Izberi hrano...</option>
                          {menuItems.filter(item => item.available).map((menuItem) => (
                            <option key={menuItem._id} value={menuItem.name}>
                              {menuItem.name} - €{menuItem.price.toFixed(2)}
                              {menuItem.description && ` (${menuItem.description})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Description and Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "space-between", height: "100%" }}>
                    {/* Opis */}
                    <div className="input-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <label className="input-label">Opis predmeta</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="text-input"
                        placeholder="Dodajte opis predmeta..."
                        style={{
                          width: "100%",
                          resize: "vertical",
                          fontFamily: "inherit",
                          flex: 1,
                          minHeight: "150px",
                        }}
                      />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button
                        type="submit"
                        disabled={false}
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
                        <FaPlus size={16} />
                        {editingItem ? "Posodobi predmet" : "Dodaj predmet"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingItem(null);
                          setFormData({ name: "", description: "", found_veselica_id: "", reward_veselica_id: "", food_name: "" });
                        }}
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

          {/* Items List */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="title-icon">
                  <FaSearch size={20} />
                </span>
                Seznam predmetov
              </h2>
              <div
                style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}
              >
                <span className="badge">Izgubljeno & najdeno</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setActiveTab("lost");
                      setShowAddForm(true);
                      setEditingItem(null);
                      setFormData({ name: "", description: "", found_veselica_id: "", reward_veselica_id: "", food_name: "" });
                    }}
                    className="modern-button"
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: "var(--color-error)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <FaExclamationTriangle size={14} />
                    Prijava izgube
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("found");
                      setShowAddForm(true);
                      setEditingItem(null);
                      setFormData({ name: "", description: "", found_veselica_id: "", reward_veselica_id: "", food_name: "" });
                    }}
                    className="modern-button"
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      background: "var(--color-success)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <FaSearch size={14} />
                    Prijava najdbe
                  </button>
                </div>
              </div>
            </div>

            {false ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam predmete...</p>
              </div>
            ) : (lostItems.length === 0 && foundItems.length === 0) ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Ni predmetov. Dodajte prvi predmet!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* Lost Items Section */}
                {lostItems.length > 0 && (
                  <div>
                    <h3 style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      <FaExclamationTriangle size={20} color="var(--color-warning)" />
                      Izgubljeni predmeti ({lostItems.length})
                    </h3>
                    <div
                      className="items-grid"
                      style={{
                        display: "grid",
                        gap: "1.5rem",
                        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                      }}
                    >
                      {lostItems.map((item) => (
                        <div
                          key={item._id}
                          className="item-card"
                          style={{
                            background: "var(--color-card)",
                            borderRadius: "12px",
                            padding: "20px",
                            boxShadow: "0 4px 20px var(--color-shadow)",
                            border: "1px solid var(--color-border)",
                            transition: "all 0.3s ease",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.12)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 20px var(--color-shadow)";
                          }}
                        >
                          {/* Header with name and actions */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: "12px",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <h3
                                style={{
                                  fontSize: "1.25rem",
                                  fontWeight: 700,
                                  margin: 0,
                                  marginBottom: "0.5rem",
                                  color: "var(--color-text)",
                                }}
                              >
                                {item.name}
                              </h3>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span
                                  style={{
                                    background: "var(--color-error)",
                                    color: "white",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  IZGUBLJEN
                                </span>
                              </div>
                            </div>
                            <div className="item-actions">
                              <button
                                className="action-button edit"
                                onClick={() => handleEdit(item)}
                                title="Uredi"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                className="action-button delete"
                                onClick={() => handleDelete(item)}
                                title="Izbriši"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--color-text-light)",
                                margin: 0,
                                lineHeight: 1.6,
                                marginBottom: "1rem",
                              }}
                            >
                              {item.description}
                            </p>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: "1rem",
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
                                  <FaMapMarkerAlt size={14} />
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-light)",
                                    fontWeight: 600,
                                  }}
                                >
                                  Veselica: {veselice.find(v => v.id === item.veselica_id)?.ime_veselice || item.veselica_id}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--color-text-light)",
                                }}
                              >
                                {new Date(item.createdAt).toLocaleDateString("sl-SI")}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Found Items Section */}
                {foundItems.length > 0 && (
                  <div>
                    <h3 style={{
                      fontSize: "1.25rem",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}>
                      <FaSearch size={20} color="var(--color-success)" />
                      Najdeni predmeti ({foundItems.length})
                    </h3>
                    <div
                      className="items-grid"
                      style={{
                        display: "grid",
                        gap: "1.5rem",
                        gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                      }}
                    >
                      {foundItems.map((item) => (
                        <div
                          key={item._id}
                          className="item-card"
                          style={{
                            background: "var(--color-card)",
                            borderRadius: "12px",
                            padding: "20px",
                            boxShadow: "0 4px 20px var(--color-shadow)",
                            border: "1px solid var(--color-border)",
                            transition: "all 0.3s ease",
                            position: "relative",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0, 0, 0, 0.12)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = "0 4px 20px var(--color-shadow)";
                          }}
                        >
                          {/* Header with name and actions */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: "12px",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <h3
                                style={{
                                  fontSize: "1.25rem",
                                  fontWeight: 700,
                                  margin: 0,
                                  marginBottom: "0.5rem",
                                  color: "var(--color-text)",
                                }}
                              >
                                {item.name}
                              </h3>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span
                                  style={{
                                    background: "var(--color-success)",
                                    color: "white",
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "12px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  NAJDEN
                                </span>
                              </div>
                            </div>
                            <div className="item-actions">
                              <button
                                className="action-button edit"
                                onClick={() => handleEdit(item)}
                                title="Uredi"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                className="action-button delete"
                                onClick={() => handleDelete(item)}
                                title="Izbriši"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                fontSize: "0.875rem",
                                color: "var(--color-text-light)",
                                margin: 0,
                                lineHeight: 1.6,
                                marginBottom: "1rem",
                              }}
                            >
                              {item.description}
                            </p>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingTop: "1rem",
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
                                  <FaMapMarkerAlt size={14} />
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-light)",
                                    fontWeight: 600,
                                  }}
                                >
                                  Veselica: {veselice.find(v => v.id === item.veselica_id)?.ime_veselice || item.veselica_id}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--color-text-light)",
                                }}
                              >
                                {new Date(item.createdAt).toLocaleDateString("sl-SI")}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LostAndFoundPage;
