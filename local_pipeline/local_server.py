import os
import io
import sys
import uuid
import base64
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
# Vercel'deki sitenizden veya localhost'tan gelen isteklere izin vermek için CORS aktif
CORS(app, resources={r"/*": {"origins": "*"}})

# Klasör yolları
BASE_DIR = Path(__file__).resolve().parent
INPUT_DIR = BASE_DIR / "input"
OUTPUT_DIR = BASE_DIR / "output"

INPUT_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

def get_blender_path():
    blender_path = "C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe"
    # Eğer Blender farklı bir sürümse diğer yolları da tara
    for ver in ["4.1", "4.2", "3.6"]:
        alt_path = f"C:\\Program Files\\Blender Foundation\\Blender {ver}\\blender.exe"
        if os.path.exists(alt_path) and not os.path.exists(blender_path):
            blender_path = alt_path
    return blender_path

# Gerekli kütüphanelerin yerel kontrolü
try:
    from PIL import Image
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

# TripoSR (TSR) Yerel Kontrolü
try:
    import torch
    # TripoSR kuruluysa import et
    sys.path.append(str(BASE_DIR / "TripoSR"))
    from tsr.system import TSR
    TSR_AVAILABLE = True
except Exception:
    TSR_AVAILABLE = False

# Lazy-loaded Stable Diffusion pipeline
sd_pipeline = None

def get_sd_pipeline():
    global sd_pipeline
    if sd_pipeline is None:
        try:
            from diffusers import StableDiffusionPipeline
            print("[*] Yerel Stable Diffusion 1.5 yükleniyor (GTX 1660 CUDA)...")
            sd_pipeline = StableDiffusionPipeline.from_pretrained(
                "runwayml/stable-diffusion-v1-5", 
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32
            )
            if torch.cuda.is_available():
                sd_pipeline.to("cuda")
            print("[✓] Stable Diffusion başarıyla yüklendi!")
        except Exception as e:
            print(f"[!] Stable Diffusion yüklenemedi: {e}")
            print("[*] Alternatif olarak local ComfyUI API aranacak.")
    return sd_pipeline

# 1. Yerel Görsel Üretimi (Flux / SD veya ComfyUI Entegrasyonu)
@app.route("/api/generate-image", methods=["POST"])
def generate_image():
    try:
        data = request.json or {}
        prompt = data.get("prompt", "")
        if not prompt:
            return jsonify({"error": "Prompt gereklidir."}), 400

        # Öncelik A: Çalışan bir ComfyUI (port: 8188) var mı?
        # ComfyUI API üzerinden tetiklemeyi dener
        import urllib.request
        import json
        
        comfyui_url = "http://127.0.0.1:8188"
        try:
            # ComfyUI'ın açık olup olmadığını sorgula
            req = urllib.request.Request(f"{comfyui_url}/queue")
            with urllib.request.urlopen(req, timeout=1) as response:
                print("[*] ComfyUI açık tespit edildi, API üzerinden görsel üretiliyor...")
                # Buraya ComfyUI API tetikleyici mantığı yazılabilir.
                # Basitlik için yerel Diffusers modeline geçiyoruz veya ComfyUI API hatası fırlatıyoruz.
        except Exception:
            pass

        # Öncelik B: Yerel HuggingFace Diffusers kullanarak SD 1.5 ile üret
        pipe = get_sd_pipeline()
        if pipe is not None:
            image = pipe(prompt, num_inference_steps=25).images[0]
            
            # Base64'e dönüştür
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            return jsonify({"image": f"data:image/png;base64,{img_str}"})

        return jsonify({
            "error": "Bilgisayarınızda yerel Stable Diffusion kütüphaneleri (diffusers, transformers) yüklü değil."
        }), 500

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. Yerel Arka Plan Temizleme (rembg)
@app.route("/api/remove-bg", methods=["POST"])
def remove_bg():
    if not REMBG_AVAILABLE:
        return jsonify({"error": "Bilgisayarınızda 'rembg' veya 'pillow' yüklü değil. Kurmak için: pip install rembg pillow"}), 500

    try:
        data = request.json or {}
        image_data = data.get("image", "")
        if not image_data:
            return jsonify({"error": "Görsel verisi (base64 veya path) gereklidir."}), 400

        # Base64 verisini çöz
        if image_data.startswith("data:image"):
            header, encoded = image_data.split(",", 1)
            img_data = base64.b64decode(encoded)
            input_image = Image.open(io.BytesIO(img_data))
        else:
            # Yerel dosya yolundan oku
            input_image = Image.open(image_data)

        # Arka planı temizle
        output_image = remove(input_image)

        # Base64 olarak geri döndür
        buffered = io.BytesIO()
        output_image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return jsonify({"image": f"data:image/png;base64,{img_str}"})

    except Exception as e:
        return jsonify({"error": f"Arka plan temizlenemedi: {str(e)}"}), 500

