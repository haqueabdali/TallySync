$ErrorActionPreference = "Stop"

Write-Host "==> Clean build"
if (Test-Path dist) {
  Remove-Item dist -Recurse -Force
}
npm run build

Write-Host "==> Unit/integration tests"
npm test -- --runInBand

Write-Host "==> E2E tests"
npm run test:e2e -- --runInBand

Write-Host "==> Migration state"
npm run migration:check

Write-Host "==> Release gate passed"
