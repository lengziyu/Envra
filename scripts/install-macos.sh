#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-lengziyu/Envra}"
TAG="${1:-latest}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This installer only supports macOS."
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  arm64|aarch64) ASSET_ARCH="aarch64" ;;
  x86_64) ASSET_ARCH="x64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

if [[ "$TAG" == "latest" ]]; then
  API_URL="https://api.github.com/repos/${REPO}/releases/latest"
else
  [[ "$TAG" == v* ]] || TAG="v${TAG}"
  API_URL="https://api.github.com/repos/${REPO}/releases/tags/${TAG}"
fi

echo "Fetching release metadata..."
JSON="$(curl -fsSL "$API_URL")"

DMG_URL="$(
  JSON_INPUT="$JSON" python3 - "$ASSET_ARCH" <<'PY'
import json, os, sys
arch = sys.argv[1]
data = json.loads(os.environ["JSON_INPUT"])
for asset in data.get("assets", []):
    name = asset.get("name", "")
    if name.endswith(".dmg") and arch in name:
        print(asset.get("browser_download_url", ""))
        break
PY
)"

if [[ -z "$DMG_URL" ]]; then
  echo "No matching DMG asset found for architecture: $ASSET_ARCH"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
DMG_PATH="${TMP_DIR}/Envra.dmg"

echo "Downloading DMG..."
curl -fL "$DMG_URL" -o "$DMG_PATH"

echo "Mounting DMG..."
MOUNT_OUTPUT="$(hdiutil attach "$DMG_PATH" -nobrowse -quiet)"
VOLUME_PATH="$(echo "$MOUNT_OUTPUT" | awk '/\/Volumes\// {print $3; exit}')"

if [[ -z "$VOLUME_PATH" ]]; then
  echo "Failed to detect mounted DMG volume."
  exit 1
fi

APP_SOURCE="$(find "$VOLUME_PATH" -maxdepth 2 -name "Envra.app" -print -quit)"
if [[ -z "$APP_SOURCE" ]]; then
  echo "Envra.app not found in mounted DMG."
  hdiutil detach "$VOLUME_PATH" -quiet || true
  exit 1
fi

echo "Installing to /Applications..."
rm -rf /Applications/Envra.app
cp -R "$APP_SOURCE" /Applications/Envra.app

hdiutil detach "$VOLUME_PATH" -quiet || true
rm -rf "$TMP_DIR"

echo "Removing quarantine attributes..."
xattr -dr com.apple.quarantine /Applications/Envra.app || true

echo "Launching Envra..."
open /Applications/Envra.app
echo "Done."
