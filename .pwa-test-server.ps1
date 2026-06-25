$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 4173)
$listener.Start()

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($reader.ReadLine()) {}

      $requestPath = if ($requestLine -match '^GET\s+([^\s]+)') { $Matches[1] } else { '/' }
      $requestPath = [System.Uri]::UnescapeDataString(($requestPath -split '\?')[0])
      if ($requestPath -eq '/') { $requestPath = '/index.html' }

      $relativePath = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
      $isAllowed = $filePath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)

      if ($isAllowed -and [System.IO.File]::Exists($filePath)) {
        $body = [System.IO.File]::ReadAllBytes($filePath)
        $contentType = switch ([System.IO.Path]::GetExtension($filePath).ToLowerInvariant()) {
          '.html' { 'text/html; charset=utf-8' }
          '.css' { 'text/css; charset=utf-8' }
          '.js' { 'text/javascript; charset=utf-8' }
          '.json' { 'application/json; charset=utf-8' }
          '.webmanifest' { 'application/manifest+json; charset=utf-8' }
          '.png' { 'image/png' }
          '.svg' { 'image/svg+xml' }
          '.woff2' { 'font/woff2' }
          '.woff' { 'font/woff' }
          '.ttf' { 'font/ttf' }
          default { 'application/octet-stream' }
        }
        $status = '200 OK'
      } else {
        $body = [System.Text.Encoding]::UTF8.GetBytes('Nicht gefunden')
        $contentType = 'text/plain; charset=utf-8'
        $status = '404 Not Found'
      }

      $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nService-Worker-Allowed: /`r`nConnection: close`r`n`r`n"
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
      $stream.Flush()
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
