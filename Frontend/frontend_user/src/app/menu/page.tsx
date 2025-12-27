"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  FaUtensils,
} from "react-icons/fa";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, UserResponse, MenuItem } from "../../types";

const MenuPage = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    document.title = "Meni";
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    available: true,
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
        setAccessToken(data.access_token || null);
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
      fetchMenuItems();
    }
  }, [user]);

  const fetchMenuItems = async () => {
    setLoadingMenu(true);
    try {
      const res = await fetch("http://localhost:8001/menu", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje menija.");
      }
      const data: MenuItem[] = await res.json();
      setMenuItems(data);
    } catch (err: any) {
      showToast(err.message || "Napaka pri pridobivanju menija.", "error");
    } finally {
      setLoadingMenu(false);
    }
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("http://localhost:8001/menu", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price: formData.price,
          available: formData.available,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri ustvarjanju jedi.");
      }

      showToast("Jedi uspešno dodana!", "success");
      setShowCreateForm(false);
      setFormData({
        name: "",
        description: "",
        price: 0,
        available: true,
      });
      fetchMenuItems();
    } catch (err: any) {
      showToast(err.message || "Napaka pri ustvarjanju jedi.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMenuItem = async (
    itemId: string,
    itemName: string
  ) => {
    if (
      !confirm(
        `Ali ste prepričani, da želite izbrisati jed "${itemName}"?`
      )
    ) {
      return;
    }

    setDeletingId(itemId);
    try {
      const headers: Record<string, string> = {};

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8001/menu/${itemId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri brisanju jedi.");
      }

      showToast("Jedi uspešno izbrisana!", "success");
      fetchMenuItems();
    } catch (err: any) {
      showToast(err.message || "Napaka pri brisanju jedi.", "error");
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
      <AdminSidebar user={user} handleLogout={handleLogout} activeItem="menu" />

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Upravljanje menija</h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaShieldAlt size={16} />
            </span>
            <span className="badge-text">Administrator</span>
          </div>
        </header>

        <div className="main-content">
          {/* Create Menu Item Form */}
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
                      Dodaj novo jed
                    </h2>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--color-text-light)",
                        margin: "0.25rem 0 0 0",
                      }}
                    >
                      Izpolnite podatke za novo jed v meniju
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleCreateMenuItem}
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
                    {/* Ime jedi */}
                    <div className="input-group">
                      <label className="input-label">
                        Ime jedi{" "}
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
                        placeholder="npr. Pizza Margherita"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Cena */}
                    <div className="input-group">
                      <label className="input-label">
                        Cena (€){" "}
                        <span style={{ color: "var(--color-error)" }}>*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="text-input"
                        placeholder="0.00"
                        style={{ width: "100%" }}
                      />
                    </div>

                    {/* Na voljo */}
                    <div className="input-group">
                      <label className="input-label">Na voljo</label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={formData.available}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              available: e.target.checked,
                            })
                          }
                          style={{ width: "18px", height: "18px" }}
                        />
                        <span>Jed je na voljo za naročilo</span>
                      </label>
                    </div>
                  </div>

                  {/* Right Column - Description and Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "space-between", height: "100%" }}>
                    {/* Opis */}
                    <div className="input-group" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                      <label className="input-label">Opis jedi</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="text-input"
                        placeholder="Dodajte opis jedi..."
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
                            Dodaj jed
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

          {/* Menu Items List */}
          <div className="profile-card">
            <div className="card-header">
              <h2 className="card-title">
                <span className="title-icon">
                  <FaUtensils size={20} />
                </span>
                Seznam jedi
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
                  Nova jed
                </button>
              </div>
            </div>

            {loadingMenu ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p>Nalagam meni...</p>
              </div>
            ) : menuItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <p style={{ color: "var(--color-text-light)" }}>
                  Ni jedi v meniju. Dodajte prvo jed!
                </p>
              </div>
            ) : (
              <div
                className="menu-grid"
                style={{
                  display: "grid",
                  gap: "1.5rem",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                }}
              >
                {menuItems.map((item) => (
                  <div
                    key={item._id}
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
                    {/* Header with name and delete button */}
                    <div
                      style={{
                        padding: "1.5rem 1.5rem 1rem 1.5rem",
                        background: item.available
                          ? "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))"
                          : "linear-gradient(135deg, #666, #444)",
                        color: "white",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h3
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            margin: 0,
                            marginBottom: "0.5rem",
                          }}
                        >
                          {item.name}
                        </h3>
                        <p
                          style={{
                            fontSize: "1.5rem",
                            fontWeight: 600,
                            margin: 0,
                          }}
                        >
                          €{item.price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMenuItem(item._id, item.name);
                        }}
                        disabled={deletingId === item._id}
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
                            deletingId === item._id ? "not-allowed" : "pointer",
                          color: "white",
                          transition: "all 0.2s",
                          opacity: deletingId === item._id ? 0.6 : 1,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          marginLeft: "0.75rem",
                        }}
                        onMouseEnter={(e) => {
                          if (deletingId !== item._id) {
                            e.currentTarget.style.background =
                              "rgba(211, 47, 47, 1)";
                            e.currentTarget.style.transform = "scale(1.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (deletingId !== item._id) {
                            e.currentTarget.style.background =
                              "rgba(211, 47, 47, 0.9)";
                            e.currentTarget.style.transform = "scale(1)";
                          }
                        }}
                        title="Izbriši jed"
                      >
                        {deletingId === item._id ? (
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

                    {/* Content */}
                    <div style={{ padding: "1.5rem", flex: 1 }}>
                      {item.description && (
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
                      )}

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
                          <span
                            style={{
                              color: item.available
                                ? "var(--color-success)"
                                : "var(--color-error)",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                            }}
                          >
                            {item.available ? "✓ Na voljo" : "✗ Ni na voljo"}
                          </span>
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

export default MenuPage;
