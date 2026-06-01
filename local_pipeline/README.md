# Yerel Ekran Kartı (GTX 1660) ile 3D GLB Üretim Pipeline Rehberi

Bu klasördeki araçlar, **hiçbir bulut API ücreti ödemeden** bilgisayarınızdaki GTX 1660 ekran kartını ve Blender uygulamasını kullanarak 3D varlıklar üretmenizi ve optimize etmenizi sağlar.

---

## 🛠️ Ön Gereksinimler

Yerel pipeline'ı çalıştırmak için bilgisayarınızda şunların kurulu olması gerekir:

1. **Python 3.10 veya 3.11** (Sistem PATH yoluna eklenmiş olmalı).
2. **Blender 4.0 (veya üzeri)**. Varsayılan kurulum yolu: `C:\Program Files\Blender Foundation\Blender 4.0\blender.exe`.
3. **Git** (Projeleri klonlamak için).

---

## ⚙️ Kurulum ve Hazırlık

### 1. Python Kütüphanelerini Yükleyin
Bir komut satırı (CMD / PowerShell) açın ve aşağıdaki kütüphaneleri yükleyin:
```bash
pip install rembg pillow
```
*Not: `rembg` arka planı yapay zekayla kaldırmak için ilk kullanımda küçük bir model dosyası indirecektir.*

### 2. Yerel 3D Motorunu Seçin ve Kurun
Görselleri 3D modele dönüştürmek için yerel ekran kartınızda çalışan şu iki araçtan birini klonlayın:

#### Seçenek A: TripoSR (En Hızlısı)
Hızlı ve düşük VRAM kullanımı ile GTX 1660 için en stabil seçenektir:
```bash
git clone https://github.com/VAST-AI-Research/TripoSR.git
cd TripoSR
pip install -r requirements.txt
```
Kullanım:
```bash
python run.py --pretrained-model-name stabilityai/TripoSR --image-path input_image.png --output-dir output/
```

#### Seçenek B: InstantMesh (Daha Yüksek Kalite)
Biraz daha fazla VRAM kullanır ancak çoklu açıları simüle ederek daha kaliteli mesh üretir:
```bash
git clone https://github.com/TencentARC/InstantMesh.git
cd InstantMesh
pip install -r requirements.txt
```
Kullanım:
```bash
python run.py configs/instant-mesh-large.yaml input_image.png --output_path output/
```

---

## 🚀 Scriptin Çalıştırılması

Bu klasördeki `run_local.py` dosyası arka plan kaldırma ve Blender poligon azaltma (decimate) işlemlerini otomatikleştirir.

### Örnek Senaryo:
1. `c:\Glb\local_pipeline\input\` klasörüne bir görsel koyun (örn: `fabrika.png`).
2. Scripti çalıştırarak arka planını kaldırın:
   ```bash
   python run_local.py --input input/fabrika.png
   ```
3. Oluşan `fabrika_transparent.png` dosyasını üstteki yerel 3D motorlarına (TripoSR / InstantMesh) vererek bir `.obj` çıktısı alın (örn: `fabrika.obj`).
4. Bu `.obj` dosyasını `input/` klasörüne koyun.
5. Scripti Blender temizliğini tetiklemek için tekrar çalıştırın (poligon oranını %30'a çeker):
   ```bash
   python run_local.py --input input/fabrika.png --ratio 0.3
   ```
6. `output/model.glb` dosyasını hemen kullanabilirsiniz!

---

## 💡 İpuçları
* **Daha Hızlı Görsel Üretimi**: Görsel üretmek için yerel ComfyUI kurabilir ve Flux Schnell modelini kullanabilirsiniz.
* **Blender Yolu**: Eğer Blender'ınız farklı bir klasörde kuruluysa `--blender` parametresiyle yolunu belirtin:
  `python run_local.py --input input/resim.png --blender "D:\Blender\blender.exe"`
