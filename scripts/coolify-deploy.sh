#!/usr/bin/env bash
# Dispara deploy en Coolify. Uso: ./scripts/coolify-deploy.sh [commit_sha] [--wait]
set -euo pipefail

APP_UUID="${COOLIFY_APP_UUID:?COOLIFY_APP_UUID requerido}"
BASE="${COOLIFY_BASE_URL:-https://app.coolify.io}${COOLIFY_API_PREFIX:-/api/v1}"
COMMIT_SHA="${1:-$(git rev-parse HEAD 2>/dev/null || true)}"
WAIT=false
if [[ "${2:-}" == "--wait" || "${1:-}" == "--wait" ]]; then
  WAIT=true
  [[ "${1:-}" == "--wait" ]] && COMMIT_SHA="$(git rev-parse HEAD 2>/dev/null || true)"
fi

if [[ -n "$COMMIT_SHA" ]] && command -v git >/dev/null 2>&1; then
  if git rev-parse --verify "${COMMIT_SHA}^{commit}" >/dev/null 2>&1; then
    COMMIT_SHA="$(git rev-parse "${COMMIT_SHA}^{commit}")"
  fi
fi

if [[ -f "$HOME/.config/kilo/integra.secrets.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$HOME/.config/kilo/integra.secrets.env"
  set +a
fi

: "${COOLIFY_WRITE_TOKEN:?COOLIFY_WRITE_TOKEN no definido}"
: "${COOLIFY_READ_TOKEN:?COOLIFY_READ_TOKEN no definido}"

if [[ -n "$COMMIT_SHA" ]]; then
  curl -sf -X PATCH \
    -H "Authorization: Bearer ${COOLIFY_WRITE_TOKEN}" \
    -H "Content-Type: application/json" \
    "${BASE}/applications/${APP_UUID}" \
    --data "{\"git_commit_sha\":\"${COMMIT_SHA}\"}" >/dev/null
  echo "commit: ${COMMIT_SHA:0:12}"
fi

HTTP=$(curl -s -m 30 -o /tmp/coolify-odontologia-deploy.json -w '%{http_code}' -X POST \
  -H "Authorization: Bearer ${COOLIFY_WRITE_TOKEN}" \
  -H "Content-Type: application/json" \
  "${BASE}/deploy" \
  --data "{\"uuid\":\"${APP_UUID}\"}")
echo "deploy HTTP=${HTTP}"

DEPLOY_UUID=$(python3 -c "
import json
d=json.load(open('/tmp/coolify-odontologia-deploy.json'))
deps=d.get('deployments') or [d]
print(deps[0].get('deployment_uuid',''))
" 2>/dev/null || true)

if [[ -n "$DEPLOY_UUID" ]]; then
  echo "deployment_uuid=${DEPLOY_UUID}"
fi

if [[ "$WAIT" == true && -n "$DEPLOY_UUID" ]]; then
  echo "Esperando hasta 120s…"
  for _ in $(seq 1 24); do
    STATUS=$(curl -sf -H "Authorization: Bearer ${COOLIFY_READ_TOKEN}" \
      "${BASE}/deployments/${DEPLOY_UUID}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status',''))")
    echo "  status=${STATUS}"
    if [[ "$STATUS" == "finished" ]]; then exit 0; fi
    if [[ "$STATUS" == "failed" || "$STATUS" == cancelled* ]]; then exit 1; fi
    sleep 5
  done
fi
