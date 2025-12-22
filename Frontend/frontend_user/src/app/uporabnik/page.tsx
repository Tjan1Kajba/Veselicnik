"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UpdateUserForm from "./UpdateUserForm";
import ChangePasswordForm from "./ChangePasswordForm";
import {
  FaUser,
  FaLock,
  FaCog,
  FaSignOutAlt,
  FaShieldAlt,
  FaEnvelope,
  FaClipboardList,
  FaKey,
  FaCheck,
  FaExclamation,
  FaBell,
  FaExclamationTriangle,
} from "react-icons/fa";
import "./dashboard.css"; 



interface UserData {
  id: string;
  username: string;
  email: string;
  [key: string]: any;
}

interface UserResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserData;
  [key: string]: any;
}

const UserProfile = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "settings"
  >("profile");
  const router = useRouter();

  const fetchUser = () => {
    setLoading(true);
    fetch("http://localhost:8002/uporabnik/prijavljen", {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Neuspešno pridobivanje podatkov.");
        const data: UserResponse = await res.json();

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
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const handleLogout = () => {
    fetch("http://localhost:8002/uporabnik/odjava", {
      method: "POST",
      credentials: "include",
    }).then(() => {
      router.push("/");
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

  if (!user)
    return (
      <div className="not-logged">
        <h2>Ni prijave</h2>
        <p>Za ogled profila se morate prijaviti.</p>
        <button
          onClick={() => router.push("/prijava")}
          className="login-button"
        >
          Prijava
        </button>
      </div>
    );

  // Define fields that should NOT be displayed to the user
  const hiddenFields = [
    "geslo",
    "password",
    "access_token",
    "refresh_token",
    "token_type",
    "expires_in",
    "token",
    "sessionToken",
    "authToken",
    "__v",
    "_id",
    "id_veselica", // Če tega ne želite prikazati
  ];

  // Format field names for better display (Slovenian)
  const formatFieldName = (key: string): string => {
    const fieldNames: Record<string, string> = {
      id: "ID",
      username: "Uporabniško ime",
      uporabnisko_ime: "Uporabniško ime",
      email: "E-pošta",
      name: "Ime",
      ime: "Ime",
      surname: "Priimek",
      priimek: "Priimek",
      spol: "Spol",
      tip_uporabnika: "Tip uporabnika",
      ustvarjeno: "Ustvarjeno",
      posodobljeno: "Posodobljeno",
      createdAt: "Ustvarjeno",
      updatedAt: "Posodobljeno",
    };

    return (
      fieldNames[key] ||
      key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    );
  };

  // Format value for better display
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined || value === "") {
      return "Ni podatka";
    }

    // Format dates
    if (
      key.includes("datum") ||
      key.includes("created") ||
      key.includes("updated") ||
      key.includes("ustvarjeno") ||
      key.includes("posodobljeno")
    ) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString("sl-SI", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      } catch {
        return String(value);
      }
    }

    // Format boolean values
    if (typeof value === "boolean") {
      return value ? "Da" : "Ne";
    }

    return String(value);
  };

  // Get data type for display
  const getDataType = (value: any): string => {
    if (value === null || value === undefined) return "Ni podatka";
    if (typeof value === "boolean") return "Boolean";
    if (typeof value === "number") return "Število";
    if (typeof value === "object") return "Objekt";
    if (typeof value === "string") {
      // Check if it's a date
      if (!isNaN(Date.parse(value)) && value.length > 5) {
        return "Datum";
      }
      return "Tekst";
    }
    return typeof value;
  };

  // Get display data from user object
  const getDisplayData = () => {
    const displayData: Array<{ key: string; value: any; displayName: string }> =
      [];

    // Define the order of fields for better presentation
    const fieldOrder = [
      "uporabnisko_ime",
      "username",
      "ime",
      "name",
      "priimek",
      "surname",
      "email",
      "spol",
      "tip_uporabnika",
    ];

    // Add ordered fields first
    fieldOrder.forEach((key) => {
      if (user[key] !== undefined && !hiddenFields.includes(key)) {
        displayData.push({
          key,
          value: user[key],
          displayName: formatFieldName(key),
        });
      }
    });

    // Add remaining fields (excluding hidden ones and already added ones)
    Object.entries(user).forEach(([key, value]) => {
      if (
        !hiddenFields.includes(key) &&
        !fieldOrder.includes(key) &&
        !displayData.some((item) => item.key === key)
      ) {
        displayData.push({
          key,
          value,
          displayName: formatFieldName(key),
        });
      }
    });

    return displayData;
  };

  const displayData = getDisplayData();

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
            className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <span className="nav-icon">
              <FaClipboardList size={20} />
            </span>
            <span className="nav-text">Profil</span>
          </button>
          <button
            className={`nav-item ${activeTab === "security" ? "active" : ""}`}
            onClick={() => setActiveTab("security")}
          >
            <span className="nav-icon">
              <FaLock size={20} />
            </span>
            <span className="nav-text">Varnost</span>
          </button>
          <button
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <span className="nav-icon">
              <FaCog size={20} />
            </span>
            <span className="nav-text">Nastavitve</span>
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

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">
            {activeTab === "profile" && "Uporabniški profil"}
            {activeTab === "security" && "Varnostne nastavitve"}
            {activeTab === "settings" && "Nastavitve računa"}
          </h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaShieldAlt size={16} />
            </span>
            <span className="badge-text">Račun je zavarovan</span>
          </div>
        </header>

        <div className="main-content">
          {activeTab === "profile" && (
            <>
              <div className="profile-card">
                <div className="card-header">
                  <h2 className="card-title">
                    <span className="title-icon">
                      <FaUser size={20} />
                    </span>
                    Osebni podatki
                  </h2>
                  <span className="badge">Osnovni podatki</span>
                </div>

                <div className="profile-grid">
                  {displayData.map(({ key, value, displayName }) => (
                    <div key={key} className="profile-field">
                      <div className="field-header">
                        <span className="field-label">{displayName}</span>
                        <span className="field-type">{getDataType(value)}</span>
                      </div>
                      <div className="field-value">
                        {formatValue(key, value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <FaShieldAlt size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>Varna seja</h3>
                    <p>Aktivna več kot 30 minut</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <FaEnvelope size={24} />
                  </div>
                  <div className="stat-content">
                    <h3>E-pošta</h3>
                    <p>{user.email ? "Potrjena" : "Ni potrjena"}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "security" && (
            <div className="security-section">
              <div className="section-card">
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaKey size={20} />
                  </span>
                  Sprememba gesla
                </h2>
                <ChangePasswordForm onSuccess={fetchUser} />
              </div>

              <div className="section-card">
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaShieldAlt size={20} />
                  </span>
                  Varnostni pregled
                </h2>
                <div className="security-checklist">
                  <div className="check-item checked">
                    <div className="check-icon">
                      <FaCheck size={20} />
                    </div>
                    <div className="check-content">
                      <h4>Močno geslo</h4>
                      <p>Vaše geslo ustreza varnostnim zahtevam</p>
                    </div>
                  </div>
                  <div className="check-item">
                    <div className="check-icon">
                      <FaExclamation size={20} />
                    </div>
                    <div className="check-content">
                      <h4>Dvo-stopenjska avtentikacija</h4>
                      <p>Dodatna zaščita ni omogočena</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="settings-section">
              <div className="section-card">
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaCog size={20} />
                  </span>
                  Posodobi podatke
                </h2>
                <UpdateUserForm onSuccess={fetchUser} />
              </div>

              <div className="section-card">
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaBell size={20} />
                  </span>
                  Obvestila
                </h2>
                <div className="settings-list">
                  <div className="setting-item">
                    <div className="setting-content">
                      <h4>E-poštna obvestila</h4>
                      <p>Prejemaj obvestila o pomembnih spremembah</p>
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
