"use client";
import React, { useEffect, useState } from "react";
import { FaClipboardList } from "react-icons/fa";

interface StatsBlockProps {
  isAdmin: boolean;
}

export default function StatsBlock({ isAdmin }: StatsBlockProps) {
  const [zadnji, setZadnji] = useState<any>(null);
  const [naj, setNaj] = useState<any>(null);
  const [stevilo, setStevilo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/statistika/zadnji`).then((r) => r.json()),
      fetch(`/api/statistika/najpogostejsi`).then((r) => r.json()),
      fetch(`/api/statistika/stevilo`).then((r) => r.json()),
    ])
      .then(([zadnjiRes, najRes, steviloRes]) => {
        // Normalize `zadnji` response: accept object or array
        let zad = zadnjiRes;
        if (Array.isArray(zadnjiRes)) zad = zadnjiRes[0] || null;
        // Some backends might use different field names, try common alternatives
        if (zad && !zad.endpoint && zad.klicanaStoritev) zad.endpoint = zad.klicanaStoritev;

        let najv = najRes;
        if (Array.isArray(najRes)) najv = najRes[0] || null;
        if (najv && !najv.endpoint && najv.klicanaStoritev) najv.endpoint = najv.klicanaStoritev;
        if (najv && !najv.stevilo && (najv.count || najv.cnt)) najv.stevilo = najv.count || najv.cnt;

        // Normalize `stevilo` which may come as an object mapping or an array of pairs/objects
        let stev: any = steviloRes;
        // Some backends wrap the array under `statistika`
        if (steviloRes && !Array.isArray(steviloRes) && Array.isArray(steviloRes.statistika)) {
          stev = steviloRes.statistika;
        }
        if (Array.isArray(stev)) {
          const map: Record<string, number> = {};
          (stev as any[]).forEach((item: any) => {
            if (Array.isArray(item) && item.length >= 2) map[String(item[0])] = Number(item[1]);
            else if (item && typeof item === "object") {
              const key = item.endpoint || item.klicanaStoritev || item.zadnji_klican || Object.keys(item)[0];
              const val = item.stevilo ?? item.count ?? item.cnt ?? item.stevilo_klicev ?? item[key] ?? 0;
              map[String(key)] = Number(val || 0);
            }
          });
          stev = map;
        }

        // Handle `zadnji` alternative keys
        if (zad && !zad.endpoint && zad.zadnji_klican) zad.endpoint = zad.zadnji_klican;
        // Handle `naj` alternative keys
        if (najv && !najv.endpoint && najv.najpogostejsi) najv.endpoint = najv.najpogostejsi;
        if (najv && !najv.stevilo && najv.stevilo_klicev) najv.stevilo = najv.stevilo_klicev;

        setZadnji(zad);
        setNaj(najv);
        setStevilo(stev as any);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Stats fetch error:", err);
        setError("Napaka pri pridobivanju statistik.");
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div style={{ marginTop: 40 }}>
      <h2 className="section-title" style={{ marginBottom: 20 }}>
        <FaClipboardList /> Statistika API klicev
      </h2>
      {loading ? (
        <div className="modern-loading">
          <div className="loading-spinner">
            <div className="spinner-ring"></div>
          </div>
          Nalagam statistiko...
        </div>
      ) : error ? (
        <div className="modern-error">{error}</div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <FaClipboardList size={28} />
            </div>
            <div className="stat-content">
              <h3>Zadnji klican endpoint</h3>
              <p>{zadnji?.endpoint || "-"}</p>
              <span style={{ fontSize: 12, color: "#888" }}>
                {zadnji?.cas ? `Ob: ${zadnji.cas}` : ""}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaClipboardList size={28} />
            </div>
            <div className="stat-content">
              <h3>Najpogosteje klican endpoint</h3>
              <p>{naj?.endpoint || "-"}</p>
              <span style={{ fontSize: 12, color: "#888" }}>
                {naj?.stevilo ? `Št. klicev: ${naj.stevilo}` : ""}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaClipboardList size={28} />
            </div>
            <div className="stat-content">
              <h3>Število klicev po endpointih</h3>
              {stevilo && Object.keys(stevilo).length > 0 ? (
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {Object.entries(stevilo).map(([ep, st]) => (
                    <li key={ep} style={{ fontSize: 14 }}>
                      <b>{ep}</b>: {String(st)}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>-</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
