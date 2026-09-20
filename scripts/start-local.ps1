param([int]$Port = 3001)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeExecutable = 'C:\Program Files\nodejs\node.exe'
if (!(Test-Path -LiteralPath $nodeExecutable)) {
    $nodeExecutable = (Get-Command node -ErrorAction Stop).Source
}
if ((& $nodeExecutable --version) -notmatch '^v24\.') {
    throw 'Node.js 24 is required for the installed SQLite native module.'
}
if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'client/dist/index.html'))) {
    throw 'Run npm run build before starting the local production server.'
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $Port is already in use."
}
$runtimeDir = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$previousPort = $env:PORT
$previousDbPath = $env:DB_PATH
try {
    $env:PORT = "$Port"
    $env:DB_PATH = Join-Path $projectRoot 'server/data/what-to-eat.db'
    $serverProcess = Start-Process -FilePath $nodeExecutable -ArgumentList '--import','tsx','src/index.ts' `
        -WorkingDirectory (Join-Path $projectRoot 'server') -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') `
        -RedirectStandardError (Join-Path $runtimeDir 'server.err.log') -PassThru
    $serverProcess.Id | Set-Content (Join-Path $runtimeDir 'server.pid')
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if ($serverProcess.HasExited) { throw 'Server exited. Check .runtime/server.err.log.' }
        try {
            $response = Invoke-WebRequest "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 1
            if ($response.StatusCode -eq 200) {
                Write-Output "Running at http://localhost:$Port/ (PID $($serverProcess.Id))"
                return
            }
        } catch { Start-Sleep -Milliseconds 300 }
    }
    throw 'Server did not become ready. Check .runtime/server.err.log.'
} finally {
    $env:PORT = $previousPort
    $env:DB_PATH = $previousDbPath
}
