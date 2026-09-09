#!/bin/sh
set -e

TSX="./node_modules/.bin/tsx"
PORT="${PORT:-43124}"

echo "Ejecutando migraciones…"
"$TSX" --tsconfig tsconfig.json src/server/db/migrate.ts

echo "Iniciando seed en segundo plano…"
"$TSX" --tsconfig tsconfig.json scripts/seed.ts &

echo "Iniciando servidor en puerto ${PORT}…"
exec node server.js