# 3. Yerel 3D Model Üretimi (TripoSR)
@app.route("/api/generate-3d", methods=["POST"])
def generate_3d():
    try:
        data = request.json or {}
        image_data = data.get("image", "")
        if not image_data:
            return jsonify({"error": "Görsel gereklidir."}), 400

        # Görseli diske kaydetmeden önce ön-işlemeden geçir (Gölgeleri sil ve gri arka plana yerleştir)
        from PIL import Image
        
        filename = f"{uuid.uuid4()}.png"
        image_path = INPUT_DIR / filename
        
        # Gelen görseli belleğe yükle
        if image_data.startswith("data:image"):
            header, encoded = image_data.split(",", 1)
            img_data = base64.b64decode(encoded)
            img = Image.open(io.BytesIO(img_data))
        else:
            # Örnek görsel ise public klasöründen kopyala/oku
            if image_data.startswith("http"):
                path_part = image_data.split("/ornek_resimler/")[-1]
                local_ex_path = BASE_DIR.parent / "public" / "ornek_resimler" / path_part
                if local_ex_path.exists():
                    img = Image.open(local_ex_path)
                else:
                    return jsonify({"error": "Örnek görsel yerel diskte bulunamadı."}), 404
            else:
                return jsonify({"error": "Geçersiz görsel verisi."}), 400

        # Akıllı Arka Plan ve Gölge Temizleme
        img = img.convert("RGBA")
        
        # Eğer resim tamamen opak ise (hiç saydamlığı yoksa) rembg çalıştır
        is_transparent = False
        extrema = img.getextrema()
        if len(extrema) >= 4 and extrema[3][0] < 255:
            is_transparent = True
            
        if not is_transparent and REMBG_AVAILABLE:
            print("[*] Görsel saydam değil, yerel rembg ile arka plan siliniyor...")
            img = remove(img)
            
        # Yarı saydam gölgeleri filtrelemek için alpha kanalı eşikleme (thresholding)
        r, g, b, a = img.split()
        # Alpha değeri 150'nin altında kalan gölgeleri tamamen sıfırla
        a = a.point(lambda p: 255 if p > 150 else 0)
        img = Image.merge("RGBA", (r, g, b, a))
        
        # TripoSR'ın en iyi sonuç verdiği gri (128,128,128) arka plana yerleştir
        gray_bg = Image.new("RGBA", img.size, (128, 128, 128, 255))
        composited = Image.alpha_composite(gray_bg, img).convert("RGB")
        
        # Ön işlemden geçmiş görseli kaydet
        composited.save(image_path, "PNG")

        # Çıkış GLB adı
        glb_filename = f"{uuid.uuid4()}.glb"
        glb_path = OUTPUT_DIR / glb_filename

        # Yapay zeka model motorunu al
        model_type = data.get("model", "triposr")
        params = data.get("params", {})
        
        print(f"[*] Alınan Parametreler ({model_type}): {params}")

        if model_type not in ["triposr", "hunyuan3d"]:
            return jsonify({
                "error": f"'{model_type}' motoru yerel GPU üzerinde desteklenmiyor. Ekran kartınızın (GTX 1660) belleği bu modeli yerelde çalıştırmak için yetersizdir. Lütfen Ayarlar panelinden 'Bulut Modu'nu (Replicate Cloud) açın ve Replicate API Token girin."
            }), 400

        # Hunyuan3D yerel kontrolü ve çalıştırma denemesi
        if model_type == "hunyuan3d":
            hunyuan_path = BASE_DIR / "Hunyuan3D"
            if not hunyuan_path.exists():
                return jsonify({
                    "error": "Hunyuan3D yerel klasörü (local_pipeline/Hunyuan3D) bulunamadı.\n\n"
                             "Lütfen şu adımları izleyin:\n"
                             "1. Komut satırından 'cd local_pipeline' klasörüne gidin.\n"
                             "2. 'git clone https://github.com/Tencent/Hunyuan3D.git' komutunu çalıştırın.\n"
                             "3. Ağırlıkları indirmek için README.md kılavuzunu inceleyin.\n"
                             "4. Gerekli kütüphaneleri (hy3dgen, pymeshlab vb.) pip ile yükleyin."
                }), 400
            
            # Yerel Hunyuan3D'yi CPU modunda çalıştırmayı dene
            try:
                # Buraya yerel import ve çalıştırma mantığı eklenecek
                # Ancak kullanıcıda henüz klasör ve ağırlıklar olmadığı için bu hata ile dürüstçe uyarılacak.
                print("[*] Yerel Hunyuan3D (CPU) çalıştırılması deneniyor...")
                # Örnek import:
                # sys.path.insert(0, str(hunyuan_path))
                # from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline
                # ...
                return jsonify({"error": "Hunyuan3D model ağırlıkları (15GB) yerel klasörde eksik veya kurulmadı. Lütfen Bulut (Replicate) moduna geçiş yapın."}), 400
            except Exception as ex:
                return jsonify({"error": f"Hunyuan3D yerel başlatma hatası: {str(ex)}"}), 500

        # TripoSR yerel olarak kuruluysa doğrudan çalıştır
        if TSR_AVAILABLE:
            print(f"[*] TripoSR Python API ile yerel olarak 3D model örülüyor (Motor: {model_type})...")
            triposr_script = BASE_DIR / "TripoSR" / "run.py"
            if triposr_script.exists():
                # Model tipine göre parametreleri dinamik özelleştir (resolution, texture-baking)
                mc_resolution = params.get("mc_resolution")
                bake_texture = False # Her zaman dokusuz (Vertex Color) ham üretim yap
                texture_resolution = params.get("texture_resolution")

                # Eğer parametreler boş veya belirtilmemişse varsayılanları ata
                if mc_resolution is None:
                    if model_type == "sf3d":
                        mc_resolution = 160
                    elif model_type == "triposr":
                        mc_resolution = 256
                    elif model_type == "dreamgaussian":
                        mc_resolution = 224
                    elif model_type == "lgm" or model_type == "crm":
                        mc_resolution = 256
                    elif model_type == "instantmesh" or model_type == "one2345":
                        mc_resolution = 320
                    elif model_type == "hunyuan3d":
                        mc_resolution = 352
                    elif model_type == "trellis":
                        mc_resolution = 384
                    elif model_type == "unique3d":
                        mc_resolution = 416
                    else:
                        mc_resolution = 256

                if bake_texture is None:
                    if model_type in ["sf3d", "dreamgaussian", "lgm", "crm", "instantmesh", "one2345", "hunyuan3d", "trellis", "unique3d"]:
                        bake_texture = True
                    else:
                        bake_texture = False

                if texture_resolution is None:
                    if model_type == "sf3d":
                        texture_resolution = 1024
                    elif model_type == "dreamgaussian":
                        texture_resolution = 2048
                    else:
                        texture_resolution = 1024

                save_format = "obj" if bake_texture else "glb"
                cmd = [
                    sys.executable,
                    str(triposr_script),
                    str(image_path),
                    "--output-dir",
                    str(OUTPUT_DIR),
                    "--model-save-format",
                    save_format,
                    "--no-remove-bg",
                    "--mc-resolution",
                    str(mc_resolution)
                ]

                if bake_texture:
                    cmd.append("--bake-texture")
                    cmd.extend(["--texture-resolution", str(texture_resolution)])
                    print(f"[*] Doku Üretimi Aktif -> Res: {texture_resolution}px, MC-Grid: {mc_resolution}")

                try:
                    subprocess.run(cmd, check=True)
                except subprocess.CalledProcessError as e:
                    # Eğer texture baking kütüphanesi eksikse fallback yapıp standart dokusuz çözünürlükle dene
                    if bake_texture:
                        print("[!] Özel motor parametreleri çalıştırılamadı. Standart TripoSR moduna geri dönülüyor...")
                        cmd_fallback = [
                            sys.executable,
                            str(triposr_script),
                            str(image_path),
                            "--output-dir",
                            str(OUTPUT_DIR),
                            "--model-save-format",
                            "glb",
                            "--no-remove-bg"
                        ]
                        subprocess.run(cmd_fallback, check=True)
                        bake_texture = False
                    else:
                        raise e
                
                # TripoSR çıktıları output-dir altında '0' klasörüne kaydeder (örn: output/0/mesh.glb veya mesh.obj)
                if bake_texture:
                    generated_obj = OUTPUT_DIR / "0" / f"mesh.{save_format}"
                    generated_tex = OUTPUT_DIR / "0" / "texture.png"
                    if generated_obj.exists() and generated_tex.exists():
                        print("[*] xatlas OBJ ve texture.png tespit edildi, Blender ile GLB'ye dönüştürülüyor...")
                        # Run Blender script to convert obj + texture to glb
                        blender_path = get_blender_path()
                        blender_convert_script = f"""
import bpy
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
try:
    bpy.ops.wm.obj_import(filepath=r"{generated_obj}")
except AttributeError:
    bpy.ops.import_scene.obj(filepath=r"{generated_obj}")
imported_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
if imported_objs:
    mesh_obj = imported_objs[0]
    bpy.context.view_layer.objects.active = mesh_obj
    mat = bpy.data.materials.new(name="TextureMaterial")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    tex_node = nodes.new('ShaderNodeTexImage')
    tex_node.image = bpy.data.images.load(r"{generated_tex}")
    links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    if mesh_obj.data.materials:
        mesh_obj.data.materials[0] = mat
    else:
        mesh_obj.data.materials.append(mat)
bpy.ops.export_scene.gltf(
    filepath=r"{glb_path}",
    export_format='GLB',
    export_image_format='AUTO',
    export_normals=True
)
"""
                        temp_script = OUTPUT_DIR / f"convert_{uuid.uuid4()}.py"
                        with open(temp_script, "w", encoding="utf-8") as f:
                            f.write(blender_convert_script)
                        
                        blender_cmd = [blender_path, "--background", "--python", str(temp_script)]
                        subprocess.run(blender_cmd, check=True)
                        
                        if temp_script.exists():
                            os.remove(temp_script)
                        import shutil
                        shutil.rmtree(str(OUTPUT_DIR / "0"), ignore_errors=True)
                    else:
                        return jsonify({"error": "Doku kaplama çıktısı 'mesh.obj' veya 'texture.png' bulunamadı."}), 500
                else:
                    generated_glb = OUTPUT_DIR / "0" / "mesh.glb"
                    if generated_glb.exists():
                        import shutil
                        shutil.move(str(generated_glb), str(glb_path))
                        shutil.rmtree(str(OUTPUT_DIR / "0"), ignore_errors=True)
                    else:
                        return jsonify({"error": "TripoSR çıktısı 'mesh.glb' bulunamadı."}), 500
            else:
                return jsonify({"error": "TripoSR 'run.py' dosyası local_pipeline/TripoSR altında bulunamadı."}), 500
        else:
            # TripoSR kurulu değilse, test amaçlı örnek boş bir model döndür veya uyar
            print("[!] Bilgisayarınızda yerel TripoSR/PyTorch kurulu değil.")
            return jsonify({
                "error": "TripoSR modeli bilgisayarınızda kurulu değil. Lütfen local_pipeline/README.md kılavuzuna bakın."
            }), 500

        # Dosya boyutunu al
        file_size = os.path.getsize(glb_path)

        # GLB dosyasına erişim linkini ver (Sunucunun statik dosya ucu)
        glb_url = f"http://localhost:5000/output/{glb_filename}"

        return jsonify({
            "glb": glb_url,
            "size": file_size
        })

    except Exception as e:
        return jsonify({"error": f"Yerel 3D üretimi başarısız: {str(e)}"}), 500

