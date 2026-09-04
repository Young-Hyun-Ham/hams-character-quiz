Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\public\icons\source\pikachu-reference.png"
$iconDirectory = Join-Path $PSScriptRoot "..\public\icons"
$appDirectory = Join-Path $PSScriptRoot "..\app"
New-Item -ItemType Directory -Force -Path $iconDirectory | Out-Null

function New-PikachuIcon([int]$size, [string]$targetPath) {
    $source = [System.Drawing.Image]::FromFile($sourcePath)
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $background = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $background,
        [System.Drawing.Color]::FromArgb(255, 116, 205, 244),
        [System.Drawing.Color]::FromArgb(255, 255, 239, 166),
        45
    )
    $graphics.FillRectangle($gradient, $background)

    $padding = [Math]::Round($size * 0.12)
    $drawingSize = $size - ($padding * 2)
    $graphics.DrawImage($source, $padding, $padding, $drawingSize, $drawingSize)

    $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $gradient.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    $source.Dispose()
}

New-PikachuIcon 192 (Join-Path $iconDirectory "icon-192.png")
New-PikachuIcon 512 (Join-Path $iconDirectory "icon-512.png")
New-PikachuIcon 180 (Join-Path $appDirectory "apple-icon.png")
New-PikachuIcon 512 (Join-Path $appDirectory "icon.png")

$faviconPngPath = Join-Path $iconDirectory "favicon-64.png"
New-PikachuIcon 64 $faviconPngPath
$faviconBytes = [System.IO.File]::ReadAllBytes($faviconPngPath)
$faviconStream = [System.IO.File]::Create((Join-Path $appDirectory "favicon.ico"))
$faviconWriter = New-Object System.IO.BinaryWriter($faviconStream)
$faviconWriter.Write([uint16]0)
$faviconWriter.Write([uint16]1)
$faviconWriter.Write([uint16]1)
$faviconWriter.Write([byte]64)
$faviconWriter.Write([byte]64)
$faviconWriter.Write([byte]0)
$faviconWriter.Write([byte]0)
$faviconWriter.Write([uint16]1)
$faviconWriter.Write([uint16]32)
$faviconWriter.Write([uint32]$faviconBytes.Length)
$faviconWriter.Write([uint32]22)
$faviconWriter.Write($faviconBytes)
$faviconWriter.Dispose()
$faviconStream.Dispose()

Write-Output "Pikachu app icons generated."
