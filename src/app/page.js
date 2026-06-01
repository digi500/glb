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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localServerUrl, setLocalServerUrl] = useState("http://localhost:5000");
  const [refImageUrl, setRefImageUrl] = useState("");

  // İki farklı modelin durum bilgileri
  const [triposrModel, setTriposrModel] = useState({ url: "", size: 0, loading: false, error: "" });
  const [instantmeshModel, setInstantmeshModel] = useState({ url: "", size: 0, loading: false, error: "" });

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

  const handleModelLoaded = (url, size, refImage, modelType = "triposr", error = "") => {
    if (modelType === "triposr") {
      setTriposrModel({ url, size, loading: false, error });
    } else if (modelType === "instantmesh") {
      setInstantmeshModel({ url, size, loading: false, error });
    }
    if (refImage) {
      setRefImageUrl(refImage);
    }
  };

  const handleStartGeneration = (modelType) => {
    if (modelType === "triposr") {
      setTriposrModel(prev => ({ ...prev, url: "", size: 0, loading: true, error: "" }));
    } else if (modelType === "instantmesh") {
      setInstantmeshModel(prev => ({ ...prev, url: "", size: 0, loading: true, error: "" }));
    }
  };

  const triggerDownload = (url, filename) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
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
            setTriposrModel({ url: "", size: 0, loading: false, error: "" });
            setInstantmeshModel({ url: "", size: 0, loading: false, error: "" });
            setRefImageUrl("");
          }}
        >
          🔮 AI 3D Sandbox (Görsel → 3D)
        </button>
        <button
          className={`${styles.tab} ${activeTab === "optimizer" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("optimizer");
            setTriposrModel({ url: "", size: 0, loading: false, error: "" });
            setInstantmeshModel({ url: "", size: 0, loading: false, error: "" });
            setRefImageUrl("");
          }}
        >
          ⚡ Sadece GLB Optimize Et
        </button>
      </div>

      {/* Main Sandbox Layout */}
      <div className={styles.mainLayout}>
        {/* Left Side Controls */}
        {activeTab === "generator" ? (
          <GeneratorPanel onModelLoaded={handleModelLoaded} onStartGeneration={handleStartGeneration} />
        ) : (
          <OptimizerPanel onModelLoaded={(url, size) => handleModelLoaded(url, size, null, "triposr")} />
        )}

        {/* Right Side 3D Previewer */}
        <div className={`${styles.showcase} panel`}>
          <div className={styles.sectionTitle}>
            🖥️ {activeTab === "generator" ? "3D Model Karşılaştırma Stüdyosu" : "3D Model Önizleme"}
            {activeTab === "optimizer" && triposrModel.url && (
              <button 
                className="btn btn-primary" 
                onClick={() => triggerDownload(triposrModel.url, "optimized_model.glb")}
                style={{ marginLeft: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
              >
                💾 Modeli İndir (.GLB)
              </button>
            )}
          </div>

          <div style={{ flex: 1, position: "relative", marginTop: "0.5rem", height: "100%" }}>
            {activeTab === "generator" ? (
              // Generator sekmesinde eğer modeller yükleniyorsa ya da yüklenmişse karşılaştırma tablosu göster
              (triposrModel.url || triposrModel.loading || triposrModel.error || instantmeshModel.url || instantmeshModel.loading || instantmeshModel.error) ? (
                <div className={styles.previewGrid}>
                  {/* Sol Sütun: TripoSR */}
                  <div className={styles.previewColumn}>
                    <div className={styles.previewHeader}>
                      ⚡ TripoSR (Hızlı - Köşe Renkli)
                      {triposrModel.url && (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => triggerDownload(triposrModel.url, "triposr_model.glb")}
                          style={{ marginLeft: "auto", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          💾 İndir
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      {triposrModel.loading ? (
                        <div className={styles.previewPlaceholder}>
                          <div className="spinner"></div>
                          <div>TripoSR modeli oluşturuluyor...</div>
                        </div>
                      ) : triposrModel.error ? (
                        <div className={styles.previewPlaceholderError}>
                          ❌ Hata: {triposrModel.error}
                        </div>
                      ) : triposrModel.url ? (
                        <ThreeViewer src={triposrModel.url} fileSize={triposrModel.size} referenceImage={refImageUrl} />
                      ) : (
                        <div className={styles.previewPlaceholder}>Bekleniyor...</div>
                      )}
                    </div>
                  </div>

                  {/* Sağ Sütun: InstantMesh / Dokulu */}
                  <div className={styles.previewColumn}>
                    <div className={styles.previewHeader}>
                      💎 InstantMesh (Doku Pişirmeli)
                      {instantmeshModel.url && (
                        <button 
                          className="btn btn-secondary"
                          onClick={() => triggerDownload(instantmeshModel.url, "instantmesh_model.glb")}
                          style={{ marginLeft: "auto", padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          💾 İndir
                        </button>
                      )}
                    </div>
                    <div style={{ flex: 1, position: "relative" }}>
                      {instantmeshModel.loading ? (
                        <div className={styles.previewPlaceholder}>
                          <div className="spinner"></div>
                          <div>InstantMesh modeli oluşturuluyor...</div>
                        </div>
                      ) : instantmeshModel.error ? (
                        <div className={styles.previewPlaceholderError}>
                          ❌ Hata: {instantmeshModel.error}
                        </div>
                      ) : instantmeshModel.url ? (
                        <ThreeViewer src={instantmeshModel.url} fileSize={instantmeshModel.size} referenceImage={null} />
                      ) : (
                        <div className={styles.previewPlaceholder}>Bekleniyor...</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Başlangıç Karşılama Ekranı
                <div className={styles.welcomeBox}>
                  <div style={{ fontSize: "3rem" }}>✨</div>
                  <h3>Yerel 3D Stüdyosu</h3>
                  <p style={{ color: "var(--text-muted)", maxWidth: "450px", fontSize: "0.9rem" }}>
                    Bu stüdyo bilgisayarınızdaki yerel GPU sunucusunu ({localServerUrl}) kullanır. Başlamak için arka planda yerel sunucuyu çalıştırın, ardından sol panelden bir örnek görsel seçerek veya prompt yazıp görsel üreterek 3D üretimini başlatın.
                  </p>
                </div>
              )
            ) : (
              // Optimizer sekmesinde tek model önizleme
              triposrModel.url ? (
                <ThreeViewer src={triposrModel.url} fileSize={triposrModel.size} />
              ) : (
                <div className={styles.welcomeBox}>
                  <div style={{ fontSize: "3rem" }}>⚡</div>
                  <h3>GLB Optimizasyon Modu</h3>
                  <p style={{ color: "var(--text-muted)", maxWidth: "450px", fontSize: "0.9rem" }}>
                    Bilgisayarınızdaki herhangi bir .glb dosyasını sol tarafa yükleyin, ardından poligon azaltma (decimation) oranlarını ayarlayarak yerel Blender ile saniyeler içinde ücretsiz optimize edin.
                  </p>
                </div>
              )
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
