"use client";

import { useEffect, useState } from "react";
import styles from "./Home.module.css";
import ThreeViewer from "../components/ThreeViewer";
import GeneratorPanel from "../components/GeneratorPanel";
import OptimizerPanel from "../components/OptimizerPanel";
import SettingsPanel from "../components/SettingsPanel";
import pkg from "../../package.json";

const ENGINES = {
  triposr: {
    name: "TripoSR (Stability AI)",
    speed: "15-45 sn",
    vram: "4-6 GB",
    polyType: "🔺 Üçgen (Triangles)",
    texture: "🎨 Köşe Noktası Rengi",
    desc: "GTX 1660 için en uygun yerel hızlı motor."
  },
  instantmesh: {
    name: "InstantMesh (Tencent)",
    speed: "2-3 dk",
    vram: "12 GB",
    polyType: "🔺 Üçgen (Triangles)",
    texture: "🖼️ 1024x1024 UV Kaplama",
    desc: "Çoklu açı üreterek tutarlı 3D nesneler oluşturur."
  },
  trellis: {
    name: "TRELLIS (Microsoft)",
    speed: "60-90 sn",
    vram: "12-16 GB",
    polyType: "🔺 Üçgen (Triangles)",
    texture: "🖼️ 2048x2048 Tam PBR",
    desc: "E-ticaret ve ürün katalogları için en yüksek geometri kalitesi."
  },
  hunyuan3d: {
    name: "Hunyuan3D-V2 (Tencent)",
    speed: "2-3 dk",
    vram: "16-29 GB",
    polyType: "🔺/⬛ Üçgen veya Dörtgen",
    texture: "🖼️ 2048x2048 PBR Sentez",
    desc: "Poligon sayısı ve topolojisi ayarlanabilir oyun motoru dostu model."
  },
  sf3d: {
    name: "Stable Fast 3D (Stability AI)",
    speed: "< 1 sn",
    vram: "6 GB",
    polyType: "🔺 Üçgen (Low-Poly)",
    texture: "🖼️ 1024x1024 Hızlı UV",
    desc: "Saniyeler altında oyun-hazır düşük poligonlu model üretir."
  },
  unique3d: {
    name: "Unique3D (Tencent)",
    speed: "3-4 dk",
    vram: "16 GB",
    polyType: "🔺 Üçgen (İnce Detay)",
    texture: "🖼️ 2048x2048 Normal Harita",
    desc: "Normal map üreterek nesnedeki çatlak ve ince kabartmaları işler."
  },
  lgm: {
    name: "LGM (Large Gaussian Model)",
    speed: "5 sn",
    vram: "8 GB",
    polyType: "🔺 Üçgen (Gaussian)",
    texture: "🖼️ 1024x1024 Albedo",
    desc: "Nokta bulutunu hızlıca örgüye çevirir, organik yapılar için iyidir."
  },
  crm: {
    name: "CRM (Convolutional)",
    speed: "10 sn",
    vram: "8 GB",
    polyType: "🔺 Üçgen (Triangles)",
    texture: "🖼️ 1024x1024 Albedo",
    desc: "Triplane projeksiyonu kullanan hızlı simetrik model oluşturucu."
  },
  dreamgaussian: {
    name: "DreamGaussian",
    speed: "15 sn",
    vram: "6 GB",
    polyType: "🔺 Üçgen (Düzensiz)",
    texture: "🖼️ 2048x2048 Yüksek Res",
    desc: "Geometrisi pürüzlü ancak dokusu çok net olan hızlı prototipleme motoru."
  },
  one2345: {
    name: "One-2-3-45 / MeshPrime",
    speed: "60 sn",
    vram: "12 GB",
    polyType: "🔺 Üçgen (SDF Kapalı)",
    texture: "🖼️ 1024x1024 Albedo",
    desc: "SDF hacimsel modeli çıkarır, 3D yazıcı üretimi için en ideal kapalı geometri."
  }
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("generator"); // "generator" or "optimizer"
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [localServerUrl, setLocalServerUrl] = useState("http://localhost:5000");
  const [refImageUrl, setRefImageUrl] = useState("");

  // Seçilen Kıyaslama Motorları (Varsayılan olarak ilk iki motor)
  const [selectedEngines, setSelectedEngines] = useState(["triposr", "instantmesh"]);

  // 10 Motorun durum yönetimi
  const [modelsState, setModelsState] = useState({
    triposr: { url: "", size: 0, loading: false, error: "" },
    instantmesh: { url: "", size: 0, loading: false, error: "" },
    trellis: { url: "", size: 0, loading: false, error: "" },
    hunyuan3d: { url: "", size: 0, loading: false, error: "" },
    sf3d: { url: "", size: 0, loading: false, error: "" },
    unique3d: { url: "", size: 0, loading: false, error: "" },
    lgm: { url: "", size: 0, loading: false, error: "" },
    crm: { url: "", size: 0, loading: false, error: "" },
    dreamgaussian: { url: "", size: 0, loading: false, error: "" },
    one2345: { url: "", size: 0, loading: false, error: "" }
  });

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
    setModelsState((prev) => ({
      ...prev,
      [modelType]: { url, size, loading: false, error }
    }));
    if (refImage) {
      setRefImageUrl(refImage);
    }
  };

  const handleStartGeneration = (modelType) => {
    setModelsState((prev) => ({
      ...prev,
      [modelType]: { url: "", size: 0, loading: true, error: "" }
    }));
  };

  const handleToggleEngine = (key) => {
    setSelectedEngines((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // En az bir motor seçili kalmalı
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const resetAllModels = () => {
    setModelsState({
      triposr: { url: "", size: 0, loading: false, error: "" },
      instantmesh: { url: "", size: 0, loading: false, error: "" },
      trellis: { url: "", size: 0, loading: false, error: "" },
      hunyuan3d: { url: "", size: 0, loading: false, error: "" },
      sf3d: { url: "", size: 0, loading: false, error: "" },
      unique3d: { url: "", size: 0, loading: false, error: "" },
      lgm: { url: "", size: 0, loading: false, error: "" },
      crm: { url: "", size: 0, loading: false, error: "" },
      dreamgaussian: { url: "", size: 0, loading: false, error: "" },
      one2345: { url: "", size: 0, loading: false, error: "" }
    });
    setRefImageUrl("");
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
            resetAllModels();
          }}
        >
          🔮 AI 3D Sandbox (Görsel → 3D)
        </button>
        <button
          className={`${styles.tab} ${activeTab === "optimizer" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("optimizer");
            resetAllModels();
          }}
        >
          ⚡ Sadece GLB Optimize Et
        </button>
      </div>

      {/* Main Sandbox Layout */}
      <div className={styles.mainLayout}>
        {/* Left Side Controls */}
        {activeTab === "generator" ? (
          <GeneratorPanel 
            onModelLoaded={handleModelLoaded} 
            onStartGeneration={handleStartGeneration} 
            selectedEngines={selectedEngines}
            onToggleEngine={handleToggleEngine}
          />
        ) : (
          <OptimizerPanel onModelLoaded={(url, size) => handleModelLoaded(url, size, null, "triposr")} />
        )}

        {/* Right Side 3D Previewer */}
        <div className={`${styles.showcase} panel`}>
          <div className={styles.sectionTitle}>
            🖥️ {activeTab === "generator" ? "3D Model Karşılaştırma Stüdyosu" : "3D Model Önizleme"}
            {activeTab === "optimizer" && modelsState.triposr.url && (
              <button 
                className="btn btn-primary" 
                onClick={() => triggerDownload(modelsState.triposr.url, "optimized_model.glb")}
                style={{ marginLeft: "auto", padding: "0.4rem 1rem", fontSize: "0.85rem" }}
              >
                💾 Modeli İndir (.GLB)
              </button>
            )}
          </div>

          <div style={{ flex: 1, position: "relative", marginTop: "0.5rem", height: "100%" }}>
            {activeTab === "generator" ? (
              // Generator sekmesinde eğer seçili modellerden herhangi biri yükleniyorsa ya da yüklenmişse karşılaştırma tablosu göster
              selectedEngines.some(key => modelsState[key].url || modelsState[key].loading || modelsState[key].error) ? (
                <div className={styles.previewGrid}>
                  {selectedEngines.map((modelKey) => {
                    const model = modelsState[modelKey];
                    const engineInfo = ENGINES[modelKey];
                    
                    return (
                      <div key={modelKey} className={styles.previewColumn}>
                        {/* Başlık çubuğu */}
                        <div className={styles.previewHeader}>
                          <span>{engineInfo.name}</span>
                          {model.url && (
                            <button 
                              className="btn btn-secondary"
                              onClick={() => triggerDownload(model.url, `${modelKey}_model.glb`)}
                              style={{ marginLeft: "auto", padding: "0.2rem 0.5rem", fontSize: "0.7rem", height: "24px" }}
                            >
                              💾 İndir
                            </button>
                          )}
                        </div>

                        {/* Motor Sabit Teknik Özellikleri Overlay */}
                        <div className={styles.previewSpecOverlay}>
                          <div className={styles.previewSpecTitle}>Motor Özellikleri</div>
                          <div className={styles.previewSpecRow}>
                            <span className={styles.previewSpecLabel}>⏱️ Hız:</span>
                            <span className={styles.previewSpecValue}>{engineInfo.speed}</span>
                          </div>
                          <div className={styles.previewSpecRow}>
                            <span className={styles.previewSpecLabel}>💾 VRAM:</span>
                            <span className={styles.previewSpecValueVram}>{engineInfo.vram}</span>
                          </div>
                          <div className={styles.previewSpecRow}>
                            <span className={styles.previewSpecLabel}>🔺 Poligon:</span>
                            <span className={styles.previewSpecValue}>{engineInfo.polyType}</span>
                          </div>
                          <div className={styles.previewSpecRow}>
                            <span className={styles.previewSpecLabel}>🖼️ Doku:</span>
                            <span className={styles.previewSpecValue}>{engineInfo.texture}</span>
                          </div>
                        </div>

                        {/* 3D Gösterici Alanı */}
                        <div style={{ flex: 1, position: "relative", marginTop: "115px" }}> {/* Spec overlay yüksekliği kadar üstten boşluk bırakalım */}
                          {model.loading ? (
                            <div className={styles.previewPlaceholder}>
                              <div className="spinner"></div>
                              <div>{engineInfo.name} üretiliyor...</div>
                            </div>
                          ) : model.error ? (
                            <div className={styles.previewPlaceholderError}>
                              ❌ Hata: {model.error}
                            </div>
                          ) : model.url ? (
                            <ThreeViewer src={model.url} fileSize={model.size} referenceImage={modelKey === selectedEngines[0] ? refImageUrl : null} />
                          ) : (
                            <div className={styles.previewPlaceholder}>Hazırlanıyor...</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Başlangıç Karşılama Ekranı
                <div className={styles.welcomeBox}>
                  <div style={{ fontSize: "3rem" }}>✨</div>
                  <h3>Yerel 3D Karşılaştırma Stüdyosu</h3>
                  <p style={{ color: "var(--text-muted)", maxWidth: "520px", fontSize: "0.9rem" }}>
                    Bu stüdyo bilgisayarınızdaki yerel GPU sunucusunu ({localServerUrl}) kullanır. Soldaki motorlardan karşılaştırmak istediklerinizi seçin, ardından görsel yükleyip veya prompt yazıp üretimi başlatın.
                  </p>
                </div>
              )
            ) : (
              // Optimizer sekmesinde tek model önizleme
              modelsState.triposr.url ? (
                <ThreeViewer src={modelsState.triposr.url} fileSize={modelsState.triposr.size} />
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
