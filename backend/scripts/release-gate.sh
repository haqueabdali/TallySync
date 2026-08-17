#!/usr/bin/env sh
set -eu

echo "==> Clean build"
rm -rf dist
npm run build

echo "==> Unit/integration tests"
npm test -- --runInBand

echo "==> E2E tests"
npm run test:e2e -- --runInBand

echo "==> Migration state"
npm run migration:check

echo "==> Release gate passed"
