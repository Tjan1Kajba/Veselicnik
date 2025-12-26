import Link from "next/link";
import React from "react";
import {
  FaUser,
  FaSignOutAlt,
  FaShieldAlt,
  FaEnvelope,
  FaClipboardList,
  FaUsers,
  FaUtensils,
} from "react-icons/fa";
import { AdminSidebarProps } from "../types";

export default function AdminSidebar({ user, handleLogout, activeItem = 'profil' }: AdminSidebarProps) {
  return (
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
        <Link href="/uporabnik" className={`nav-item ${activeItem === 'profil' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaClipboardList size={20} />
          </span>
          <span className="nav-text">Profil</span>
        </Link>
        <Link href="/veselice-pregled" className={`nav-item ${activeItem === 'veselice' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaUsers size={20} />
          </span>
          <span className="nav-text">Veselice</span>
        </Link>
        <Link href="/veselice" className={`nav-item ${activeItem === 'upravljanje' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaUsers size={20} />
          </span>
          <span className="nav-text">Upravljanje</span>
        </Link>
        <Link href="/menu" className={`nav-item ${activeItem === 'menu' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaUtensils size={20} />
          </span>
          <span className="nav-text">Meni</span>
        </Link>
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
  );
}
