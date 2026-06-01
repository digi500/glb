"use client";

import { useEffect, useState } from "react";
import styles from "../app/Home.module.css";

export default function SettingsPanel({ isOpen, onClose }) {
  const [replicateToken, setReplicateToken] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Load saved token from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("glb_replicate_token") || "";
      setReplicateToken(savedToken);
    }
  }, [isOpen]);

  const handleSave = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("glb_replicate_token", replicateToken.trim());
      
      // Update global context/event for other components to reload keys
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
          <h2>⚙️ Yapay Zeka & API Ayarları</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave}>
          <div className="input-group">
            <label className="input-label" htmlFor="replicate_token">
              Replicate API Token
            </label>
            <input
              id="replicate_token"
              type="password"
              className="input-text"
              placeholder="r8_..."
              value={replicateToken}
              onChange={(e) => setReplicateToken(e.target.value)}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              API anahtarınız tarayıcınızda (localStorage) güvenli bir şekilde saklanır ve sunucuya gönderilmez. Replicate hesabınızdan alabilirsiniz.
            </p>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
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
