$ErrorActionPreference='Stop'
$landingWorkspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$env:NODE_ENV='development'
$env:LANDING_LOCAL_TEST_MODE='1'
$env:LANDING_LOCAL_TEST_KEY='local-fixture-key-20261011-not-for-production'
$env:LANDING_APP_ORIGIN='http://127.0.0.1:4186'
$env:LANDING_PREVIEW_ORIGIN='http://localhost:4186'
$env:LANDING_PREVIEW_SECRET='local-preview-key-20261011-not-for-production'
$env:LANDING_LOCAL_UPLOAD_ORIGIN='http://127.0.0.1:4188'
$env:LANDING_LOCAL_ROOT=(Join-Path $landingWorkspace 'tmp/landing-local')
$env:PLAYLAB_DESIGN_PREVIEW='0'
$landingNode=(Get-Command node).Source
$landingUpload=Start-Process -FilePath $landingNode -ArgumentList @('scripts/landing-pages/local-upload.mjs') -WorkingDirectory $landingWorkspace -PassThru -WindowStyle Hidden
try{
 Set-Location -LiteralPath $landingWorkspace
 Write-Host 'Local fixture: http://127.0.0.1:4186/app#landing-pages'
 Write-Host 'Choose the local test account button. Data is isolated from operational DB/Storage.'
 & $landingNode 'node_modules/next/dist/bin/next' dev --hostname 127.0.0.1 -p 4186
}finally{
 if(-not $landingUpload.HasExited){Stop-Process -Id $landingUpload.Id}
}
