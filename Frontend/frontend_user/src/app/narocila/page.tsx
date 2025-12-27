"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserSidebar from "../../components/UserSidebar";
import AdminSidebar from "../../components/AdminSidebar";
import {
  FaUser,
  FaSignOutAlt,
  FaClipboardList,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaCreditCard,
  FaTrash,
  FaUtensils,
  FaEdit,
} from "react-icons/fa";
import "../uporabnik/dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, UserResponse, Order } from "../../types";

const OrdersPage = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    document.title = "Naročila";
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
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      let url: string;
      if (user?.tip_uporabnika === "admin") {
        url = "http://localhost:8001/orders";
      } else {
        url = `http://localhost:8001/orders/user/${user?.username || user?.uporabnisko_ime}`;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Neuspešno pridobivanje naročil.");
      }

      const data: Order[] = await res.json();
      setOrders(data);
    } catch (err: any) {
      const errorMessage = err.message || err.detail || err.error || "Napaka pri pridobivanju naročil.";
      showToast(typeof errorMessage === 'string' ? errorMessage : "Napaka pri pridobivanju naročil.", "error");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handlePayOrder = async (orderId: string, amount: number) => {
    setPayingOrderId(orderId);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8001/orders/${orderId}/pay`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          amount: amount,
          method: "card",
          transaction_id: `txn_${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri plačilu naročila.");
      }

      showToast("Naročilo uspešno plačano!", "success");
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || "Napaka pri plačilu naročila.", "error");
    } finally {
      setPayingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Ali ste prepričani, da želite izbrisati to naročilo?")) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const headers: Record<string, string> = {};

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8001/orders/${orderId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri brisanju naročila.");
      }

      showToast("Naročilo uspešno izbrisano!", "success");
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || "Napaka pri brisanju naročila.", "error");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatusId(orderId);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      const res = await fetch(`http://localhost:8001/orders/${orderId}/status`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Napaka pri posodabljanju statusa naročila.");
      }

      showToast("Status naročila uspešno posodobljen!", "success");
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || "Napaka pri posodabljanju statusa naročila.", "error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "created":
      case "pending":
        return "var(--color-warning)";
      case "confirmed":
      case "preparing":
        return "var(--color-info)";
      case "ready":
      case "completed":
        return "var(--color-success)";
      case "cancelled":
        return "var(--color-error)";
      default:
        return "var(--color-text-light)";
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      created: "Ustvarjeno",
      pending: "V čakanju",
      confirmed: "Potrjeno",
      preparing: "Pripravlja se",
      ready: "Pripravljeno",
      completed: "Dokončano",
      cancelled: "Preklicano",
    };
    return statusMap[status.toLowerCase()] || status;
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

  if (!user) return null;

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      {user?.tip_uporabnika === "admin" ? (
        <AdminSidebar user={user} handleLogout={handleLogout} activeItem="narocila" />
      ) : (
        <UserSidebar user={user} handleLogout={handleLogout} activeItem="narocila" />
      )}

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">
            {user?.tip_uporabnika === "admin" ? "Vsa naročila" : "Moja naročila"}
          </h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaUtensils size={16} />
            </span>
            <span className="badge-text">
              {user?.tip_uporabnika === "admin" ? `${orders.length} ${orders.length === 1 ? "naročilo" : orders.length === 2 ? "naročili" : orders.length === 3 || orders.length === 4 ? "naročila" : "naročil"}` : `${orders.length} ${orders.length === 1 ? "naročilo" : orders.length === 2 ? "naročili" : orders.length === 3 || orders.length === 4 ? "naročila" : "naročil"}`}
            </span>
          </div>
        </header>

        <div className="main-content">
          {loadingOrders ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <p>Nalagam naročila...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="profile-card">
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <FaShoppingCart size={48} color="var(--color-text-light)" />
                </div>
                <h3 style={{ color: "var(--color-text-light)", marginBottom: "0.5rem" }}>
                  {user?.tip_uporabnika === "admin" ? "Ni naročil" : "Nimate še nobenega naročila"}
                </h3>
                <p style={{ color: "var(--color-text-light)" }}>
                  {user?.tip_uporabnika === "admin"
                    ? "Uporabniki še niso naročili hrane."
                    : "Začnite z naročanjem hrane na straneh veselica."}
                </p>
              </div>
            </div>
          ) : (
            <div className="profile-card">
              <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">
                  <FaShoppingCart size={20} />
                </span>
                Seznam naročil
              </h2>
                <span className="section-badge">Pregled</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gap: "1.5rem",
                  gridTemplateColumns: "repeat(5, 1fr)",
                }}
              >
                {orders.map((order) => (
                  <div
                    key={order.id}
                    style={{
                      background: "var(--color-bg)",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1rem",
                      minHeight: "280px",
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
                    {/* Order Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <h4
                          style={{
                            fontSize: "1rem",
                            fontWeight: 600,
                            margin: "0 0 0.5rem 0",
                            color: "var(--color-text)",
                          }}
                        >
                          Naročilo #{order.id.slice(-8)}
                        </h4>
                        {user?.tip_uporabnika === "admin" && (
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "var(--color-text-light)",
                              margin: 0,
                            }}
                          >
                            Uporabnik: {order.user_id}
                          </p>
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            background: getStatusColor(order.status),
                            color: "white",
                          }}
                        >
                          {getStatusText(order.status)}
                        </span>
                        {order.paid ? (
                          <FaCheckCircle size={16} color="var(--color-success)" />
                        ) : (
                          <FaTimesCircle size={16} color="var(--color-error)" />
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div style={{ flex: 1 }}>
                      <h5
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          margin: "0 0 0.75rem 0",
                          color: "var(--color-text)",
                        }}
                      >
                        Artikli:
                      </h5>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {order.items.map((item, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.5rem",
                              background: "var(--color-input-bg)",
                              borderRadius: "8px",
                            }}
                          >
                            <span style={{ fontSize: "0.875rem" }}>
                              {item.item_id}
                            </span>
                            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                              × {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Footer */}
                    <div
                      style={{
                        borderTop: "1px solid var(--color-border)",
                        paddingTop: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        <span style={{ fontSize: "1rem", fontWeight: 600 }}>
                          Skupaj: €{order.total_price.toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: order.paid ? "var(--color-success)" : "var(--color-error)",
                            fontWeight: 600,
                          }}
                        >
                          {order.paid ? "Plačano" : "Ni plačano"}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          gap: "0.75rem",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        {/* Admin Status Update */}
                        {user?.tip_uporabnika === "admin" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <FaEdit size={14} color="var(--color-text-light)" />
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              disabled={updatingStatusId === order.id}
                              style={{
                                padding: "0.5rem 0.75rem",
                                background: "var(--color-input-bg)",
                                color: "var(--color-text)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 500,
                                cursor: updatingStatusId === order.id ? "not-allowed" : "pointer",
                                opacity: updatingStatusId === order.id ? 0.6 : 1,
                                minWidth: "140px",
                              }}
                            >
                              <option value="created">Ustvarjeno</option>
                              <option value="confirmed">Potrjeno</option>
                              <option value="preparing">Pripravlja se</option>
                              <option value="ready">Pripravljeno</option>
                              <option value="completed">Dokončano</option>
                              <option value="cancelled">Preklicano</option>
                            </select>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "0.5rem", marginLeft: "auto" }}>
                          {!order.paid && user?.tip_uporabnika !== "admin" && (
                            <button
                              onClick={() => handlePayOrder(order.id, order.total_price)}
                              disabled={payingOrderId === order.id}
                              style={{
                                padding: "0.6rem 1rem",
                                background: "var(--color-success)",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                cursor: payingOrderId === order.id ? "not-allowed" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.4rem",
                                opacity: payingOrderId === order.id ? 0.6 : 1,
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (payingOrderId !== order.id) {
                                  e.currentTarget.style.background = "#27ae60";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (payingOrderId !== order.id) {
                                  e.currentTarget.style.background = "var(--color-success)";
                                }
                              }}
                            >
                              {payingOrderId === order.id ? (
                                <>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      width: "10px",
                                      height: "10px",
                                      border: "2px solid white",
                                      borderTopColor: "transparent",
                                      borderRadius: "50%",
                                      animation: "spin 0.6s linear infinite",
                                    }}
                                  />
                                  Plačujem...
                                </>
                              ) : (
                                <>
                                  <FaCreditCard size={12} />
                                  Plaćaj
                                </>
                              )}
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={deletingOrderId === order.id || order.paid}
                            style={{
                              padding: "0.6rem 1rem",
                              background: order.paid ? "var(--color-input-bg)" : "var(--color-error)",
                              color: order.paid ? "var(--color-text-light)" : "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: order.paid || deletingOrderId === order.id ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.4rem",
                              opacity: order.paid || deletingOrderId === order.id ? 0.6 : 1,
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              if (!order.paid && deletingOrderId !== order.id) {
                                e.currentTarget.style.background = "#d32f2f";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!order.paid && deletingOrderId !== order.id) {
                                e.currentTarget.style.background = "var(--color-error)";
                              }
                            }}
                          >
                            {deletingOrderId === order.id ? (
                              <>
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: "10px",
                                    height: "10px",
                                    border: "2px solid currentColor",
                                    borderTopColor: "transparent",
                                    borderRadius: "50%",
                                    animation: "spin 0.6s linear infinite",
                                  }}
                                />
                                Brišem...
                              </>
                            ) : (
                              <>
                                <FaTrash size={12} />
                                Izbriši
                              </>
                            )}
                          </button>
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

export default OrdersPage;
