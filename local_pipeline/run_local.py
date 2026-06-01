import os
import sys
import subprocess
import argparse
from pathlib import Path

# Try importing rembg for background removal
try:
    from rembg import remove
    from PIL import Image
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

def remove_background(input_path, output_path):
    """Removes the background of the image using the rembg library."""
    if not REMBG_AVAILABLE:
        print("[!] Warning: 'rembg' or 'pillow' is not installed. Skipping background removal.")
        print("[*] Install it with: pip install rembg pillow")
        return False
    
    print(f"[*] Removing background from: {input_path}")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path)
        print(f"[✓] Transparent image saved to: {output_path}")
        return True
    except Exception as e:
        print(f"[!] Error removing background: {e}")
        return False

def run_blender_cleanup(blender_path, mesh_path, output_glb_path, decimate_ratio=0.3):
    """Runs a Blender Python script in background mode to import, clean, simplify, and export GLB."""
    
    # Check if blender exists
    if not os.path.exists(blender_path):
        print(f"[!] Error: Blender executable not found at '{blender_path}'")
        print("[*] Please update the blender path in the script arguments or run command.")
        return False

    # Inline Blender Python script to execute
    blender_script = f"""
import bpy
import sys

# Clear existing objects in scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Import the 3D model
file_path = r"{mesh_path}"
if file_path.endswith('.obj'):
    bpy.ops.wm.obj_import(filepath=file_path)
elif file_path.endswith('.gltf') or file_path.endswith('.glb'):
    bpy.ops.import_scene.gltf(filepath=file_path)
else:
    print("Unsupported format")
    sys.exit(1)

# Select all imported meshes
imported_meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

for obj in imported_meshes:
    bpy.context.view_layer.objects.active = obj
    
    # Add a Decimate modifier to reduce polygon count
    dec_mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
    dec_mod.ratio = {decimate_ratio}
    bpy.ops.object.modifier_apply(modifier="Decimate")
    
    print(f"Applied decimation to {{obj.name}} at ratio {decimate_ratio}")

# Export to GLB format
bpy.ops.export_scene.gltf(
    filepath=r"{output_glb_path}",
    export_format='GLB',
    export_image_format='AUTO',
    export_normals=True
)
print("Export completed successfully!")
"""

    temp_script_path = Path(mesh_path).parent / "temp_blender_script.py"
    with open(temp_script_path, "w", encoding="utf-8") as f:
        f.write(blender_script)

    print(f"[*] Running Blender automation cleanup...")
    try:
        # Run blender in headless background mode with the script
        cmd = [blender_path, "--background", "--python", str(temp_script_path)]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(result.stdout)
        print(f"[✓] Optimized GLB model exported to: {output_glb_path}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[!] Blender process failed: {e}")
        print(e.stderr)
        return False
    finally:
        # Clean up temp script file
        if temp_script_path.exists():
            os.remove(temp_script_path)

def main():
    parser = argparse.ArgumentParser(description="Yerel GPU ile 3D GLB Üretim ve Temizleme Scripti (GTX 1660)")
    parser.add_argument("--input", required=True, help="Giriş görseli path (.png, .jpg)")
    parser.add_argument("--output", default="output/model.glb", help="Çıkış GLB path")
    parser.add_argument("--blender", default="C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe", help="Blender.exe program yolu")
    parser.add_argument("--ratio", type=float, default=0.3, help="Poligon azaltma oranı (0.0 - 1.0)")
    
    args = parser.parse_args()

    # Create input/output directories
    os.makedirs("input", exist_ok=True)
    os.makedirs("output", exist_ok=True)

    input_path = Path(args.input)
    output_glb = Path(args.output)
    
    # 1. Background removal
    transparent_path = input_path.parent / f"{input_path.stem}_transparent.png"
    bg_removed = remove_background(str(input_path), str(transparent_path))
    
    active_image = transparent_path if bg_removed else input_path

    # 2. Inform user about 3D mesh model generation step
    print("\n" + "="*50)
    print("AŞAMA 2: 3D Mesh Oluşturma (Yerel InstantMesh / TripoSR)")
    print("="*50)
    print("Yerel ekran kartınızda (GTX 1660) mesh üretmek için aşağıdaki açık kaynak kütüphaneleri kullanabilirsiniz:")
    print("- InstantMesh: git clone https://github.com/TencentARC/InstantMesh.git")
    print("- TripoSR: git clone https://github.com/VAST-AI-Research/TripoSR.git")
    print(f"\nYerel kütüphaneyi çalıştırıp elde ettiğiniz .obj veya .gltf dosyasını bu scriptin 3. aşamasına verin.")
    print("="*50 + "\n")

    # 3. Blender cleanup example (Assuming we got an OBJ/GLTF file from generator)
    # We check if there's a generated mesh file to clean up
    mock_mesh = input_path.parent / f"{input_path.stem}.obj"
    if mock_mesh.exists():
        run_blender_cleanup(args.blender, str(mock_mesh), str(output_glb), args.ratio)
    else:
        print(f"[!] '{mock_mesh}' bulunamadı. Blender temizleme aşamasını test etmek için:")
        print(f"    Görselle aynı klasöre '{mock_mesh.name}' adında bir model (.obj veya .gltf) yerleştirip scripti tekrar çalıştırın.")

if __name__ == "__main__":
    main()
