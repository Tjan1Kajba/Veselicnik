"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChangePasswordForm from "./ChangePasswordForm";
import UpdateUserForm from "./UpdateUserForm";
import AdminSidebar from "../../components/AdminSidebar";
import UserSidebar from "../../components/UserSidebar";
import StatsBlock from "../../components/StatsBlock";
import {
  FaUser,
  FaSignOutAlt,
  FaShieldAlt,
  FaEnvelope,
  FaClipboardList,
  FaKey,
  FaExclamationTriangle,
  FaUsers,
  FaEdit,
  FaChevronDown,
  FaChevronUp,
  FaTrash,
} from "react-icons/fa";
import "./dashboard.css";
import { showToast } from "../../utils/toast";
import { UserData, UserResponse } from "../../types";

const UserProfile = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Profil";
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

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

        // Store access token for API calls to other services
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

  useEffect(() => {
    fetchUser();
  }, []);

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

  const handleDeleteAccount = () => {
    setDeleting(true);
    fetch("http://localhost:8002/uporabnik/izbrisi-racun", {
      method: "DELETE",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Brisanje računa ni uspelo.");
        }
        return res.json();
      })
      .then((data) => {
        showToast(data.sporocilo || "Račun uspešno izbrisan.", "success");
        router.push("/");
      })
      .catch((err) => {
        showToast(err.message || "Napaka pri brisanju računa.", "error");
        setDeleting(false);
        setShowDeleteConfirm(false);
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

  // Statistik will be rendered by a dedicated client component to avoid
  // hook-order issues in this page component.
  // See: src/components/StatsBlock.tsx

  return (
    <div className="modern-dashboard">
      {/* Sidebar */}
      {user?.tip_uporabnika === "admin" ? (
        <AdminSidebar user={user} handleLogout={handleLogout} activeItem="profil" />
      ) : (
        <UserSidebar user={user} handleLogout={handleLogout} activeItem="profil" />
      )}

      {/* Main Content */}
      <div className="modern-main">
        <header className="main-header">
          <h1 className="main-title">Uporabniški profil</h1>
          <div className="header-badge">
            <span className="badge-icon">
              <FaShieldAlt size={16} />
            </span>
            <span className="badge-text">Račun je zavarovan</span>
          </div>
        </header>

        <div className="main-content">
          {/* Osebni podatki - Read Only */}
          <div className="profile-card">
            <div className="section-header">
              <h2 className="section-title">
                <span className="title-icon">
                  <FaUser size={20} />
                </span>
                Osebni podatki
              </h2>
              <span className="section-badge">Samo za ogled</span>
            </div>
            <div className="profile-grid">
              {displayData.map(({ key, value, displayName }) => (
                <div key={key} className="profile-field">
                  <div className="field-header">
                    <span className="field-label">{displayName}</span>
                    <span className="field-type">{getDataType(value)}</span>
                  </div>
                  <div className="field-value">{formatValue(key, value)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Posodobi podatke in Sprememba gesla - Accordion */}
          <div className="form-sections-grid" style={{ paddingLeft: 20, paddingRight: 20 }}>
            {/* Posodobi podatke */}
            <div className="accordion-section">
              <div
                className="accordion-header"
                onClick={() => toggleAccordion("update")}
              >
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaEdit size={20} />
                  </span>
                  Posodobi podatke
                </h2>
                <div className="accordion-header-right">
                  <span className="section-badge">Uredi informacije</span>
                  <span className="accordion-icon">
                    {openAccordion === "update" ? (
                      <FaChevronUp size={18} />
                    ) : (
                      <FaChevronDown size={18} />
                    )}
                  </span>
                </div>
              </div>
              <div
                className={`accordion-content ${
                  openAccordion === "update" ? "open" : ""
                }`}
              >
                <div className="section-card">
                  <UpdateUserForm onSuccess={fetchUser} />
                </div>
              </div>
            </div>

            {/* Sprememba gesla */}
            <div className="accordion-section">
              <div
                className="accordion-header"
                onClick={() => toggleAccordion("password")}
              >
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaKey size={20} />
                  </span>
                  Sprememba gesla
                </h2>
                <div className="accordion-header-right">
                  <span className="section-badge">Varnost</span>
                  <span className="accordion-icon">
                    {openAccordion === "password" ? (
                      <FaChevronUp size={18} />
                    ) : (
                      <FaChevronDown size={18} />
                    )}
                  </span>
                </div>
              </div>
              <div
                className={`accordion-content ${
                  openAccordion === "password" ? "open" : ""
                }`}
              >
                <div className="section-card">
                  <ChangePasswordForm onSuccess={fetchUser} />
                </div>
              </div>
            </div>

            {/* Izbriši račun */}
            <div className="accordion-section">
              <div
                className="accordion-header"
                onClick={() => toggleAccordion("delete")}
              >
                <h2 className="section-title">
                  <span className="title-icon">
                    <FaTrash size={20} />
                  </span>
                  Izbriši račun
                </h2>
                <div className="accordion-header-right">
                  <span className="section-badge danger">Nepovratno</span>
                  <span className="accordion-icon">
                    {openAccordion === "delete" ? (
                      <FaChevronUp size={18} />
                    ) : (
                      <FaChevronDown size={18} />
                    )}
                  </span>
                </div>
              </div>
              <div
                className={`accordion-content ${
                  openAccordion === "delete" ? "open" : ""
                }`}
              >
                <div className="section-card">
                  <div className="delete-account-section">
                    <div className="delete-warning">
                      <div className="warning-icon">
                        <FaExclamationTriangle size={24} />
                      </div>
                      <h3>Opozorilo: To dejanje je nepovratno</h3>
                      <p>
                        Z brisanjem računa boste trajno izbrisali vse svoje
                        podatke, vključno z osebnimi informacijami in zgodovino.
                        Tega dejanja ni mogoče razveljaviti.
                      </p>
                    </div>
                    <button
                      className="delete-account-button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleting}
                    >
                      <FaTrash size={18} />
                      Izbriši račun
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- STATISTIKA BLOK (separated component) --- */}
          <StatsBlock isAdmin={user?.tip_uporabnika === "admin"} />
        </div>
      </div>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-warning-icon">
                <FaExclamationTriangle size={32} />
              </div>
              <h2>Potrditev brisanja računa</h2>
            </div>
            <div className="modal-body">
              <p>
                Ali ste prepričani, da želite izbrisati svoj račun? To dejanje
                je
                <strong> nepovratno</strong> in boste izgubili vse svoje
                podatke.
              </p>
              <p className="modal-subtext">
                Za potrditev vnesite <strong>IZBRIŠI</strong> v spodnje polje:
              </p>
              <input
                type="text"
                id="confirm-delete-input"
                placeholder="Vnesite IZBRIŠI"
                className="confirm-input"
                disabled={deleting}
              />
            </div>
            <div className="modal-footer">
              <button
                className="modal-button cancel-button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  const input = document.getElementById(
                    "confirm-delete-input"
                  ) as HTMLInputElement;
                  if (input) input.value = "";
                }}
                disabled={deleting}
              >
                Prekliči
              </button>
              <button
                className="modal-button delete-button"
                onClick={() => {
                  const input = document.getElementById(
                    "confirm-delete-input"
                  ) as HTMLInputElement;
                  if (input && input.value === "IZBRIŠI") {
                    handleDeleteAccount();
                  } else {
                    showToast(
                      "Prosimo, vnesite 'IZBRIŠI' za potrditev.",
                      "error"
                    );
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Brišem..." : "Izbriši račun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
