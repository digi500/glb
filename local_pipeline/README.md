# 🚀 %100 Ücretsiz Yerel GPU Sunucusu Kurulum Kılavuzu

Bu proje, Replicate gibi ücretli bulut servislerine bağımlılığı **tamamen ortadan kaldırmıştır**. Sitenizi ister yerel bilgisayardan açın, ister Vercel adresinden açın; yapacağınız tüm görsel üretme, arka plan silme, 3D yapma ve Blender temizleme işlemleri **kendi bilgisayarınızda (GTX 1660 ile) %100 ücretsiz** çalışır.

Bu klasördeki `local_server.py` dosyası, Chrome tarayıcınızın kendi bilgisayarınızdaki yapay zeka ve Blender ile konuşmasını sağlayan yerel sunucumuzdur.

---

## 🛠️ Kurulum Adımları

Yerel sunucuyu bilgisayarınızda çalıştırmak için şu adımları takip edin:

### 1. Gerekli Python Paketlerini Yükleyin
Bir komut satırı (PowerShell veya CMD) açın ve aşağıdaki komutları çalıştırarak gerekli kütüphaneleri yükleyin:
```bash
pip install flask flask-cors rembg pillow torch diffusers transformers
```
*Not: `rembg` (arka plan silme) ve `diffusers` (Stable Diffusion) kütüphaneleri ilk çalıştırmada küçük ağırlık dosyalarını internetten otomatik olarak bir kereye mahsus indirecektir.*

### 2. Blender Kurulum Kontrolü
Uygulama, poligon azaltma (sıkıştırma) işlemi için bilgisayarınızdaki Blender'ı otomatik tetikler.
* Blender'ın varsayılan kurulum yolu: `C:\Program Files\Blender Foundation\Blender 4.0\blender.exe` olarak ayarlanmıştır.
* Eğer Blender'ınız `4.1`, `4.2` veya `3.6` sürümlerinde kuruluysa sunucu bunları otomatik olarak tarayıp bulacaktır.

### 3. Yerel 3D Motorunun Kurulumu (TripoSR)
Sunucunun yerel ekran kartınızla ücretsiz 3D model örebilmesi için bu klasör altında **TripoSR** modelini klonlamanız gerekir:
```bash
cd local_pipeline
git clone https://github.com/VAST-AI-Research/TripoSR.git
```
*Daha fazla bilgi ve gereksinim detayları için `TripoSR` klasörü içindeki kılavuza göz atabilirsiniz.*

---

## 🚀 Sunucunun Başlatılması

Kurulumlar tamamlandıktan sonra yerel sunucuyu başlatmak için:
```bash
python local_server.py
```
Ekranda şu yazıyı gördüğünüzde sunucunuz başarıyla ayağa kalkmış demektir:
```text
==================================================
🚀 GLB 3D Studio Yerel Sunucusu Çalışıyor!
Adres: http://localhost:5000
==================================================
```

---

## 🖥️ Web Arayüzü ile Bağlama

Sunucunuz açıkken:
1. Vercel'deki sitenizin adresini veya yerel web sayfanızı Chrome'da açın.
2. Sağ üst köşedeki **⚙️ Ayarlar** butonuna tıklayın.
3. Yerel Sunucu Adresi alanına `http://localhost:5000` yazıp **"Ayarları Kaydet"** deyin.
4. **Tebrikler!** Artık sitenizdeki tüm işlemler tamamen bilgisayarınızın ekran kartı üzerinde ücretsiz olarak gerçekleştirilecektir.

---

## 💡 Hata Giderme ve İpuçları
* **CORS Engeli Hatası**: Tarayıcınız yerel sunucuya bağlanırken güvenlik uyarısı verirse, `local_server.py` dosyasındaki CORS ayarlarının açık olduğundan emin olun (varsayılan olarak açıktır).
* **Ekran Kartı Belleği (VRAM)**: GTX 1660 (6GB VRAM) kartınız olduğu için işlem yaparken arka planda ağır oyunları veya ağır GPU tüketen programları kapatmanız işlemlerin hızını artırır ve kilitlenmeleri önler.
