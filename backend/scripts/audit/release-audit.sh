#!/usr/bin/env sh
set -eu
rm -rf dist
npm run build
npm run audit:security
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run migration:check
echo "Release audit passed"
