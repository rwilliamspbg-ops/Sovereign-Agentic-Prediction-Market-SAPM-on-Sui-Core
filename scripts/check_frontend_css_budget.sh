#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BUILD_DIR="$FRONTEND_DIR/.next"

MAX_CSS_TOTAL_BYTES="${MAX_CSS_TOTAL_BYTES:-450000}"
MAX_CSS_FILE_BYTES="${MAX_CSS_FILE_BYTES:-180000}"
MAX_CSS_FILE_COUNT="${MAX_CSS_FILE_COUNT:-20}"

if [[ ! -d "$BUILD_DIR" ]]; then
  echo "[css-budget] FAIL: frontend build output not found at $BUILD_DIR"
  echo "[css-budget] Run frontend build before budget check."
  exit 1
fi

mapfile -t css_files < <(find "$BUILD_DIR" -type f -name '*.css' | sort)

if [[ ${#css_files[@]} -eq 0 ]]; then
  echo "[css-budget] FAIL: no CSS files found in $BUILD_DIR"
  exit 1
fi

css_file_count=${#css_files[@]}
css_total_bytes=0
largest_file_bytes=0
largest_file_path=""

for css_file in "${css_files[@]}"; do
  file_size=$(wc -c < "$css_file")
  css_total_bytes=$((css_total_bytes + file_size))

  if (( file_size > largest_file_bytes )); then
    largest_file_bytes=$file_size
    largest_file_path="$css_file"
  fi
done

echo "[css-budget] CSS files: $css_file_count"
echo "[css-budget] CSS total bytes: $css_total_bytes"
echo "[css-budget] Largest CSS file: $largest_file_path ($largest_file_bytes bytes)"
echo "[css-budget] Budget limits: total<=$MAX_CSS_TOTAL_BYTES, largest<=$MAX_CSS_FILE_BYTES, count<=$MAX_CSS_FILE_COUNT"

if (( css_file_count > MAX_CSS_FILE_COUNT )); then
  echo "[css-budget] FAIL: CSS file count exceeded budget ($css_file_count > $MAX_CSS_FILE_COUNT)"
  exit 1
fi

if (( css_total_bytes > MAX_CSS_TOTAL_BYTES )); then
  echo "[css-budget] FAIL: total CSS bytes exceeded budget ($css_total_bytes > $MAX_CSS_TOTAL_BYTES)"
  exit 1
fi

if (( largest_file_bytes > MAX_CSS_FILE_BYTES )); then
  echo "[css-budget] FAIL: largest CSS file exceeded budget ($largest_file_bytes > $MAX_CSS_FILE_BYTES)"
  exit 1
fi

echo "[css-budget] PASS"
