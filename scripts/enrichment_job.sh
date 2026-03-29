#!/bin/sh
# Job d'enrichissement incrémental — appelle les routes /admin existantes avec des plafonds stricts.
# Usage : voir docs/enrichment-job.md
#
# Variables principales :
#   ENRICHMENT_BASE_URL     ex. http://localhost:8080 ou http://app:8080 (Docker)
#   ADMIN_SECRET            si défini dans l'app, passé en X-Admin-Key
#   ENRICH_RUN_SYNC_INDEX   1 = exécuter sync_index (très lourd — à éviter en cron fréquent)
#   ENRICH_BACKFILL_MAX     défaut 25
#   ENRICH_MANIFEST_MAX     défaut 25
#   ENRICH_SYNC_QA_MAX      défaut 50
#   ENRICH_METADATA_FILL_MAX défaut 100
#   ENRICH_METADATA_FILL_WRITE 1 = apply_card_metadata_fill avec write=1 (écriture DB + cache)
#   ENRICH_SLEEP_BETWEEN_STEPS_SEC  pause entre étapes (défaut 3)
#   ENRICH_INTERVAL_SEC     si > 0 : boucle infinie avec sleep entre passes (ex. 86400 = 1/jour)

set -eu

BASE_URL="${ENRICHMENT_BASE_URL:-http://localhost:8080}"
SLEEP_STEPS="${ENRICH_SLEEP_BETWEEN_STEPS_SEC:-3}"
INTERVAL="${ENRICH_INTERVAL_SEC:-0}"

_curl() {
  _path=$1
  echo ">>> GET ${BASE_URL}${_path}"
  if [ -n "${ADMIN_SECRET:-}" ]; then
    curl -sS -f -H "X-Admin-Key: ${ADMIN_SECRET}" "${BASE_URL}${_path}"
  else
    curl -sS -f "${BASE_URL}${_path}"
  fi
  echo
}

run_pass() {
  if [ "${ENRICH_RUN_SYNC_INDEX:-0}" = "1" ]; then
    _curl "/admin/enrich_ygorganization?mode=sync_index"
    sleep "${ENRICH_SLEEP_AFTER_INDEX_SEC:-10}"
  fi

  if [ "${ENRICH_RUN_INIT:-1}" = "1" ]; then
    _curl "/admin/enrich_ygorganization?mode=init" || true
  fi

  BF="${ENRICH_BACKFILL_MAX:-25}"
  _curl "/admin/enrich_ygorganization?mode=backfill&max=${BF}"

  sleep "$SLEEP_STEPS"

  MF="${ENRICH_MANIFEST_MAX:-25}"
  _curl "/admin/enrich_ygorganization?mode=manifest&max=${MF}"

  sleep "$SLEEP_STEPS"

  QA="${ENRICH_SYNC_QA_MAX:-50}"
  _curl "/admin/enrich_ygorganization?mode=sync_qa&max=${QA}"

  sleep "$SLEEP_STEPS"

  MD="${ENRICH_METADATA_FILL_MAX:-100}"
  if [ "${ENRICH_METADATA_FILL_WRITE:-0}" = "1" ]; then
    _curl "/admin/apply_card_metadata_fill?max=${MD}&write=1"
  else
    _curl "/admin/apply_card_metadata_fill?max=${MD}"
  fi
}

if [ "$INTERVAL" -gt 0 ] 2>/dev/null; then
  while true; do
    run_pass
    echo ">>> pause ${INTERVAL}s (ENRICH_INTERVAL_SEC)"
    sleep "$INTERVAL"
  done
else
  run_pass
fi

echo ">>> enrichment_job.sh terminé OK"
