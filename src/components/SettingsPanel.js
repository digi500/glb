"use client";

import { useEffect, useState } from "react";
import styles from "../app/Home.module.css";

export default function SettingsPanel({ isOpen, onClose }) {
  const [localServerUrl, setLocalServerUrl] = useState("http://localhost:5000");
  const [isSaved, setIsSaved] = useState(false);

  // Load configuration from localStorage on mount/open
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUrl = localStorage.getItem("glb_local_server_url") || "http://localhost:5000";
      setLocalServerUrl(savedUrl);
    }
  }, [isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("glb_local_server_url", localServerUrl.trim());
      
      // Notify other components of the change
      window.dispatchEvent(new Event("glb_settings_updated"));
      
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 800);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.settingsOverlay} onClick={onClose}>
      <div className={`${styles.settingsModal} panel`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.settingsHeader}>
          <h2>⚙️ Yerel Sunucu Ayarları</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          
          <div className="input-group">
            <label className="input-label" htmlFor="local_server_url">
              Yerel Sunucu Adresi (Local Host)
            </label>
            <input
              id="local_server_url"
              type="text"
              className="input-text"
              placeholder="http://localhost:5000"
              value={localServerUrl}
              onChange={(e) => setLocalServerUrl(e.target.value)}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Uygulama, görsel üretimi ve 3D çevirme işlemleri için bilgisayarınızdaki bu adreste çalışan Python sunucusunu kullanacaktır.
            </p>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              İptal
            </button>
            <button type="submit" className="btn btn-primary" style={{ minWidth: "120px" }}>
              {isSaved ? "Kaydedildi! ✓" : "Ayarları Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
