@echo off
title GLB 3D Studio - Yerel Yapay Zeka Sunucusu
color 0B
echo ==================================================================
echo         GLB 3D Studio - Yerel Yapay Zeka Sunucusu Baslatiliyor
echo ==================================================================
echo.
echo [*] local_pipeline klasorune geciliyor...
cd /d "c:\Glb\local_pipeline"
echo [*] Sunucu baslatiliyor. Bu pencereyi kapatmayin...
echo.
"C:\Users\One2\AppData\Local\Programs\Python\Python312\python.exe" local_server.py
if errorlevel 1 (
    echo.
    echo [!] Hata: Sunucu baslatilamadi. Python kurulumunu veya bagimliliklari kontrol edin.
    pause
)
