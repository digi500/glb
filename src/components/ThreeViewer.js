"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../app/Home.module.css";

export default function ThreeViewer({ src, fileSize }) {
  const viewerRef = useRef(null);
  const [stats, setStats] = useState({ triangles: 0, vertices: 0 });
  const [isWireframe, setIsWireframe] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);

  // Clear stats when src changes
  useEffect(() => {
    setStats({ triangles: 0, vertices: 0 });
  }, [src]);

  // Handle model load event
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => {
      try {
        // Access model-viewer's internal Three.js scene
        const model = viewer.model;
        if (!model) return;

        let triangles = 0;
        let vertices = 0;

        model.scene.traverse((object) => {
          if (object.isMesh) {
            const geometry = object.geometry;
            if (geometry) {
              // Calculate triangles
              if (geometry.index) {
                triangles += geometry.index.count / 3;
              } else if (geometry.attributes.position) {
                triangles += geometry.attributes.position.count / 3;
              }

              // Calculate vertices
              if (geometry.attributes.position) {
                vertices += geometry.attributes.position.count;
              }
            }
          }
        });

        setStats({
          triangles: Math.round(triangles),
          vertices: Math.round(vertices)
        });

        // Apply current wireframe setting to the newly loaded model
        applyWireframe(isWireframe);
      } catch (err) {
        console.error("Error computing model stats:", err);
      }
    };

    viewer.addEventListener("load", handleLoad);
    
    // Race condition önleyici: Model zaten yüklüyse istatistikleri hemen hesapla
    if (viewer.loaded) {
      handleLoad();
    }

    return () => {
      viewer.removeEventListener("load", handleLoad);
    };
  }, [src, isWireframe]);

  // Apply wireframe material property
  const applyWireframe = (wireframeMode) => {
    const viewer = viewerRef.current;
    if (!viewer || !viewer.model) return;

    try {
      viewer.model.scene.traverse((object) => {
        if (object.isMesh && object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => {
            material.wireframe = wireframeMode;
          });
        }
      });
      // Force redrawing the scene
      viewer.queueRender();
    } catch (err) {
      console.error("Error setting wireframe mode:", err);
    }
  };

  const toggleWireframe = () => {
    const nextWireframe = !isWireframe;
    setIsWireframe(nextWireframe);
    applyWireframe(nextWireframe);
  };

  const toggleAutoRotate = () => {
    setIsAutoRotate(!isAutoRotate);
  };

  const resetCamera = () => {
    const viewer = viewerRef.current;
    if (viewer) {
      viewer.cameraOrbit = "unset";
      viewer.cameraTarget = "unset";
      viewer.fieldOfView = "unset";
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return "Hesaplanıyor...";
    if (bytes < 1024) return bytes + " Bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  };

  return (
    <div className={styles.viewerContainer}>
      <model-viewer
        ref={viewerRef}
        src={src}
        camera-controls
        auto-rotate={isAutoRotate ? "" : undefined}
        shadow-intensity="1"
        environment-image="neutral"
        exposure="1"
        interaction-prompt="auto"
        alt="AI Generated 3D GLB Model"
      >
        {/* Toolbar */}
        <div className={styles.viewerToolbar}>
          <button
            className={`${styles.toolbarBtn} ${isWireframe ? styles.toolbarBtnActive : ""}`}
            onClick={toggleWireframe}
            title="Kafes Yapı (Wireframe) Modu"
          >
            🕸️
          </button>
          <button
            className={`${styles.toolbarBtn} ${isAutoRotate ? styles.toolbarBtnActive : ""}`}
            onClick={toggleAutoRotate}
            title="Döndürme (Auto Rotate) Modu"
          >
            🔄
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={resetCamera}
            title="Kamerayı Sıfırla"
          >
            📷
          </button>
        </div>

        {/* Stats overlay */}
        <div className={styles.statsBox}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Dosya Boyutu:</span>
            <span className={styles.statValue}>{formatBytes(fileSize)}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Poligon (Üçgen):</span>
            <span className={styles.statValue}>{stats.triangles.toLocaleString()}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Köşe Noktası (Vertex):</span>
            <span className={styles.statValue}>{stats.vertices.toLocaleString()}</span>
          </div>
        </div>
      </model-viewer>
    </div>
  );
}
