#!/usr/bin/env bash
set -euo pipefail

if [ -f "$HOME/.cursor/bin/load-cursor-env.sh" ]; then
  # shellcheck source=/dev/null
  source "$HOME/.cursor/bin/load-cursor-env.sh"
fi

: "${COOLIFY_READ_TOKEN:?COOLIFY_READ_TOKEN requerido}"
: "${COOLIFY_WRITE_TOKEN:?COOLIFY_WRITE_TOKEN requerido}"

BASE="${COOLIFY_BASE_URL:-https://coolify.vector-ia.mx}${COOLIFY_API_PREFIX:-/api/v1}"
APP="${1:?app uuid}"
DB="${2:?db uuid}"

DB_URL="$(curl -sf -H "Authorization: Bearer ${COOLIFY_READ_TOKEN}" "$BASE/databases/$DB" | python3 -c 'import json,sys; print(json.load(sys.stdin)["internal_db_url"])')"
SESSION_SECRET="$(openssl rand -hex 32)"

BODY="$(python3 -c "
import json
print(json.dumps({
  'data': [
    {'key': 'DATABASE_URL', 'value': '''$DB_URL''', 'is_literal': True, 'is_buildtime': False},
    {'key': 'SESSION_SECRET', 'value': '''$SESSION_SECRET''', 'is_literal': True, 'is_buildtime': False},
    {'key': 'NODE_ENV', 'value': 'production', 'is_literal': True, 'is_buildtime': False},
    {'key': 'PORT', 'value': '43124', 'is_literal': True, 'is_buildtime': False},
    {'key': 'TZ', 'value': 'America/Mexico_City', 'is_literal': True, 'is_buildtime': False},
    {'key': 'UPLOAD_DIR', 'value': '/app/uploads', 'is_literal': True, 'is_buildtime': False},
  ]
}))
")"

HTTP=$(curl -s -o /tmp/coolify-odontologia-env.json -w '%{http_code}' -X PATCH "$BASE/applications/$APP/envs/bulk" \
  -H "Authorization: Bearer ${COOLIFY_WRITE_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "$BODY")

echo "bulk env HTTP: $HTTP"
python3 -c "import json; d=json.load(open('/tmp/coolify-odontologia-env.json')); print('keys ok' if isinstance(d,list) else d.get('message', d))" 2>/dev/null || cat /tmp/coolify-odontologia-env.json
