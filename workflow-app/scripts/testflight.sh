#!/usr/bin/env bash
# Workflow'u derleyip TestFlight'a gönderir. Mac'te çalıştır: bash workflow-app/scripts/testflight.sh
# İlk seferde Expo hesabı ve Apple Developer hesabı sorulur (tarayıcı/terminal üzerinden giriş).
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "Node.js gerekli: https://nodejs.org (LTS) kurup tekrar çalıştır."; exit 1; }
echo "› Paketler kuruluyor"; npm install
echo "› Motor testleri"; npm test
cd apps/mobile
echo "› Expo hesabı"; npx --yes eas-cli@latest whoami >/dev/null 2>&1 || npx --yes eas-cli@latest login
echo "› EAS projesi"; npx --yes eas-cli@latest init --non-interactive --force 2>/dev/null || npx --yes eas-cli@latest init
echo "› iOS derlemesi başlıyor; bitince TestFlight'a gönderilecek (15–30 dk)"
npx --yes eas-cli@latest build --platform ios --profile production --auto-submit
