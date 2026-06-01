"use client";

import { useState, useEffect } from "react";
import styles from "../app/Home.module.css";

const EXAMPLES = [
  { id: "cyberpunk", label: "Cyberpunk", path: "/ornek_resimler/cyberpunk_transparent.png" },
  { id: "historical", label: "Tarihi", path: "/ornek_resimler/historical_transparent.png" },
  { id: "hitech", label: "Hitech", path: "/ornek_resimler/hitech_transparent.png" },
  { id: "modern", label: "Modern", path: "/ornek_resimler/modern_transparent.png" }
];

export default function GeneratorPanel({ onModelLoaded }) {
  // Akış ve Poligon Seçenekleri
  const [flowMode, setFlowMode] = useState("manual"); // "manual" veya "auto"
  const [polygonType, setPolygonType] = useState("triangle"); // "triangle" veya "quad"
  
  // Tab ve Girişler
  const [activeSubTab, setActiveSubTab] = useState("upload");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [localModel, setLocalModel] = useState("triposr"); // "triposr" veya "instantmesh"
  const [preset, setPreset] = useState("mobile"); // "mobile", "desktop", "original"
  
  // Görsel ve 3D Durumları
  const [selectedExample, setSelectedExample] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState("");
  const [removedBgImage, setRemovedBgImage] = useState("");
  const [generatedGlbUrl, setGeneratedGlbUrl] = useState("");
  const [generatedGlbSize, setGeneratedGlbSize] = useState(0);
  
  // Adım Adım İşlem Aşamaları
  const [currentStep, setCurrentStep] = useState(0);
  
  // Durum, Log ve İlerleme Çubuğu
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Bellek sızıntısını önlemek için interval temizliği
  useEffect(() => {
    return () => {
      if (window.progressInterval) clearInterval(window.progressInterval);
    };
  }, []);

  // İlerleme çubuğu simülasyonu başlatıcı
  const startProgress = (durationSeconds) => {
    setProgress(1);
    setCountdown(durationSeconds);
    
    if (window.progressInterval) clearInterval(window.progressInterval);
    
    const startTime = Date.now();
    const endTime = startTime + durationSeconds * 1000;
    
    window.progressInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      const total = durationSeconds * 1000;
      
      const remainingSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));
      setCountdown(remainingSeconds);
      
      // Erken dolup kilitlenmiş hissi vermemesi için %95'te sınırla
      const currentProgress = Math.min(95, (elapsed / total) * 100);
      setProgress(currentProgress);
      
      if (now >= endTime) {
        clearInterval(window.progressInterval);
      }
    }, 100);
  };

  // İlerleme çubuğunu tamamlayıcı
  const stopProgress = () => {
    if (window.progressInterval) clearInterval(window.progressInterval);
    setProgress(100);
    setCountdown(0);
    setTimeout(() => {
      setProgress(0);
    }, 500);
  };

  // Yerel sunucu ayarı okuyucu
  const getLocalUrl = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("glb_local_server_url") || "http://localhost:5000";
    }
    return "http://localhost:5000";
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedExample(null);
    setRemovedBgImage("");
    setGeneratedGlbUrl("");
    setCurrentStep(0);
    onModelLoaded("", 0);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const selectExample = (ex) => {
    setUploadedImageBase64("");
    setRemovedBgImage("");
    setGeneratedGlbUrl("");
    setSelectedExample(ex);
    setCurrentStep(0);
    onModelLoaded("", 0);
  };

  // AŞAMA 1: Görsel Üretimi (Yazıdan Görsele)
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setStatus("Yerel ekran kartınız görseli üretiyor...");
    setLogs("Stable Diffusion / ComfyUI çalıştırılıyor...");
    startProgress(8); // Görsel üretimi için tahmini 8 saniye
    onModelLoaded("", 0);

    const localUrl = getLocalUrl();

    try {
      const response = await fetch(`${localUrl}/api/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Görsel üretilemedi.");
      
      const imageUrl = data.image;
      
      setUploadedImageBase64(imageUrl);
      setSelectedExample(null);
      setRemovedBgImage("");
      setGeneratedGlbUrl("");
      setActiveSubTab("upload");
      setCurrentStep(0);
      setStatus("Görsel başarıyla üretildi!");
      stopProgress();
      
      if (flowMode === "auto") {
        setTimeout(() => runBackgroundRemoval(imageUrl), 800);
      }
    } catch (err) {
      console.error(err);
      stopProgress();
      alert(`Yerel görsel üretimi başarısız oldu: ${err.message}. Lütfen yerel sunucunuzun açık olduğundan emin olun.`);
      setStatus("Hata oluştu.");
      setIsLoading(false);
    } finally {
      if (flowMode !== "auto") setIsLoading(false);
    }
  };

  // AŞAMA 2: Arka Plan Kaldırma (Tetikleyici)
  const handleBgRemovalTrigger = async () => {
    const sourceImage = selectedExample ? selectedExample.path : uploadedImageBase64;
    if (!sourceImage) return;
    
    setIsLoading(true);
    await runBackgroundRemoval(sourceImage);
  };

  // Arka Plan Kaldırma İşlemi
  const runBackgroundRemoval = async (imageSrc) => {
    setStatus("Yerel yapay zeka arka planı siliyor...");
    setLogs("Rembg kütüphanesi çalıştırılıyor...");
    startProgress(3); // Arka plan silme için tahmini 3 saniye

    const localUrl = getLocalUrl();

    try {
      if (selectedExample) {
        setRemovedBgImage(selectedExample.path);
        setCurrentStep(1);
        setStatus("Görsel hazır! Devam edebilirsiniz.");
        stopProgress();
        setIsLoading(false);
        if (flowMode === "auto") {
          run3DGeneration(window.location.origin + selectedExample.path);
        }
        return;
      }

      const response = await fetch(`${localUrl}/api/remove-bg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Arka plan silme başarısız.");
      
      setRemovedBgImage(data.image);
      setCurrentStep(1);
      setStatus("Arka plan silindi! 3D modele dönüştürebilirsiniz.");
      stopProgress();
      
      if (flowMode === "auto") {
        run3DGeneration(data.image);
      }
    } catch (err) {
      console.error(err);
      stopProgress();
      alert(`Arka plan silinemedi: ${err.message}. Lütfen yerel sunucunun açık olduğundan emin olun.`);
      setStatus("Arka plan kaldırma hatası.");
      setIsLoading(false);
    } finally {
      if (flowMode !== "auto") setIsLoading(false);
    }
  };

  // AŞAMA 3: 3D Model Üretimi (Tetikleyici)
  const handle3DTrigger = async () => {
    let inputImage = removedBgImage;
    if (!inputImage) {
      if (selectedExample) {
        inputImage = window.location.origin + selectedExample.path;
      } else if (uploadedImageBase64) {
        inputImage = uploadedImageBase64;
      }
    }

    if (!inputImage) {
      alert("Lütfen önce bir kaynak görsel hazırlayın.");
      return;
    }

    setIsLoading(true);
    await run3DGeneration(inputImage);
  };

  // 3D Model Üretimi İşlemi
  const run3DGeneration = async (imageSrc) => {
    setStatus("Yerel yapay zeka 3D modeli örüyor...");
    setLogs(`${localModel.toUpperCase()} modeli çalıştırılıyor. Bu işlem biraz sürebilir...`);
    
    // TripoSR GPU üzerinde ortalama 15-20 saniye sürer
    const estimatedTime = localModel === "triposr" ? 20 : 45;
    startProgress(estimatedTime);

    const localUrl = getLocalUrl();

    try {
      const response = await fetch(`${localUrl}/api/generate-3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc, model: localModel })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "3D model üretilemedi.");

      const glbRes = await fetch(data.glb);
      const glbBlob = await glbRes.blob();
      const rawGlbUrlLocal = URL.createObjectURL(glbBlob);

      setGeneratedGlbUrl(rawGlbUrlLocal);
      setGeneratedGlbSize(glbBlob.size);
      setCurrentStep(2);
      setStatus("3D model oluşturuldu! Optimizasyona geçebilirsiniz.");
      stopProgress();
      onModelLoaded(rawGlbUrlLocal, glbBlob.size);

      if (flowMode === "auto") {
        runGlbOptimization(glbBlob);
      }
    } catch (err) {
      console.error(err);
      stopProgress();
      alert(`3D model oluşturulamadı: ${err.message}. Lütfen yerel sunucunuzdaki konsol hata çıktılarını kontrol edin.`);
      setStatus("3D model oluşturma hatası.");
      setIsLoading(false);
    } finally {
      if (flowMode !== "auto") setIsLoading(false);
    }
  };

  // AŞAMA 4: GLB Optimizasyonu (Tetikleyici)
  const handleOptimizationTrigger = async () => {
    if (!generatedGlbUrl) return;
    setIsLoading(true);

    try {
      const glbRes = await fetch(generatedGlbUrl);
      const glbBlob = await glbRes.blob();
      await runGlbOptimization(glbBlob);
    } catch (err) {
      console.error(err);
      alert("GLB dosyası yüklenemedi.");
      setIsLoading(false);
    }
  };

  // GLB Optimizasyonu İşlemi
  const runGlbOptimization = async (glbBlob) => {
    setStatus("GLB modeli yerel Blender ile sıkıştırılıyor...");
    setLogs("Poligon azaltma (Decimation) ve sıkıştırma uygulanıyor...");
    startProgress(5); // Blender işlemi için tahmini 5 saniye

    const localUrl = getLocalUrl();
    const ratio = preset === "mobile" ? 0.15 : 0.50;

    try {
      let finalGlbUrl = generatedGlbUrl;
      let finalSize = generatedGlbSize;

      if (preset !== "original") {
        const formData = new FormData();
        formData.append("file", glbBlob, "model.glb");
        formData.append("ratio", ratio.toString());
        formData.append("error", "0.01");
        formData.append("polygon_type", polygonType);

        const optRes = await fetch(`${localUrl}/api/optimize-glb`, {
          method: "POST",
          body: formData
        });

        if (!optRes.ok) {
          const optError = await optRes.json();
          throw new Error(`Optimizasyon hatası: ${optError.error}`);
        }

        const optBlob = await optRes.blob();
        finalGlbUrl = URL.createObjectURL(optBlob);
        finalSize = optBlob.size;
      }

      setCurrentStep(3);
      setStatus("Model başarıyla optimize edildi!");
      stopProgress();
      onModelLoaded(finalGlbUrl, finalSize);
    } catch (err) {
      console.error(err);
      stopProgress();
      alert(`Yerel Blender optimizasyonu başarısız oldu: ${err.message}`);
      setStatus("Optimizasyon hatası.");
    } finally {
      setIsLoading(false);
    }
  };

  // Akışı Sıfırla
  const handleResetFlow = () => {
    setUploadedImageBase64("");
    setSelectedExample(null);
    setRemovedBgImage("");
    setGeneratedGlbUrl("");
    setGeneratedGlbSize(0);
    setCurrentStep(0);
    setStatus("");
    setLogs("");
    setProgress(0);
    onModelLoaded("", 0);
  };

  return (
    <div className={`${styles.sidebar} panel`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div style={{ fontWeight: 500, color: "#ffffff", fontSize: "0.95rem" }}>{status}</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", maxWidth: "90%", textAlign: "center", marginBottom: "0.25rem" }}>
            {logs}
          </div>
          
          {/* İlerleme Çubuğu Arayüzü */}
          {progress > 0 && (
            <>
              <div className={styles.progressBarContainer}>
                <div className={styles.progressBarFill} style={{ width: `${progress}%` }}></div>
              </div>
              <div className={styles.progressTimer}>
                Tahmini Kalan Süre: <strong>{countdown}</strong> saniye
              </div>
            </>
          )}
        </div>
      )}

      {/* Akış Modu Seçici */}
      <div className="input-group" style={{ marginBottom: "1rem" }}>
        <div className={styles.aspectRatios}>
          <div
            className={`${styles.ratioOption} ${flowMode === "manual" ? styles.ratioOptionActive : ""}`}
            onClick={() => setFlowMode("manual")}
          >
            ✋ Adım Adım
          </div>
          <div
            className={`${styles.ratioOption} ${flowMode === "auto" ? styles.ratioOptionActive : ""}`}
            onClick={() => setFlowMode("auto")}
          >
            ⚡ Tam Otomatik
          </div>
        </div>
      </div>

      {/* Giriş Sekmeleri */}
      {currentStep === 0 && (
        <div className={styles.tabContainer} style={{ margin: 0, width: "100%" }}>
          <button
            className={`${styles.tab} ${activeSubTab === "prompt" ? styles.activeTab : ""}`}
            onClick={() => setActiveSubTab("prompt")}
          >
            ✍️ Prompt ile Üret
          </button>
          <button
            className={`${styles.tab} ${activeSubTab === "upload" ? styles.activeTab : ""}`}
            onClick={() => setActiveSubTab("upload")}
          >
            📷 Görsel Yükle / Seç
          </button>
        </div>
      )}

      {/* Adım 0: Giriş */}
      {currentStep === 0 && (
        <div className="fade-in">
          {activeSubTab === "prompt" ? (
            <div>
              <div className="input-group">
                <label className="input-label">Prompt (Yapay zekanın çizeceği resim)</label>
                <textarea
                  className="input-text"
                  rows="3"
                  placeholder="Kırmızı çatılı, küçük bir tatil evi, izometrik 3d oyun stili..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">En-Boy Oranı</label>
                <div className={styles.aspectRatios}>
                  {["1:1", "3:4", "4:3"].map((ratio) => (
                    <div
                      key={ratio}
                      className={`${styles.ratioOption} ${aspectRatio === ratio ? styles.ratioOptionActive : ""}`}
                      onClick={() => setAspectRatio(ratio)}
                    >
                      {ratio}
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={handleGenerateImage}
                disabled={!prompt.trim() || isLoading}
              >
                🎨 Görseli Üret
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {(uploadedImageBase64 || selectedExample) && (
                <div className={styles.imageFlow}>
                  <div className={styles.imageBox} style={{ width: "100%", aspectRatio: "1" }}>
                    <img src={selectedExample ? selectedExample.path : uploadedImageBase64} alt="Görsel" />
                    <div className={styles.imageLabel}>Giriş Görseli</div>
                  </div>
                  
                  {flowMode === "manual" && (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      onClick={handleBgRemovalTrigger}
                      disabled={isLoading}
                    >
                      ➔ Arka Planı Kaldırmayı Başlat
                    </button>
                  )}
                  {flowMode === "auto" && (
                    <button
                      className="btn btn-accent"
                      style={{ width: "100%" }}
                      onClick={handleBgRemovalTrigger}
                      disabled={isLoading}
                    >
                      ⚡ Otomatik 3D Üretimi Başlat
                    </button>
                  )}
                </div>
              )}

              <div className={styles.ornekResimlerTitle}>
                {(uploadedImageBase64 || selectedExample) ? "Görseli Değiştir veya Farklı Seç:" : "Örnek Görseller (Arka Plansız)"}
              </div>
              <div className={styles.ornekGrid}>
                {EXAMPLES.map((ex) => (
                  <div
                    key={ex.id}
                    className={`${styles.ornekThumbnail} ${selectedExample?.id === ex.id ? styles.ornekThumbnailActive : ""}`}
                    onClick={() => selectExample(ex)}
                  >
                    <img src={ex.path} alt={ex.label} />
                  </div>
                ))}
              </div>

              <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                veya kendi görselinizi yükleyin
              </div>

              <label className="dropzone">
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                <span>📤</span>
                <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Bilgisayardan Görsel Seç</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Adım 1: Arka Plan Temizleme */}
      {currentStep === 1 && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className={styles.sectionTitle}>Adım 2: Arka Plan Temizleme</div>
          <div className={styles.imageGrid}>
            <div className={styles.imageBox}>
              <img src={selectedExample ? selectedExample.path : uploadedImageBase64} alt="Orijinal" />
              <div className={styles.imageLabel}>Orijinal</div>
            </div>
            <div className={styles.imageBox}>
              <img src={removedBgImage} alt="Saydam" />
              <div className={styles.imageLabel}>Saydam</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleResetFlow}>
              Vazgeç
            </button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handle3DTrigger}>
              ✓ Görseli Onayla ve 3D Yap
            </button>
          </div>
        </div>
      )}

      {/* Adım 2: 3D Model Taslağı */}
      {currentStep === 2 && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className={styles.sectionTitle}>Adım 3: Ham 3D Model Hazır</div>
          
          <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "0.75rem", borderRadius: "6px", fontSize: "0.8rem" }}>
            Model boyutu: <strong>{(generatedGlbSize / 1024 / 1024).toFixed(2)} MB</strong>
          </div>

          {/* Yerel Motor Seçimi */}
          <div className="input-group">
            <label className="input-label">Yerel Yapay Zeka Motoru</label>
            <select
              className="input-text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
            >
              <option value="triposr">TripoSR (Hızlı - 1660 için Önerilen)</option>
              <option value="instantmesh">InstantMesh (Çoklu Açı - Yüksek Kalite)</option>
            </select>
          </div>

          {/* Poligon Tipi Seçimi */}
          <div className="input-group">
            <label className="input-label">Poligon Yapı Tipi</label>
            <div className={styles.aspectRatios}>
              <div
                className={`${styles.ratioOption} ${polygonType === "triangle" ? styles.ratioOptionActive : ""}`}
                onClick={() => setPolygonType("triangle")}
              >
                Üçgen (Oyun Uyumlu)
              </div>
              <div
                className={`${styles.ratioOption} ${polygonType === "quad" ? styles.ratioOptionActive : ""}`}
                onClick={() => setPolygonType("quad")}
              >
                Dörtgen (Blender)
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Mobil / Kalite Preseti</label>
            <div className={styles.presets}>
              <div
                className={`${styles.presetCard} ${preset === "mobile" ? styles.presetCardActive : ""}`}
                onClick={() => setPreset("mobile")}
              >
                <div>
                  <div className={styles.presetName}>📱 Mobil Uyumlu (Düşük Poligon)</div>
                  <div className={styles.presetDesc}>%85 Poligon Azaltma. Telefonlarda akıcı çalışır.</div>
                </div>
              </div>
              <div
                className={`${styles.presetCard} ${preset === "desktop" ? styles.presetCardActive : ""}`}
                onClick={() => setPreset("desktop")}
              >
                <div>
                  <div className={styles.presetName}>💻 Masaüstü (Orta Poligon)</div>
                  <div className={styles.presetDesc}>%50 Poligon Azaltma. Masaüstü ve render için uygundur.</div>
                </div>
              </div>
              <div
                className={`${styles.presetCard} ${preset === "original" ? styles.presetCardActive : ""}`}
                onClick={() => setPreset("original")}
              >
                <div>
                  <div className={styles.presetName}>💎 Orijinal Kalite</div>
                  <div className={styles.presetDesc}>Sıkıştırma ve poligon azaltma uygulanmaz.</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleResetFlow}>
              Temizle
            </button>
            <button className="btn btn-accent" style={{ flex: 2 }} onClick={handleOptimizationTrigger}>
              ⚡ Modeli Onayla ve Optimize Et
            </button>
          </div>
        </div>
      )}

      {/* Adım 3: Tamamlandı */}
      {currentStep === 3 && (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className={styles.sectionTitle}>İşlem Tamamlandı</div>
          <div style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem", textAlign: "center" }}>
            ✨ Modeliniz yerel sunucu üzerinden optimize edilerek başarıyla yüklendi.
          </div>
          <button className="btn btn-secondary" onClick={handleResetFlow} style={{ width: "100%" }}>
            🔄 Yeni Model Üret
          </button>
        </div>
      )}

      {/* Adım Durum Göstergesi (Alt Bölüm) */}
      {flowMode === "manual" && (uploadedImageBase64 || selectedExample) && (
        <div style={{ marginTop: "1.5rem", background: "rgba(255,255,255,0.02)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "0.8rem" }}>
          <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Aktif Aşama Durumu:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <div style={{ color: currentStep >= 0 ? "var(--accent-indigo)" : "var(--text-muted)" }}>
              {currentStep >= 0 ? "✓" : "○"} 1. Görsel Kaynağı Hazır
            </div>
            <div style={{ color: currentStep >= 1 ? "var(--accent-indigo)" : "var(--text-muted)" }}>
              {currentStep >= 1 ? "✓" : "○"} 2. Arka Plan Kaldırıldı {currentStep === 0 && "👈 (Onay Bekliyor)"}
            </div>
            <div style={{ color: currentStep >= 2 ? "var(--accent-indigo)" : "var(--text-muted)" }}>
              {currentStep >= 2 ? "✓" : "○"} 3. 3D Model Taslağı Hazır {currentStep === 1 && "👈 (Onay Bekliyor)"}
            </div>
            <div style={{ color: currentStep >= 3 ? "var(--accent-indigo)" : "var(--text-muted)" }}>
              {currentStep >= 3 ? "✓" : "○"} 4. Model Optimize Edildi {currentStep === 2 && "👈 (Onay Bekliyor)"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
