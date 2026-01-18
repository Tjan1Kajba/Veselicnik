"use client";
import Link from "next/link";
import React from "react";
import {
  FaUser,
  FaSignOutAlt,
  FaShieldAlt,
  FaEnvelope,
  FaClipboardList,
  FaUsers,
  FaShoppingCart,
  FaSearch,
  FaTrophy,
} from "react-icons/fa";
import { UserSidebarProps } from "../types";

export default function UserSidebar({ user, handleLogout, activeItem = 'profil' }: UserSidebarProps) {
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
        <Link href="/narocila" className={`nav-item ${activeItem === 'narocila' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaShoppingCart size={20} />
          </span>
          <span className="nav-text">Naročila</span>
        </Link>
        <Link href="/izgubljeni-najdeni" className={`nav-item ${activeItem === 'izgubljeni' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaSearch size={20} />
          </span>
          <span className="nav-text">Izgubljeno</span>
        </Link>
        <Link href="/moje-nagrade" className={`nav-item ${activeItem === 'nagrade' ? 'active' : ''}`}>
          <span className="nav-icon">
            <FaTrophy size={20} />
          </span>
          <span className="nav-text">Moje nagrade</span>
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
