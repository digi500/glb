"use client";

import { useState } from "react";
import styles from "../app/Home.module.css";

export default function OptimizerPanel({ onModelLoaded }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [ratio, setRatio] = useState(0.35); // Keep 35% of triangles by default
  const [error, setError] = useState(0.01); // Maximum error tolerance
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [optimizationType, setOptimizationType] = useState("ratio"); // "ratio" veya "faces"
  const [targetFaces, setTargetFaces] = useState(5000);

  const getSettings = () => {
    if (typeof window !== "undefined") {
      return {
        mode: localStorage.getItem("glb_execution_mode") || "cloud",
        localUrl: localStorage.getItem("glb_local_server_url") || "http://localhost:5000"
      };
    }
    return { mode: "cloud", localUrl: "http://localhost:5000" };
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith(".glb")) {
      alert("Lütfen yalnızca .glb uzantılı 3D dosyaları yükleyin.");
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleOptimize = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setStatus("GLB dosyası optimize ediliyor...");

    const { mode, localUrl } = getSettings();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("error", error.toString());

      if (optimizationType === "faces") {
        formData.append("ratio", "1.0");
        formData.append("target_face_count", targetFaces.toString());
      } else {
        formData.append("ratio", ratio.toString());
      }

      // API rotasını çalışma moduna göre seç
      const targetApi = mode === "local" ? `${localUrl}/api/optimize-glb` : "/api/optimize-glb";

      const response = await fetch(targetApi, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Optimizasyon işlemi başarısız oldu.");
      }

      // Convert response stream to blob
      const optBlob = await response.blob();
      const optGlbUrl = URL.createObjectURL(optBlob);
      const optSize = optBlob.size;

      setStatus("Optimizasyon tamamlandı!");
      onModelLoaded(optGlbUrl, optSize);
    } catch (err) {
      console.error(err);
      alert(`Dosya optimize edilemedi: ${err.message}`);
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
          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            WebAssembly Meshopt ve Weld uygulanıyor...
          </div>
        </div>
      )}

      <div className={styles.sectionTitle}>3D Dosya Yükle (.GLB)</div>

      {!selectedFile ? (
        <label className="dropzone">
          <input
            type="file"
            accept=".glb"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <span style={{ fontSize: "2rem" }}>📦</span>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Bilgisayardan GLB Dosyası Seç</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Sadece .glb formatı desteklenir</span>
        </label>
      ) : (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className={styles.fileInfo}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
              <span style={{ fontWeight: 600, maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedFile.name}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Orijinal: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <button className={styles.removeFileBtn} onClick={handleRemoveFile}>
              Kaldır
            </button>
          </div>
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "0.5rem 0" }} />

      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
        <div className={styles.sectionTitle}>Optimizasyon Ayarları</div>

        <div className="input-group" style={{ marginBottom: "0.5rem" }}>
          <label className="input-label" style={{ fontSize: "0.75rem", textTransform: "none", color: "var(--text-muted)" }}>Sadeleştirme Yöntemi</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
            <div
              className={`${styles.ratioOption} ${optimizationType === "ratio" ? styles.ratioOptionActive : ""}`}
              onClick={() => setOptimizationType("ratio")}
              style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "center" }}
            >
              Oran (%) ile Sadeleştir
            </div>
            <div
              className={`${styles.ratioOption} ${optimizationType === "faces" ? styles.ratioOptionActive : ""}`}
              onClick={() => setOptimizationType("faces")}
              style={{ padding: "0.4rem", fontSize: "0.75rem", textAlign: "center" }}
            >
              Hedef Poligon (Face) ile
            </div>
          </div>
        </div>

        {optimizationType === "ratio" ? (
          /* Ratio Slider */
          <div className={styles.rangeSliderContainer}>
            <div className={styles.rangeSliderHeader}>
              <span className={styles.statLabel}>Poligon Koruma Oranı</span>
              <span className={styles.statValue} style={{ color: "var(--accent-purple)" }}>
                {Math.round(ratio * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.00"
              step="0.05"
              value={ratio}
              onChange={(e) => setRatio(parseFloat(e.target.value))}
              className={styles.slider}
              disabled={!selectedFile}
            />
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              {ratio === 1 ? "Poligon azaltma uygulanmaz." : `Poligonların %${Math.round((1 - ratio) * 100)} kadarı silinecek.`}
            </span>
          </div>
        ) : (
          /* Custom Target Faces Input */
          <div className="input-group">
            <label className="input-label">Hedef Poligon (Face Sayısı)</label>
            <input
              type="number"
              className="input-text"
              value={targetFaces}
              onChange={(e) => setTargetFaces(parseInt(e.target.value) || 5000)}
              disabled={!selectedFile}
              style={{ padding: "0.4rem", fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Blender modelin poligonlarını bu sayıya düşürmek için dinamik oran hesaplar.
            </span>
          </div>
        )}

        {/* Error Slider */}
        <div className={styles.rangeSliderContainer}>
          <div className={styles.rangeSliderHeader}>
            <span className={styles.statLabel}>Hata Eşik Toleransı</span>
            <span className={styles.statValue} style={{ color: "var(--accent-cyan)" }}>
              {error}
            </span>
          </div>
          <input
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={error}
            onChange={(e) => setError(parseFloat(e.target.value))}
            className={styles.slider}
            disabled={!selectedFile}
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            Düşük değerler geometrik şekli korur; yüksek değerler daha agresif poligon azaltmaya izin verir.
          </span>
        </div>

        <button
          className="btn btn-accent"
          style={{ width: "100%" }}
          onClick={handleOptimize}
          disabled={!selectedFile}
        >
          ⚡ GLB Modelini Optimize Et
        </button>
      </div>
    </div>
  );
}
