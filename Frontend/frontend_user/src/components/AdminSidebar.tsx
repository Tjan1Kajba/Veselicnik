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
  FaShoppingCart,
  FaMusic,
  FaSearch,
  FaGift,
  FaDice,
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
          <span className="nav-text">Uporabniški profil</span>
        </Link>
        <Link href="/veselice-pregled" className={`nav-item ${activeItem === 'veselice' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaUsers size={20} />
          </span>
          <span className="nav-text">Vse veselice</span>
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
          <span className="nav-text">Upravljanje menija</span>
        </Link>
        <Link href="/narocila" className={`nav-item ${activeItem === 'narocila' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaShoppingCart size={20} />
          </span>
          <span className="nav-text">Naročila</span>
        </Link>
        <Link href="/glasba" className={`nav-item ${activeItem === 'glasba' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaMusic size={20} />
          </span>
          <span className="nav-text">Glasba</span>
        </Link>
        <Link href="/izgubljeni-najdeni" className={`nav-item ${activeItem === 'izgubljeni' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaSearch size={20} />
          </span>
          <span className="nav-text">Izgubljeno</span>
        </Link>
        <Link href="/prizes" className={`nav-item ${activeItem === 'prizes' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaGift size={20} />
          </span>
          <span className="nav-text">Upravljanje nagrad</span>
        </Link>
        <Link href="/draws" className={`nav-item ${activeItem === 'draws' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaDice size={20} />
          </span>
          <span className="nav-text">Upravljanje žrebanj</span>
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
