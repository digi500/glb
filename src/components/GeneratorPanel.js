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
  const [activeSubTab, setActiveSubTab] = useState("upload"); // "prompt" or "upload"
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [replicateModel, setReplicateModel] = useState("charles-dyfis-net/trellis"); // Trellis or InstantMesh
  const [preset, setPreset] = useState("mobile"); // "mobile", "desktop", "original"
  
  // Image states
  const [selectedExample, setSelectedExample] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState("");
  const [removedBgImage, setRemovedBgImage] = useState("");
  
  // Status and logs
  const [status, setStatus] = useState("");
  const [logs, setLogs] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Retrieve token helper
  const getApiToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("glb_replicate_token") || "";
    }
    return "";
  };

  // Convert File to Base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedExample(null);
    setRemovedBgImage("");
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Select example image
  const selectExample = (ex) => {
    setUploadedImageBase64("");
    setRemovedBgImage("");
    setSelectedExample(ex);
  };

  // Common Poller for Replicate predictions
  const pollPrediction = async (predictionId, actionName) => {
    const token = getApiToken();
    const interval = 2000;
    
    while (true) {
      const response = await fetch(`/api/check-prediction?id=${predictionId}`, {
        headers: { "x-replicate-token": token }
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Durum kontrolü başarısız oldu.");
      }

      if (data.status === "succeeded") {
        return data.output;
      }
      
      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(`Yapay zeka işlemi başarısız oldu: ${data.error || "Bilinmeyen hata"}`);
      }

      // Update status with prediction logs or standard state
      setStatus(`${actionName} işleniyor... (${data.status})`);
      if (data.logs) {
        // Just extract the last line of logs to keep it neat
        const logLines = data.logs.trim().split("\n");
        setLogs(logLines[logLines.length - 1] || "");
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  };

  // Step 1: AI Image Generation
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setStatus("Görsel oluşturuluyor...");
    setLogs("");

    try {
      const token = getApiToken();
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-replicate-token": token
        },
        body: JSON.stringify({
          prompt: prompt,
          model: "black-forest-labs/flux-schnell",
          aspect_ratio: aspectRatio
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Poll Replicate
      const output = await pollPrediction(data.id, "Görsel üretimi");
      
      // Flux Schnell outputs an array of image URLs
      const imageUrl = Array.isArray(output) ? output[0] : output;
      
      // Set generated image as current uploaded base64 (or URL)
      setUploadedImageBase64(imageUrl);
      setSelectedExample(null);
      setRemovedBgImage("");
      setActiveSubTab("upload"); // Switch to upload view to see preview and BG remove
      setStatus("Görsel başarıyla üretildi!");
    } catch (err) {
      console.error(err);
      alert(`Görsel üretilemedi: ${err.message}`);
      setStatus("Hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Background Removal
  const handleRemoveBackground = async () => {
    const sourceImage = selectedExample ? selectedExample.path : uploadedImageBase64;
    if (!sourceImage) return;

    setIsLoading(true);
    setStatus("Arka plan kaldırılıyor...");
    setLogs("");

    try {
      const token = getApiToken();
      const response = await fetch("/api/remove-bg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-replicate-token": token
        },
        body: JSON.stringify({ image: sourceImage })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Poll Replicate
      const outputUrl = await pollPrediction(data.id, "Arka plan temizleme");
      setRemovedBgImage(outputUrl);
      setStatus("Arka plan başarıyla kaldırıldı!");
    } catch (err) {
      console.error(err);
      alert(`Arka plan kaldırılamadı: ${err.message}`);
      setStatus("Hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Image-to-3D Model Generation & Local Optimization
  const handleGenerate3D = async () => {
    // Decide the input image. Prioritize background-removed image, then example, then uploaded.
    let inputImage = removedBgImage;
    if (!inputImage) {
      if (selectedExample) {
        // Examples already have transparent backgrounds!
        inputImage = window.location.origin + selectedExample.path;
      } else if (uploadedImageBase64) {
        inputImage = uploadedImageBase64;
      }
    }

    if (!inputImage) {
      alert("Lütfen önce bir görsel yükleyin, seçin veya yapay zeka ile üretin.");
      return;
    }

    setIsLoading(true);
    setStatus("3D model üretimi başlatılıyor...");
    setLogs("");

    try {
      const token = getApiToken();
      const response = await fetch("/api/generate-3d", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-replicate-token": token
        },
        body: JSON.stringify({
          image: inputImage,
          model: replicateModel
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Poll Replicate
      const output = await pollPrediction(data.id, "3D model üretimi");
      
      // Replicate models output the GLB URL.
      // E.g., Charles-dyfis-net/trellis outputs a GLB URL directly or in format:
      // data.output contains the URL. Let's inspect typical outputs:
      // For Trellis, output is often a string URL or an object with "model" field.
      let rawGlbUrl = "";
      if (typeof output === "string") {
        rawGlbUrl = output;
      } else if (output && typeof output === "object") {
        rawGlbUrl = output.model || output.file || output.glb || Object.values(output)[0];
      }

      if (!rawGlbUrl) {
        throw new Error("3D model dosyası (GLB) çıktıda bulunamadı.");
      }

      setStatus("GLB dosyası indiriliyor ve optimize ediliyor...");
      
      // Run Post-Optimization based on Preset
      let finalGlbUrl = rawGlbUrl;
      let finalSize = 0;

      if (preset !== "original") {
        const ratio = preset === "mobile" ? 0.15 : 0.50;
        
        // Fetch raw GLB
        const glbRes = await fetch(rawGlbUrl);
        const glbBlob = await glbRes.blob();

        const formData = new FormData();
        formData.append("file", glbBlob, "model.glb");
        formData.append("ratio", ratio.toString());
        formData.append("error", "0.01");

        const optRes = await fetch("/api/optimize-glb", {
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
      } else {
        // Just fetch size of raw GLB
        const glbRes = await fetch(rawGlbUrl);
        const glbBlob = await glbRes.blob();
        finalGlbUrl = URL.createObjectURL(glbBlob);
        finalSize = glbBlob.size;
      }

      setStatus("Başarılı! Model yüklendi.");
      onModelLoaded(finalGlbUrl, finalSize);
    } catch (err) {
      console.error(err);
      alert(`3D model üretilemedi: ${err.message}`);
      setStatus("Hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.sidebar} panel`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div style={{ fontWeight: 600, color: "#ffffff", fontSize: "1.1rem" }}>{status}</div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", maxWidth: "80%", textAlign: "center" }}>
            {logs}
          </div>
        </div>
      )}

      {/* Sub Tabs */}
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

      {activeSubTab === "prompt" ? (
        <div className="fade-in">
          <div className={styles.sectionTitle}>1. Yapay Zekayla Görsel Üret</div>
          <div className="input-group">
            <label className="input-label">Prompt (İngilizce önerilir)</label>
            <textarea
              className="input-text"
              rows="3"
              placeholder="A cute low-poly 3D style small factory building, isometric view, bright lighting..."
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
            disabled={!prompt.trim() || !getApiToken()}
          >
            🎨 Görsel Üret (Flux Schnell)
          </button>
          {!getApiToken() && (
            <p style={{ color: "var(--accent-pink)", fontSize: "0.75rem", marginTop: "0.5rem", textAlign: "center" }}>
              Lütfen önce sağ üstteki ⚙️ butonundan API anahtarınızı girin.
            </p>
          )}
        </div>
      ) : (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className={styles.sectionTitle}>1. Kaynak Görsel</div>
          
          {/* Example Images Section */}
          <div className={styles.ornekResimlerTitle}>Örnek Görseller (Hazır Arka Plansız)</div>
          <div className={styles.ornekGrid}>
            {EXAMPLES.map((ex) => (
              <div
                key={ex.id}
                className={`${styles.ornekThumbnail} ${selectedExample?.id === ex.id ? styles.ornekThumbnailActive : ""}`}
                onClick={() => selectExample(ex)}
                title={`${ex.label} Görseli`}
              >
                <img src={ex.path} alt={ex.label} />
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.25rem 0" }}>
            veya kendi görselinizi yükleyin
          </div>

          {/* Image Upload Dropzone */}
          <label className="dropzone">
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
            <span style={{ fontSize: "2rem" }}>📤</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Bilgisayardan Dosya Seç</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>PNG, JPG or WEBP</span>
          </label>

          {/* Preview Box */}
          {(uploadedImageBase64 || selectedExample) && (
            <div className={styles.imageFlow}>
              <div className={styles.imageGrid}>
                <div className={styles.imageBox}>
                  <img
                    src={selectedExample ? selectedExample.path : uploadedImageBase64}
                    alt="Orijinal Görsel"
                  />
                  <div className={styles.imageLabel}>Giriş Görseli</div>
                </div>
                <div className={styles.imageBox}>
                  {removedBgImage ? (
                    <img src={removedBgImage} alt="Arka Plansız Görsel" />
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "0.5rem" }}>
                      {selectedExample ? "Örnek zaten saydam arka planlı!" : "Arka plan kaldırılmadı"}
                    </span>
                  )}
                  <div className={styles.imageLabel}>Arka Plansız</div>
                </div>
              </div>

              {!selectedExample && !removedBgImage && (
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%" }}
                  onClick={handleRemoveBackground}
                  disabled={!uploadedImageBase64 || !getApiToken()}
                >
                  ✂️ Arka Planı Kaldır (Rembg)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3D Model Parameters Section */}
      <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "0.5rem 0" }} />

      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className={styles.sectionTitle}>2. 3D Model Parametreleri</div>
        
        <div className="input-group">
          <label className="input-label">3D Üretici Motor (AI Model)</label>
          <select
            className="input-text"
            value={replicateModel}
            onChange={(e) => setReplicateModel(e.target.value)}
          >
            <option value="charles-dyfis-net/trellis">Trellis (Yüksek Kalite + Materyaller)</option>
            <option value="vaibhavs10/instantmesh">InstantMesh (Hızlı + Güvenli)</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Mobil / Kalite Hedefi</label>
          <div className={styles.presets}>
            <div
              className={`${styles.presetCard} ${preset === "mobile" ? styles.presetCardActive : ""}`}
              onClick={() => setPreset("mobile")}
            >
              <div>
                <div className={styles.presetName}>📱 Mobil Uyumlu (Düşük Poligon)</div>
                <div className={styles.presetDesc}>%85 Poligon Azaltma, Draco Sıkıştırma. Mobil oyunlar için ideal.</div>
              </div>
              <span>~10k Poly</span>
            </div>
            <div
              className={`${styles.presetCard} ${preset === "desktop" ? styles.presetCardActive : ""}`}
              onClick={() => setPreset("desktop")}
            >
              <div>
                <div className={styles.presetName}>💻 Masaüstü (Orta Poligon)</div>
                <div className={styles.presetDesc}>%50 Poligon Azaltma. Detaylı render ve PC oyunları için ideal.</div>
              </div>
              <span>~35k Poly</span>
            </div>
            <div
              className={`${styles.presetCard} ${preset === "original" ? styles.presetCardActive : ""}`}
              onClick={() => setPreset("original")}
            >
              <div>
                <div className={styles.presetName}>💎 Orijinal Yüksek Kalite</div>
                <div className={styles.presetDesc}>Sıkıştırma veya Poligon azaltma uygulanmaz. Maksimum detay.</div>
              </div>
              <span>100% Detay</span>
            </div>
          </div>
        </div>

        <button
          className="btn btn-accent"
          style={{ width: "100%" }}
          onClick={handleGenerate3D}
          disabled={(!selectedExample && !uploadedImageBase64) || !getApiToken()}
        >
          🚀 3D GLB Model Üret
        </button>
        {!getApiToken() && (
          <p style={{ color: "var(--accent-pink)", fontSize: "0.75rem", textAlign: "center" }}>
            3D üretimi için API anahtarınızı girmelisiniz.
          </p>
        )}
      </div>
    </div>
  );
}
