"use client";

import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import ThreeViewer from "../components/ThreeViewer";
import GeneratorPanel from "../components/GeneratorPanel";
import OptimizerPanel from "../components/OptimizerPanel";
import SettingsPanel from "../components/SettingsPanel";
import pkg from "../../package.json";

export default function Home() {
  const [activeTab, setActiveTab] = useState("generator"); // "generator" or "optimizer"
  const [modelUrl, setModelUrl] = useState("");
  const [modelSize, setModelSize] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localServerUrl, setLocalServerUrl] = useState("http://localhost:5000");

  const checkSettings = () => {
    if (typeof window !== "undefined") {
      const savedUrl = localStorage.getItem("glb_local_server_url") || "http://localhost:5000";
      setLocalServerUrl(savedUrl);
    }
  };

  useEffect(() => {
    checkSettings();
    window.addEventListener("glb_settings_updated", checkSettings);
    return () => {
      window.removeEventListener("glb_settings_updated", checkSettings);
    };
  }, []);

  const handleModelLoaded = (url, size) => {
    setModelUrl(url);
    setModelSize(size);
  };

  const handleDownload = () => {
    if (!modelUrl) return;
    const a = document.createElement("a");
    a.href = modelUrl;
    a.download = activeTab === "optimizer" ? "optimized_model.glb" : "ai_generated_model.glb";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <main className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>📦</div>
          <div>
            <span className={styles.logoText}>GLB 3D Studio</span>
            <span className={styles.versionBadge}>v{pkg.version}</span>
          </div>
        </div>

        <div className={styles.navActions}>
          <button 
            className="btn btn-secondary"
            onClick={() => setIsSettingsOpen(true)}
          >
            ⚙️ Ayarlar
          </button>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === "generator" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("generator");
            setModelUrl(""); // Reset model when switching tabs
            setModelSize(0);
          }}
        >
          🔮 AI 3D Sandbox (Görsel → 3D)
        </button>
        <button
          className={`${styles.tab} ${activeTab === "optimizer" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("optimizer");
            setModelUrl(""); // Reset model when switching tabs
            setModelSize(0);
          }}
        >
          ⚡ Sadece GLB Optimize Et
        </button>
      </div>

      {/* Main Sandbox Layout */}
      <div className={styles.mainLayout}>
        {/* Left Side Controls */}
        {activeTab === "generator" ? (
          <GeneratorPanel onModelLoaded={handleModelLoaded} />
        ) : (
          <OptimizerPanel onModelLoaded={handleModelLoaded} />
        )}

        {/* Right Side 3D Previewer */}
        <div className={`${styles.showcase} panel`}>
          <div className={styles.sectionTitle}>
            🖥️ 3D Model Önizleme
            {modelUrl && (
              <button 
                className="btn btn-primary" 
                onClick={handleDownload}
                style={{ marginLeft: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
              >
                💾 Modeli İndir (.GLB)
              </button>
            )}
          </div>

          <div style={{ flex: 1, position: "relative", marginTop: "0.5rem", display: "flex", flexDirection: "column" }}>
            {modelUrl ? (
              <ThreeViewer src={modelUrl} fileSize={modelSize} />
            ) : (
              <div 
                style={{ 
                  height: "100%", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  background: "#0a0812",
                  borderRadius: "12px",
                  border: "1px dashed var(--border-color)",
                  padding: "2rem",
                  textAlign: "center",
                  gap: "1rem"
                }}
              >
                <div style={{ fontSize: "3rem" }}>✨</div>
                <h3>Yerel 3D Stüdyosu</h3>
                <p style={{ color: "var(--text-muted)", maxWidth: "450px", fontSize: "0.9rem" }}>
                  {activeTab === "generator" 
                    ? `Bu stüdyo bilgisayarınızdaki yerel GPU sunucusunu (${localServerUrl}) kullanır. Başlamak için arka planda yerel sunucuyu çalıştırın, ardından sol panelden bir örnek görsel seçerek veya prompt yazıp görsel üreterek '3D GLB Model Üret' seçeneğini tıklayın.`
                    : "Bilgisayarınızdaki herhangi bir .glb dosyasını sol tarafa yükleyin, ardından poligon azaltma (decimation) oranlarını ayarlayarak yerel Blender ile saniyeler içinde ücretsiz optimize edin."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal Component */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* Footer */}
      <footer className={styles.footer}>
        <div>
          © {new Date().getFullYear()} GLB 3D Studio - Kendi Bilgisayarınızın Gücüyle Sınırsız & Ücretsiz 3D Geliştirici.
        </div>
        <div className={styles.footerLinks}>
          <span>GitHub: <a href="https://github.com/digi500/glb" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>digi500/glb</a></span>
          <span>•</span>
          <span>Versiyon: {pkg.version}</span>
        </div>
      </footer>
    </main>
  );
}
