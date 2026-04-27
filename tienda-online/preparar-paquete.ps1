# ==============================================================================
# SCRIPT DE PREPARACIÓN DE PAQUETE PORTABLE - Tienda Online
# ==============================================================================
# Este script crea un archivo comprimido (.zip) con el código fuente necesario
# para trasladar el proyecto a otra computadora, excluyendo archivos pesados
# como node_modules, logs y builds.
# ==============================================================================

$ProjectRoot = Get-Location
$OutputName = "tienda-online-portable.zip"
$OutputPath = Join-Path $ProjectRoot $OutputName

Write-Host "--- Iniciando preparación del paquete portable ---" -ForegroundColor Cyan

# 1. Verificar si ya existe el archivo y eliminarlo
if (Test-Path $OutputPath) {
    Write-Host "Eliminando paquete anterior..." -ForegroundColor Yellow
    Remove-Item $OutputPath
}

# 2. Definir exclusiones
$Exclusions = @(
    "node_modules",
    "dist",
    ".git",
    "combined.log",
    "error.log",
    ".env",
    "*.zip"
)

Write-Host "Comprimiendo archivos (esto puede tardar unos segundos)..." -ForegroundColor Cyan

# 3. Crear el ZIP usando Compress-Archive con filtrado manual para mayor control
# Nota: Compress-Archive no soporta exclusiones nativamente de forma sencilla, 
# así que filtramos los archivos primero.

$FilesToInclude = Get-ChildItem -Path $ProjectRoot -Recurse | Where-Object {
    $filePath = $_.FullName
    $include = $true
    foreach ($excl in $Exclusions) {
        if ($filePath -like "*\$excl*" -or $filePath -like "*\$excl") {
            $include = $false
            break
        }
    }
    $include
}

# Creamos una carpeta temporal para copiar lo necesario y comprimir
$TempDir = Join-Path $env:TEMP "tienda_online_tmp"
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir | Out-Null

foreach ($file in $FilesToInclude) {
    $relative = $file.FullName.Substring($ProjectRoot.Path.Length + 1)
    $target = Join-Path $TempDir $relative
    
    if ($file.PSIsContainer) {
        New-Item -ItemType Directory -Path $target -Force | Out-Null
    } else {
        Copy-Item -Path $file.FullName -Destination $target -Force
    }
}

# Comprimir la carpeta temporal
Compress-Archive -Path "$TempDir\*" -DestinationPath $OutputPath -Force

# Limpiar temporal
Remove-Item $TempDir -Recurse -Force

Write-Host "--- ¡Paquete creado exitosamente! ---" -ForegroundColor Green
Write-Host "Archivo generado: $OutputName" -ForegroundColor White
Write-Host "Ubicación: $OutputPath" -ForegroundColor White
Write-Host "Siga las instrucciones en GUIA_DESPLIEGUE.md para instalar en la PC destino." -ForegroundColor Gray
