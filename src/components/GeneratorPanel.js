"use client";

import { useState, useEffect } from "react";
import styles from "../app/Home.module.css";

const EXAMPLES = [
  { id: "cyberpunk", label: "Cyberpunk", path: "/ornek_resimler/cyberpunk_transparent.png" },
  { id: "historical", label: "Tarihi", path: "/ornek_resimler/historical_transparent.png" },
  { id: "hitech", label: "Hitech", path: "/ornek_resimler/hitech_transparent.png" },
  { id: "modern", label: "Modern", path: "/ornek_resimler/modern_transparent.png" }
];

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

export default function GeneratorPanel({ onModelLoaded, onStartGeneration, selectedEngines = ["triposr", "instantmesh"], onToggleEngine }) {
  // Akış ve Poligon Seçenekleri
  const [flowMode, setFlowMode] = useState("manual"); // "manual" veya "auto"
  const [polygonType, setPolygonType] = useState("triangle"); // "triangle" veya "quad"
  
  // Tab ve Girişler
  const [activeSubTab, setActiveSubTab] = useState("upload");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [localModel, setLocalModel] = useState("triposr"); // "triposr" veya "instantmesh"
  const [preset, setPreset] = useState("mobile"); // "mobile", "desktop", "original"
  
  // Seçilen her motorun kendi özel konfigürasyonu
  const [engineConfigs, setEngineConfigs] = useState({
    triposr: {
      mc_resolution: 256,
      bake_texture: false
    },
    instantmesh: {
      inference_steps: 30,
      simplify_ratio: 0.85
    },
    trellis: {
      sparse_guidance: 7.5,
      sparse_steps: 12,
      latent_guidance: 3.0,
      latent_steps: 12,
      simplify_ratio: 0.95,
      texture_resolution: 1024
    },
    hunyuan3d: {
      inference_steps: 100,
      octree_resolution: 512,
      target_face_number: 999100,
      simplify_mesh: false,
      seed: 1234,
      randomize_seed: false,
      guidance_scale: 14,
      number_of_chunks: 100000
    },
    sf3d: {
      texture_resolution: 1024,
      simplify_ratio: 0.85
    },
    unique3d: {
      mc_resolution: 416,
      bake_texture: true
    },
    lgm: {
      mc_resolution: 256,
      bake_texture: true,
      texture_resolution: 1024
    },
    crm: {
      guidance_scale: 5.0,
      sampling_steps: 12,
      texture_resolution: 1024
    },
    dreamgaussian: {
      mc_resolution: 224,
      bake_texture: true,
      texture_resolution: 2048
    },
    one2345: {
      mc_resolution: 320,
      bake_texture: true
    }
  });

  const [activeInfoTooltip, setActiveInfoTooltip] = useState(null);

  const getHardwareUsageText = (key) => {
    switch (key) {
      case "triposr":
        return "GPU (VRAM - ~4-6 GB) kullanır. Ekran kartınızda saniyeler içinde doğrudan ve hızlı çalışır.";
      case "sf3d":
        return "GPU (VRAM - ~6 GB) kullanır. Sınırda yerel ekran kartı belleğiyle en kaliteli dokulu çıktıyı hızlıca üretir.";
      case "dreamgaussian":
        return "GPU (VRAM - ~6 GB) kullanır. Hızlı yerel model üretimidir.";
      case "crm":
        return "GPU (VRAM - ~6-8 GB) kullanır. Kartınızın sınırlarında düşük bellek (Low-VRAM) moduyla çalışır.";
      case "lgm":
        return "CPU (Sistem RAM - ~12 GB) kullanır. Ekran kartı yetmediğinde CPU offload ile işlemci üzerinden yavaşça işlenir.";
      case "instantmesh":
        return "CPU (Sistem RAM - ~16 GB) kullanır. 6 GB VRAM yetmediği için işlemciye (CPU) aktarılır; 5-8 dk sürer ama bilgisayarı çökertmeden yerelde temiz geometri üretir.";
      case "trellis":
        return "Yerel işlemci (CPU) ve Sistem RAM'inizi kullanır. Çok ağır bir modeldir, 16 GB sistem RAM sınırınızı tamamen zorlar ve üretimi yerelde tamamlaması 10-15 dakika sürebilir.";
      case "hunyuan3d":
        return "Yerel işlemci (CPU) ve Sistem RAM'inizi kullanır. Ağırlıkları çok büyüktür, yerelde RAM yetmezliği nedeniyle yavaşlama veya donma riski taşır.";
      case "unique3d":
        return "Yerel işlemci (CPU) ve Sistem RAM'inizi kullanır. Detaylı yapısı nedeniyle yerel CPU modunda üretimi 15 dakikaya kadar sürebilir.";
      case "one2345":
        return "CPU (Sistem RAM - ~12 GB) modunda çalışabilir. 3D yazıcı odaklı geometri çıkartır.";
      default:
        return "GPU (VRAM) veya CPU (Sistem RAM) kullanır.";
    }
  };

  const calculateTotalEstimatedTime = () => {
    let totalSeconds = 0;
    selectedEngines.forEach((key) => {
      const config = engineConfigs[key];
      if (key === "triposr") {
        totalSeconds += config.bake_texture ? 45 : 20;
      } else if (key === "sf3d") {
        totalSeconds += 10;
      } else if (key === "crm") {
        totalSeconds += 15;
      } else if (key === "instantmesh") {
        totalSeconds += (config.inference_steps || 30) * 10; // 30 step = 300 saniye
      } else if (key === "trellis") {
        totalSeconds += 75; // Bulut kuyruk + işlem
      } else if (key === "hunyuan3d") {
        totalSeconds += 120; // Bulut kuyruk + işlem
      } else if (key === "lgm") {
        totalSeconds += 30;
      } else if (key === "dreamgaussian") {
        totalSeconds += 25;
      } else if (key === "unique3d") {
        totalSeconds += 180;
      } else if (key === "one2345") {
        totalSeconds += 60;
      }
    });

    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) {
      return `${mins} dk ${secs} sn`;
    }
    return `${secs} sn`;
  };

  const updateConfig = (engine, field, value) => {
    setEngineConfigs(prev => ({
      ...prev,
      [engine]: {
        ...prev[engine],
        [field]: value
      }
    }));
  };

  const renderEngineConfigCard = (key, queueNumber) => {
    const config = engineConfigs[key];
    const info = ENGINES[key];
    if (!config) return null;

    return (
      <div key={key} className={styles.engineConfigCard}>
        <div className={styles.engineConfigHeader}>
          <span>⚙️ {info.name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span 
              className={styles.infoIcon} 
              onClick={() => setActiveInfoTooltip(activeInfoTooltip === key ? null : key)}
              title="Donanım Kullanım Bilgisi"
              style={{ cursor: "pointer" }}
            >
              ℹ️
            </span>
            <span className={styles.engineConfigQueueBadge}>Sıra: {queueNumber}</span>
          </div>
        </div>

        {activeInfoTooltip === key && (
          <div className={styles.hardwareInfoBox}>
            <strong>💻 Donanım Kullanımı:</strong>
            <p>{getHardwareUsageText(key)}</p>
          </div>
        )}

        {key === "triposr" && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>MC Çözünürlük:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.mc_resolution}
                onChange={(e) => updateConfig(key, "mc_resolution", parseInt(e.target.value) || 256)}
              />
            </div>
            <div className={styles.engineConfigRow} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={config.bake_texture}
                onChange={(e) => updateConfig(key, "bake_texture", e.target.checked)}
              />
              <span className={styles.engineConfigLabel}>Doku Sentezle (Bake)</span>
            </div>
          </>
        )}

        {key === "sf3d" && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Sadeleştirme Oranı:</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                className={styles.engineConfigInput}
                value={config.simplify_ratio}
                onChange={(e) => updateConfig(key, "simplify_ratio", parseFloat(e.target.value) || 0.85)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Doku Çözünürlüğü:</span>
              <select
                className={styles.engineConfigInput}
                value={config.texture_resolution}
                onChange={(e) => updateConfig(key, "texture_resolution", parseInt(e.target.value) || 1024)}
              >
                <option value={512}>512px (Mobil)</option>
                <option value={1024}>1024px (Normal)</option>
                <option value={2048}>2048px (Yüksek)</option>
              </select>
            </div>
          </>
        )}

        {key === "crm" && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Guidance Scale:</span>
              <input
                type="number"
                step="0.5"
                className={styles.engineConfigInput}
                value={config.guidance_scale}
                onChange={(e) => updateConfig(key, "guidance_scale", parseFloat(e.target.value) || 5.0)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>İşlem Adımları:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.sampling_steps}
                onChange={(e) => updateConfig(key, "sampling_steps", parseInt(e.target.value) || 12)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Doku Çözünürlüğü:</span>
              <select
                className={styles.engineConfigInput}
                value={config.texture_resolution}
                onChange={(e) => updateConfig(key, "texture_resolution", parseInt(e.target.value) || 1024)}
              >
                <option value={512}>512px</option>
                <option value={1024}>1024px</option>
                <option value={2048}>2048px</option>
              </select>
            </div>
          </>
        )}

        {key === "instantmesh" && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>İşlem Adımları (Steps):</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.inference_steps}
                onChange={(e) => updateConfig(key, "inference_steps", parseInt(e.target.value) || 30)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Sadeleştirme Oranı:</span>
              <input
                type="number"
                step="0.05"
                className={styles.engineConfigInput}
                value={config.simplify_ratio}
                onChange={(e) => updateConfig(key, "simplify_ratio", parseFloat(e.target.value) || 0.85)}
              />
            </div>
          </>
        )}

        {key === "trellis" && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Seyrek Yönlendirme:</span>
              <input
                type="number"
                step="0.5"
                className={styles.engineConfigInput}
                value={config.sparse_guidance}
                onChange={(e) => updateConfig(key, "sparse_guidance", parseFloat(e.target.value) || 7.5)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Seyrek Adımlar:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.sparse_steps}
                onChange={(e) => updateConfig(key, "sparse_steps", parseInt(e.target.value) || 12)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Gizli Yönlendirme:</span>
              <input
                type="number"
                step="0.5"
                className={styles.engineConfigInput}
                value={config.latent_guidance}
                onChange={(e) => updateConfig(key, "latent_guidance", parseFloat(e.target.value) || 3.0)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Gizli Adımlar:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.latent_steps}
                onChange={(e) => updateConfig(key, "latent_steps", parseInt(e.target.value) || 12)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Sadeleştirme Oranı:</span>
              <input
                type="number"
                step="0.01"
                className={styles.engineConfigInput}
                value={config.simplify_ratio}
                onChange={(e) => updateConfig(key, "simplify_ratio", parseFloat(e.target.value) || 0.95)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Doku Çözünürlüğü:</span>
              <select
                className={styles.engineConfigInput}
                value={config.texture_resolution}
                onChange={(e) => updateConfig(key, "texture_resolution", parseInt(e.target.value) || 1024)}
              >
                <option value={512}>512px</option>
                <option value={1024}>1024px</option>
                <option value={2048}>2048px</option>
              </select>
            </div>
          </>
        )}

        {key === "hunyuan3d" && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Seed:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.seed}
                onChange={(e) => updateConfig(key, "seed", parseInt(e.target.value) || 1234)}
              />
            </div>
            <div className={styles.engineConfigRow} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={config.randomize_seed}
                onChange={(e) => updateConfig(key, "randomize_seed", e.target.checked)}
              />
              <span className={styles.engineConfigLabel}>Randomize Seed</span>
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>İşlem Adımları (Steps):</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.inference_steps}
                onChange={(e) => updateConfig(key, "inference_steps", parseInt(e.target.value) || 100)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Hacim Çözünürlüğü:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.octree_resolution}
                onChange={(e) => updateConfig(key, "octree_resolution", parseInt(e.target.value) || 512)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Guidance Scale:</span>
              <input
                type="number"
                step="0.5"
                className={styles.engineConfigInput}
                value={config.guidance_scale}
                onChange={(e) => updateConfig(key, "guidance_scale", parseFloat(e.target.value) || 14.0)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Number of Chunks:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.number_of_chunks}
                onChange={(e) => updateConfig(key, "number_of_chunks", parseInt(e.target.value) || 100000)}
              />
            </div>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>Hedef Poligon (Face):</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.target_face_number}
                onChange={(e) => updateConfig(key, "target_face_number", parseInt(e.target.value) || 999100)}
              />
            </div>
            <div className={styles.engineConfigRow} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={config.simplify_mesh}
                onChange={(e) => updateConfig(key, "simplify_mesh", e.target.checked)}
              />
              <span className={styles.engineConfigLabel}>Ağı Sadeleştir</span>
            </div>
          </>
        )}

        {(key === "dreamgaussian" || key === "lgm" || key === "unique3d" || key === "one2345") && (
          <>
            <div className={styles.engineConfigRow}>
              <span className={styles.engineConfigLabel}>MC Çözünürlük:</span>
              <input
                type="number"
                className={styles.engineConfigInput}
                value={config.mc_resolution}
                onChange={(e) => updateConfig(key, "mc_resolution", parseInt(e.target.value) || 256)}
              />
            </div>
            <div className={styles.engineConfigRow} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={config.bake_texture}
                onChange={(e) => updateConfig(key, "bake_texture", e.target.checked)}
              />
              <span className={styles.engineConfigLabel}>Doku Sentezle</span>
            </div>
            {config.texture_resolution !== undefined && (
              <div className={styles.engineConfigRow}>
                <span className={styles.engineConfigLabel}>Doku Çözünürlüğü:</span>
                <select
                  className={styles.engineConfigInput}
                  value={config.texture_resolution}
                  onChange={(e) => updateConfig(key, "texture_resolution", parseInt(e.target.value) || 1024)}
                >
                  <option value={512}>512px</option>
                  <option value={1024}>1024px</option>
                  <option value={2048}>2048px</option>
                </select>
              </div>
            )}
          </>
        )}
      </div>
    );
  };
  
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
    onModelLoaded("", 0, "", "triposr");
    onModelLoaded("", 0, "", "instantmesh");
    
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
    onModelLoaded("", 0, "", "triposr");
    onModelLoaded("", 0, "", "instantmesh");
  };

  // AŞAMA 1: Görsel Üretimi (Yazıdan Görsele)
  const handleGenerateImage = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setStatus("Yerel ekran kartınız görseli üretiyor...");
    setLogs("Stable Diffusion / ComfyUI çalıştırılıyor...");
    startProgress(8); // Görsel üretimi için tahmini 8 saniye
    onModelLoaded("", 0, "", "triposr");
    onModelLoaded("", 0, "", "instantmesh");

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

  // 3D Model Üretimi İşlemi (Seçilen tüm motorları sırayla çalıştırır)
  const run3DGeneration = async (imageSrc) => {
    if (!selectedEngines || selectedEngines.length === 0) {
      alert("Lütfen en az bir 3D motoru seçin.");
      return;
    }

    setIsLoading(true);
    const localUrl = getLocalUrl();
    const refImage = removedBgImage || uploadedImageBase64 || (selectedExample && selectedExample.path);

    // Tüm seçilen modeller için yüklenme durumunu tetikle
    if (onStartGeneration) {
      selectedEngines.forEach((key) => onStartGeneration(key));
    }

    let finalBlob = null;
    let finalUrl = "";

    // Sıralı olarak tüm motorları çağır
    for (let i = 0; i < selectedEngines.length; i++) {
      const engineKey = selectedEngines[i];
      const engineName = ENGINES[engineKey]?.name || engineKey;

      setStatus(`${i + 1}/${selectedEngines.length}: ${engineName} örülüyor...`);
      setLogs(`${engineName} yerel motoru çalıştırılıyor. Lütfen bekleyin...`);

      const estTime = engineKey === "sf3d" ? 8 : (engineKey === "triposr" ? 45 : 60);
      startProgress(estTime);

      try {
        const response = await fetch(`${localUrl}/api/generate-3d`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            image: imageSrc, 
            model: engineKey,
            params: engineConfigs[engineKey]
          })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `${engineName} üretilemedi.`);

        const glbRes = await fetch(data.glb);
        const glbBlob = await glbRes.blob();
        const glbUrl = URL.createObjectURL(glbBlob);

        onModelLoaded(glbUrl, glbBlob.size, refImage, engineKey);
        
        finalBlob = glbBlob;
        finalUrl = glbUrl;
      } catch (err) {
        console.error(err);
        onModelLoaded("", 0, "", engineKey, err.message);
      }
    }

    // Aşamayı sonlandır
    stopProgress();
    setIsLoading(false);
    setCurrentStep(2);
    setGeneratedGlbUrl(finalUrl);
    setGeneratedGlbSize(finalBlob ? finalBlob.size : 0);
    setStatus("Tüm modeller başarıyla oluşturuldu!");

    if (flowMode === "auto" && finalBlob) {
      runGlbOptimization(finalBlob);
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
      onModelLoaded(finalGlbUrl, finalSize, removedBgImage || uploadedImageBase64 || (selectedExample && selectedExample.path));
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
    // Seçili olan tüm motorların pencerelerini sıfırla
    if (selectedEngines) {
      selectedEngines.forEach((key) => onModelLoaded("", 0, "", key));
    }
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
      <div className="input-group" style={{ marginBottom: "0.5rem" }}>
        <div className={styles.flowModeGrid}>
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

      {/* 3D Karşılaştırma Motorları Seçici Listesi */}
      <div className="input-group">
        <label className="input-label" style={{ fontSize: "0.7rem" }}>Kıyaslanacak 3D Motorları (Seçim Sıranıza Göre Ardışık Çalışır)</label>
        <div className={styles.checklistContainer}>
          {Object.keys(ENGINES).map((key) => {
            const queueIndex = selectedEngines.indexOf(key);
            return (
              <label key={key} className={styles.checklistItem}>
                <input
                  type="checkbox"
                  checked={selectedEngines.includes(key)}
                  onChange={() => onToggleEngine(key)}
                  disabled={isLoading}
                />
                <span style={{ fontWeight: selectedEngines.includes(key) ? 600 : 400 }}>
                  {ENGINES[key].name} {queueIndex !== -1 && <span style={{ color: "var(--accent-indigo)", fontSize: "0.75rem", fontWeight: "bold", marginLeft: "0.25rem" }}>({queueIndex + 1})</span>}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Seçilen Her Motorun Gelişmiş Ayar Kartı */}
      {selectedEngines.length > 0 && (
        <div className="input-group">
          <label className="input-label" style={{ fontSize: "0.7rem" }}>Seçili Motor Parametreleri</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "320px", overflowY: "auto", paddingRight: "0.25rem", border: "1px dashed rgba(255,255,255,0.05)", padding: "0.4rem", borderRadius: "6px" }}>
            {selectedEngines.map((key, idx) => renderEngineConfigCard(key, idx + 1))}
          </div>
          {/* Toplam Süre Bilgilendirmesi */}
          <div className={styles.queueTimeBanner}>
            ⏳ <strong>Tahmini Toplam Süre:</strong> {calculateTotalEstimatedTime()}
            <br />
            <span style={{ fontSize: "0.65rem", opacity: 0.85, display: "inline-block", marginTop: "0.15rem" }}>
              * Motorlar sırayla (ardışık) çalışarak belleği boşaltır, çökme önlenir.
            </span>
          </div>
        </div>
      )}

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
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", textAlign: "left" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#ffffff", margin: 0 }}>Ham 3D Model Hazır</h4>
          
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.1rem 0" }}>
            Boyut: <strong style={{ color: "var(--accent-cyan)" }}>{(generatedGlbSize / 1024 / 1024).toFixed(2)} MB</strong>
          </div>

          {/* Yerel Motor Seçimi */}
          <div className="input-group">
            <label className="input-label" style={{ fontSize: "0.75rem", textTransform: "none", color: "var(--text-muted)" }}>Yapay Zeka Motoru</label>
            <select
              className="input-text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "0.4rem" }}
            >
              <option value="triposr">TripoSR (Hızlı - 1660 için Önerilen)</option>
              <option value="instantmesh">InstantMesh (Çoklu Açı - Yüksek Kalite)</option>
            </select>
          </div>

          {/* Poligon Tipi Seçimi */}
          <div className="input-group">
            <label className="input-label" style={{ fontSize: "0.75rem", textTransform: "none", color: "var(--text-muted)" }}>Poligon Yapı Tipi</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              <div
                className={`${styles.ratioOption} ${polygonType === "triangle" ? styles.ratioOptionActive : ""}`}
                onClick={() => setPolygonType("triangle")}
                style={{ padding: "0.45rem", fontSize: "0.75rem" }}
              >
                🔺 Üçgen
              </div>
              <div
                className={`${styles.ratioOption} ${polygonType === "quad" ? styles.ratioOptionActive : ""}`}
                onClick={() => setPolygonType("quad")}
                style={{ padding: "0.45rem", fontSize: "0.75rem" }}
              >
                ⬛ Dörtgen
              </div>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontSize: "0.75rem", textTransform: "none", color: "var(--text-muted)" }}>Mobil / Kalite Preseti</label>
            <div className={styles.presets}>
              <div
                className={`${styles.presetCard} ${preset === "mobile" ? styles.presetCardActive : ""}`}
                onClick={() => setPreset("mobile")}
                style={{ padding: "0.45rem 0.6rem" }}
              >
                <div className={styles.presetName}>📱 Mobil Uyumlu (%85 Azaltma)</div>
              </div>
              <div
                className={`${styles.presetCard} ${preset === "desktop" ? styles.presetCardActive : ""}`}
                onClick={() => setPreset("desktop")}
                style={{ padding: "0.45rem 0.6rem" }}
              >
                <div className={styles.presetName}>💻 Masaüstü (%50 Azaltma)</div>
              </div>
              <div
                className={`${styles.presetCard} ${preset === "original" ? styles.presetCardActive : ""}`}
                onClick={() => setPreset("original")}
                style={{ padding: "0.45rem 0.6rem" }}
              >
                <div className={styles.presetName}>💎 Orijinal Kalite</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.4rem" }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: "0.45rem", fontSize: "0.75rem" }} onClick={handleResetFlow}>
              Temizle
            </button>
            <button className="btn btn-accent" style={{ flex: 1.8, padding: "0.45rem", fontSize: "0.75rem" }} onClick={handleOptimizationTrigger}>
              ⚡ Optimize Et & Kaydet
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
