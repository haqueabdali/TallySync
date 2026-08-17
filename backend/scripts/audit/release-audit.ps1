$ErrorActionPreference = "Stop"
if (Test-Path dist) { Remove-Item dist -Recurse -Force }
npm run build
npm run audit:security
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run migration:check
Write-Host "Release audit passed"