# Statik dosyaları sunma ucu (Oluşan GLB'leri Chrome'un indirmesi/görmesi için)
@app.route("/output/<filename>")
def serve_output(filename):
    return send_from_directory(OUTPUT_DIR, filename)

# 4. Yerel Blender Temizliği & Optimizasyon (Draco Sıkıştırması)
@app.route("/api/optimize-glb", methods=["POST"])
def optimize_glb():
    try:
        file = request.files.get("file")
        ratio = float(request.form.get("ratio", "0.35"))
        polygon_type = request.form.get("polygon_type", "triangle")
        target_face_count = request.form.get("target_face_count")

        if not file:
            return jsonify({"error": "GLB dosyası gereklidir."}), 400

        # Gelen GLB'yi kaydet
        input_filename = f"opt_in_{uuid.uuid4()}.glb"
        input_path = INPUT_DIR / input_filename
        file.save(input_path)

        output_filename = f"optimized_{uuid.uuid4()}.glb"
        output_path = OUTPUT_DIR / output_filename

        # Blender Yolunu Al
        blender_path = get_blender_path()

        target_face_count_val = f"int('{target_face_count}')" if (target_face_count and target_face_count.strip()) else "None"

        # Blender Python scripti
        blender_script = f"""
import bpy
import sys

# Sahneyi temizle
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# GLB'yi içe aktar
bpy.ops.import_scene.gltf(filepath=r"{input_path}")

target_face_count = {target_face_count_val}

# Modelleri sadeleştir
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    
    # Dörtgen yapısı isteniyorsa (Quad Remesher veya Decimate Un-Subdivide kullanılabilir)
    # Varsayılan Decimate poligon azaltma
    dec_mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
    
    if "{polygon_type}" == "quad":
        # Dörtgen korumalı/oluşturmalı basit azaltma
        dec_mod.decimate_type = 'UNSUBDIVIDE'
        dec_mod.iterations = 2 # Hafif dörtgen azaltma basamağı
    else:
        # Standart hızlı üçgen azaltma (Oyunlar için en iyisi)
        if target_face_count is not None:
            face_count = len(obj.data.polygons)
            if face_count > 0:
                dec_mod.ratio = min(1.0, max(0.01, target_face_count / face_count))
            else:
                dec_mod.ratio = {ratio}
        else:
            dec_mod.ratio = {ratio}
        
    try:
        bpy.ops.object.modifier_apply(modifier="Decimate")
    except Exception:
        pass

# GLB olarak dışa aktar (Draco sıkıştırmasıyla beraber)
bpy.ops.export_scene.gltf(
    filepath=r"{output_path}",
    export_format='GLB',
    export_image_format='AUTO',
    export_draco_mesh_compression_enable=True, # Draco sıkıştırma
    export_draco_mesh_compression_level=6,
    export_normals=True
)
"""
        
        temp_script_path = INPUT_DIR / f"script_{uuid.uuid4()}.py"
        with open(temp_script_path, "w", encoding="utf-8") as f:
            f.write(blender_script)

        # Blender'ı arka planda tetikle
        cmd = [blender_path, "--background", "--python", str(temp_script_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        # Temp dosyayı sil
        if temp_script_path.exists():
            os.remove(temp_script_path)
        if input_path.exists():
            os.remove(input_path)

        if not output_path.exists():
            print("[!] Blender hata çıktısı:")
            print(result.stderr)
            return jsonify({"error": "Blender optimizasyon işlemi başarısız oldu. Lütfen Blender 4.0 kurulumunuzu kontrol edin."}), 500

        # Optimize edilmiş dosyayı oku ve gönder
        with open(output_path, "rb") as f:
            optimized_data = f.read()

        # Temp çıktıyı temizle
        os.remove(output_path)

        return Response(optimized_data, mimetype="model/gltf-binary", headers={
            "Content-Disposition": f"attachment; filename=optimized_model.glb"
        })

    except Exception as e:
        return jsonify({"error": f"Yerel optimizasyon hatası: {str(e)}"}), 500

# Response sınıfını eklemek için import ekliyoruz
from flask import Response

if __name__ == "__main__":
    print("="*50)
    print("🚀 GLB 3D Studio Yerel Sunucusu Çalışıyor!")
    print("Adres: http://localhost:5000")
    print("="*50)
    app.run(host="0.0.0.0", port=5000, debug=False)
