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
  FaUtensils,
  FaPlus,
  FaMinus,
  FaShoppingCart,
  FaMusic,
  FaHeart,
  FaTrash,
  FaRedo,
} from "react-icons/fa";
import "../../uporabnik/dashboard.css";
import { showToast } from "../../../utils/toast";
import { UserData, UserResponse, Veselica, MenuItem, OrderItem, CreateOrderRequest, Order, MusicRequest, CreateMusicRequest } from "../../../types";
import AdminSidebar from "../../../components/AdminSidebar";
import UserSidebar from "../../../components/UserSidebar";

const VeselicaDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const veselicaId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [veselica, setVeselica] = useState<Veselica | null>(null);
  const [loadingVeselica, setLoadingVeselica] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUnregistering, setIsUnregistering] = useState(false);

  // Food ordering state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Music requests state
  const [musicRequests, setMusicRequests] = useState<MusicRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [votingRequests, setVotingRequests] = useState<Set<string>>(new Set());
  const [newSongName, setNewSongName] = useState("");
  const [newArtist, setNewArtist] = useState("");

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
    if (user && veselicaId) {
      fetchVeselica();
      fetchMenuItems();
      fetchMusicRequests();
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

  const fetchMenuItems = async () => {
    setLoadingMenu(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("http://localhost:8001/menu", {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje menija.");
      }
      const data: MenuItem[] = await res.json();
      setMenuItems(data.filter(item => item.available)); // Only show available items
    } catch (err: any) {
      const errorMessage = err.message || err.detail || err.error || "Napaka pri pridobivanju menija.";
      showToast(typeof errorMessage === 'string' ? errorMessage : "Napaka pri pridobivanju menija.", "error");
    } finally {
      setLoadingMenu(false);
    }
  };

  const addToOrder = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromOrder = (itemId: string) => {
    setSelectedItems(prev => {
      const newQuantity = (prev[itemId] || 0) - 1;
      if (newQuantity <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const getTotalItems = () => {
    return Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalPrice = () => {
    return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
      const item = menuItems.find(m => m._id === itemId);
      return total + (item ? item.price * quantity : 0);
    }, 0);
  };

  const handleCreateOrder = async () => {
    if (Object.keys(selectedItems).length === 0) {
      showToast("Izberite vsaj eno jed za naročilo.", "error");
      return;
    }

    setCreatingOrder(true);
    try {
      const items: OrderItem[] = Object.entries(selectedItems).map(([itemId, quantity]) => {
        const menuItem = menuItems.find(item => item._id === itemId);
        return {
          item_id: menuItem ? menuItem.name : itemId, // Send name instead of _id
          quantity
        };
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch("http://localhost:8001/orders", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          user_id: "temp", // Will be overridden by backend
          items,
          status: "created",
          paid: false
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || errorData.error || "Napaka pri ustvarjanju naročila.";
        throw new Error(typeof errorMessage === 'string' ? errorMessage : "Napaka pri ustvarjanju naročila.");
      }

      const data = await res.json();
      showToast("Naročilo uspešno ustvarjeno!", "success");
      setSelectedItems({});
      // Optionally redirect to orders page
      router.push("/narocila");
    } catch (err: any) {
      showToast(err.message || "Napaka pri ustvarjanju naročila.", "error");
    } finally {
      setCreatingOrder(false);
    }
  };

  const fetchMusicRequests = async () => {
    setLoadingRequests(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8004/music/requests/veselica/${encodeURIComponent(veselicaId)}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje glasbenih želja.");
      }

      const data: MusicRequest[] = await res.json();
      setMusicRequests(data);
    } catch (err: any) {
      const errorMessage = err.message || err.detail || err.error || "Napaka pri pridobivanju glasbenih želja.";
      showToast(typeof errorMessage === 'string' ? errorMessage : "Napaka pri pridobivanju glasbenih želja.", "error");
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleCreateMusicRequest = async () => {
    if (!newSongName.trim()) {
      showToast("Vnesite ime pesmi.", "error");
      return;
    }

    setCreatingRequest(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const requestBody: any = {
        song_name: newSongName.trim(),
        id_veselica: veselicaId,
      };
      if (newArtist.trim()) {
        requestBody.artist = newArtist.trim();
      }

      const res = await fetch("http://localhost:8004/music/requests", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || errorData.error || "Napaka pri ustvarjanju glasbene želje.";
        throw new Error(typeof errorMessage === 'string' ? errorMessage : "Napaka pri ustvarjanju glasbene želje.");
      }

      const data = await res.json();
      showToast("Glasbena želja uspešno ustvarjena!", "success");
      setNewSongName("");
      setNewArtist("");
      fetchMusicRequests(); // Refresh the list
    } catch (err: any) {
      showToast(err.message || "Napaka pri ustvarjanju glasbene želje.", "error");
    } finally {
      setCreatingRequest(false);
    }
  };

  const handleVote = async (requestId: string) => {
    if (votingRequests.has(requestId)) return;

    setVotingRequests(prev => new Set(prev).add(requestId));
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8004/music/requests/${encodeURIComponent(requestId)}/vote`, {
        method: "POST",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.detail || errorData.message || errorData.error || "Napaka pri glasovanju.";
        throw new Error(typeof errorMessage === 'string' ? errorMessage : "Napaka pri glasovanju.");
      }

      showToast("Glas uspešno oddan!", "success");
      fetchMusicRequests(); // Refresh the list
    } catch (err: any) {
      showToast(err.message || "Napaka pri glasovanju.", "error");
    } finally {
      setVotingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
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
      fetchMusicRequests(); // Refresh the list
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
      fetchMusicRequests(); // Refresh the list
    } catch (err: any) {
      showToast(err.message || "Napaka pri ponastavitvi glasov.", "error");
    }
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
      {user.tip_uporabnika === "admin" ? (
        <AdminSidebar user={user} handleLogout={handleLogout} activeItem="veselice" />
      ) : (
        <UserSidebar user={user} handleLogout={handleLogout} activeItem="veselice" />
      )}

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

            {/* Food Ordering Section */}
            {registered && (
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
                  <FaUtensils size={20} />
                  Naroči hrano
                </h3>

                {loadingMenu ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <p>Nalagam meni...</p>
                  </div>
                ) : menuItems.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <p style={{ color: "var(--color-text-light)" }}>
                      Trenutno ni jedi na voljo za naročilo.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Menu Items */}
                    <div
                      style={{
                        display: "grid",
                        gap: "1.5rem",
                        marginBottom: "2rem",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                      }}
                    >
                      {menuItems.map((item) => {
                        const quantity = selectedItems[item._id] || 0;
                        return (
                          <div
                            key={item._id}
                            style={{
                              background: "var(--color-bg)",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid var(--color-border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "1rem",
                              minHeight: "200px",
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
                                  margin: "0 0 0.75rem 0",
                                  color: "var(--color-text)",
                                }}
                              >
                                {item.name}
                              </h4>
                              {item.description && (
                                <p
                                  style={{
                                    fontSize: "0.875rem",
                                    color: "var(--color-text-light)",
                                    margin: "0 0 1rem 0",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "1rem",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "1.25rem",
                                  fontWeight: 700,
                                  color: "var(--color-primary)",
                                }}
                              >
                                €{item.price.toFixed(2)}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                }}
                              >
                                <button
                                  onClick={() => removeFromOrder(item._id)}
                                  disabled={quantity === 0}
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: quantity === 0 ? "var(--color-input-bg)" : "var(--color-error)",
                                    color: quantity === 0 ? "var(--color-text-light)" : "white",
                                    cursor: quantity === 0 ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (quantity > 0) {
                                      e.currentTarget.style.background = "#d32f2f";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (quantity > 0) {
                                      e.currentTarget.style.background = "var(--color-error)";
                                    }
                                  }}
                                >
                                  <FaMinus size={14} />
                                </button>
                                <span
                                  style={{
                                    fontSize: "1.125rem",
                                    fontWeight: 600,
                                    minWidth: "32px",
                                    textAlign: "center",
                                    color: "var(--color-text)",
                                  }}
                                >
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => addToOrder(item._id)}
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "8px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-primary)",
                                    color: "white",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "var(--color-primary-dark)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "var(--color-primary)";
                                  }}
                                >
                                  <FaPlus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Summary */}
                    {getTotalItems() > 0 && (
                      <div
                        style={{
                          background: "var(--color-bg)",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid var(--color-border)",
                          marginBottom: "1.5rem",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            margin: "0 0 1rem 0",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <FaShoppingCart size={16} />
                          Povzetek naročila
                        </h4>
                        <div style={{ marginBottom: "1rem" }}>
                          {Object.entries(selectedItems).map(([itemId, quantity]) => {
                            const item = menuItems.find(m => m._id === itemId);
                            if (!item) return null;
                            return (
                              <div
                                key={itemId}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "0.5rem 0",
                                  borderBottom: "1px solid var(--color-border)",
                                }}
                              >
                                <span style={{ fontSize: "0.875rem" }}>
                                  {item.name} × {quantity}
                                </span>
                                <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                                  €{(item.price * quantity).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.75rem 0",
                            borderTop: "2px solid var(--color-border)",
                            fontSize: "1rem",
                            fontWeight: 600,
                          }}
                        >
                          <span>Skupaj:</span>
                          <span>€{getTotalPrice().toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Order Button */}
                    {getTotalItems() > 0 && (
                      <div style={{ display: "flex", gap: "1rem", justifyContent: "right" }}>
                        <button
                          onClick={() => {
                            setSelectedItems({});
                          }}
                          style={{
                            flex: 1,
                            maxWidth: "200px",
                            padding: "1rem 2rem",
                            fontSize: "1rem",
                            fontWeight: 600,
                            background: "var(--color-input-bg)",
                            color: "var(--color-text)",
                            border: "2px solid var(--color-border)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            height: "48px",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--color-border)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "var(--color-input-bg)";
                          }}
                        >
                          Prekliči
                        </button>
                        <button
                          onClick={handleCreateOrder}
                          disabled={creatingOrder}
                          className="modern-button primary"
                          style={{
                            flex: 1,
                            maxWidth: "300px",
                            padding: "1rem 2rem",
                            fontSize: "1rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            height: "48px",
                          }}
                        >
                          {creatingOrder ? (
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
                              Ustvarjam naročilo...
                            </>
                          ) : (
                            <>
                              <FaShoppingCart size={16} />
                              Oddaj naročilo (€{getTotalPrice().toFixed(2)})
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Music Requests Section */}
            {registered && (
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
                  <FaMusic size={20} />
                  Glasbene želje ({musicRequests.length})
                </h3>

                {/* Create Request Form */}
                <div
                  style={{
                    background: "var(--color-bg)",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    border: "1px solid var(--color-border)",
                    marginBottom: "1.5rem",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      margin: "0 0 1rem 0",
                      color: "var(--color-text)",
                    }}
                  >
                    Dodaj novo pesem
                  </h4>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "var(--color-text-light)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Ime pesmi *
                      </label>
                      <input
                        type="text"
                        value={newSongName}
                        onChange={(e) => setNewSongName(e.target.value)}
                        placeholder="Vnesite ime pesmi"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          background: "var(--color-input-bg)",
                          color: "var(--color-text)",
                          fontSize: "1rem",
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "var(--color-text-light)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Izvajalec (neobvezno)
                      </label>
                      <input
                        type="text"
                        value={newArtist}
                        onChange={(e) => setNewArtist(e.target.value)}
                        placeholder="Vnesite izvajalca"
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          background: "var(--color-input-bg)",
                          color: "var(--color-text)",
                          fontSize: "1rem",
                        }}
                      />
                    </div>
                    <button
                      onClick={handleCreateMusicRequest}
                      disabled={creatingRequest || !newSongName.trim()}
                      style={{
                        padding: "0.75rem 1.5rem",
                        fontSize: "1rem",
                        fontWeight: 600,
                        background: "var(--color-primary)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: creatingRequest || !newSongName.trim() ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        opacity: creatingRequest || !newSongName.trim() ? 0.6 : 1,
                        minWidth: "120px",
                        justifyContent: "center",
                      }}
                    >
                      {creatingRequest ? (
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
                          <FaPlus size={14} />
                          Dodaj
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Requests List */}
                {loadingRequests ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <p>Nalagam glasbene želje...</p>
                  </div>
                ) : musicRequests.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <p style={{ color: "var(--color-text-light)" }}>
                      Še ni glasbenih želja. Bodite prvi, ki dodate pesem!
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
                    {musicRequests.map((request) => (
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
                            onClick={() => handleVote(request.id)}
                            disabled={votingRequests.has(request.id)}
                            style={{
                              flex: 1,
                              padding: "0.5rem 1rem",
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              background: "var(--color-primary)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: votingRequests.has(request.id) ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.5rem",
                              opacity: votingRequests.has(request.id) ? 0.6 : 1,
                              minHeight: "32px",
                            }}
                          >
                            {votingRequests.has(request.id) ? (
                              <>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: "12px",
                                    height: "12px",
                                    border: "2px solid white",
                                    borderTopColor: "transparent",
                                    borderRadius: "50%",
                                    animation: "spin 0.6s linear infinite",
                                  }}
                                />
                                Glasujem...
                              </>
                            ) : (
                              <>
                                <FaHeart size={12} />
                                Glasuj
                              </>
                            )}
                          </button>
                          {user.tip_uporabnika === "admin" && (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <button
                onClick={() => router.push("/veselice-pregled")}
                style={{
                  flex: 1,
                  padding: "1rem 2rem",
                  fontSize: "1rem",
                  fontWeight: 600,
                  background: "var(--color-input-bg)",
                  color: "var(--color-text)",
                  border: "2px solid var(--color-border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  height: "48px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-border)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--color-input-bg)";
                }}
              >
                <FaArrowLeft size={16} />
                Nazaj na seznam
              </button>

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
                    height: "48px",
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
                    height: "48px",
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
