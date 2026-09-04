Add-Type -AssemblyName System.Drawing

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class TeeniepingBackgroundRemover
{
    public static void Convert(string sourcePath, string targetPath)
    {
        using (var source = new Bitmap(sourcePath))
        {
            if (source.RawFormat.Guid == ImageFormat.Png.Guid)
            {
                source.Save(targetPath, ImageFormat.Png);
                return;
            }
            using (var bitmap = new Bitmap(source.Width, source.Height, PixelFormat.Format32bppArgb))
            {
                using (var graphics = Graphics.FromImage(bitmap)) graphics.DrawImageUnscaled(source, 0, 0);
                RemoveConnectedWhite(bitmap);
                bitmap.Save(targetPath, ImageFormat.Png);
            }
        }
    }

    private static void RemoveConnectedWhite(Bitmap bitmap)
    {
        var rectangle = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rectangle, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
        var bytes = new byte[Math.Abs(data.Stride) * bitmap.Height];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
        var visited = new bool[bitmap.Width * bitmap.Height];
        var queue = new Queue<int>();
        Action<int, int> enqueue = (x, y) => {
            if (x < 0 || x >= bitmap.Width || y < 0 || y >= bitmap.Height) return;
            int index = y * bitmap.Width + x;
            if (visited[index]) return;
            visited[index] = true;
            int offset = y * data.Stride + x * 4;
            int blue = bytes[offset], green = bytes[offset + 1], red = bytes[offset + 2];
            int minimum = Math.Min(red, Math.Min(green, blue));
            int maximum = Math.Max(red, Math.Max(green, blue));
            if (minimum >= 190 && maximum - minimum <= 65) queue.Enqueue(index);
        };

        for (int x = 0; x < bitmap.Width; x++) { enqueue(x, 0); enqueue(x, bitmap.Height - 1); }
        for (int y = 1; y < bitmap.Height - 1; y++) { enqueue(0, y); enqueue(bitmap.Width - 1, y); }
        while (queue.Count > 0)
        {
            int index = queue.Dequeue();
            int x = index % bitmap.Width, y = index / bitmap.Width;
            int offset = y * data.Stride + x * 4;
            int minimum = Math.Min(bytes[offset + 2], Math.Min(bytes[offset + 1], bytes[offset]));
            bytes[offset + 3] = minimum >= 245 ? (byte)0 : (byte)Math.Min(255, Math.Round((245 - minimum) * 255.0 / 55.0));
            enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1);
        }
        Marshal.Copy(bytes, 0, data.Scan0, bytes.Length);
        bitmap.UnlockBits(data);
    }
}
'@ -ErrorAction Stop

$sourceDirectory = Join-Path $PSScriptRoot "..\public\teenieping\catalog-copy"
$targetDirectory = Join-Path $PSScriptRoot "..\public\teenieping\catalog"
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
foreach ($sourceFile in Get-ChildItem -LiteralPath $sourceDirectory -File -Filter "*.jpg") {
    $targetName = [System.IO.Path]::GetFileNameWithoutExtension($sourceFile.Name) + ".png"
    [TeeniepingBackgroundRemover]::Convert($sourceFile.FullName, (Join-Path $targetDirectory $targetName))
}
Write-Output "Created $((Get-ChildItem -LiteralPath $targetDirectory -File -Filter '*.png').Count) transparent PNG files."
