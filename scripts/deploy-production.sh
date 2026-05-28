#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMMIT_MESSAGE="${1:-Deploy BUCAN DEY updates}"

cd "$ROOT_DIR"

echo "BUCAN DEY - Subir a produccion"
echo "================================"
echo
echo "Estado actual de Git:"
git status --short
echo

if [[ -z "$(git status --short)" ]]; then
  echo "No hay cambios pendientes para subir."
  exit 0
fi

echo "Primero se ejecutara build del frontend."
echo "Despues se hara commit y push a:"
echo "- origin main"
echo "- vercel main"
echo
read -r -p "Para confirmar, escribe SUBIR: " CONFIRMATION

if [[ "$CONFIRMATION" != "SUBIR" ]]; then
  echo "Cancelado. No se ha subido nada."
  exit 1
fi

echo
echo "Compilando frontend..."
(cd frontend && npm run build)

echo
echo "Preparando commit..."
git add .
git commit -m "$COMMIT_MESSAGE"

echo
echo "Subiendo a GitHub..."
git push origin main

echo
echo "Subiendo a Vercel..."
git push vercel main

echo
echo "Listo. Produccion recibira el despliegue desde Vercel."
