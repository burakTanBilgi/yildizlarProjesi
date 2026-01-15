$port = 8000
$root = "$PSScriptRoot"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

Write-Host "Server started at http://localhost:$port/"
Write-Host "Press Ctrl+C to stop."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = "$root$($request.Url.LocalPath)"
    if ($path.EndsWith("/")) { $path += "index.html" }

    if (Test-Path $path) {
        $content = [System.IO.File]::ReadAllBytes($path)
        $response.ContentLength64 = $content.Length
        
        # Simple MIME type handling
        $ext = [System.IO.Path]::GetExtension($path).ToLower()
        switch ($ext) {
            ".html" { $response.ContentType = "text/html" }
            ".js"   { $response.ContentType = "application/javascript" }
            ".json" { $response.ContentType = "application/json" }
            ".css"  { $response.ContentType = "text/css" }
            default { $response.ContentType = "application/octet-stream" }
        }

        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}
