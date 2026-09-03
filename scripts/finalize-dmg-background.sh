#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DMG_DIR="$REPO_ROOT/src-tauri/target/release/bundle/dmg"
BACKGROUND_SOURCE="$REPO_ROOT/src-tauri/resources/dmg-background.png"
DMG_PATH="${1:-}"

for required_command in hdiutil osascript awk find; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Required command not found: $required_command" >&2
    exit 1
  fi
done

if [[ ! -d "$DMG_DIR" ]]; then
  echo "DMG directory not found: $DMG_DIR" >&2
  echo "Build the DMG before running this script." >&2
  exit 1
fi

if [[ ! -f "$BACKGROUND_SOURCE" ]]; then
  echo "DMG background not found: $BACKGROUND_SOURCE" >&2
  exit 1
fi

if [[ -z "$DMG_PATH" ]]; then
  DMG_PATH="$(find "$DMG_DIR" -maxdepth 1 -type f -name '*.dmg' \
    ! -name '*.rw.dmg' ! -name '*.final.dmg' -print | sort)"
  if [[ "$(printf '%s\n' "$DMG_PATH" | sed '/^$/d' | wc -l | tr -d ' ')" -ne 1 ]]; then
    echo "Expected exactly one final DMG in $DMG_DIR. Found:" >&2
    printf '  %s\n' "$DMG_PATH" >&2
    exit 1
  fi
elif [[ "$DMG_PATH" != /* ]]; then
  DMG_PATH="$(pwd)/$DMG_PATH"
fi

if [[ ! -f "$DMG_PATH" ]]; then
  echo "DMG file not found: $DMG_PATH" >&2
  exit 1
fi

DMG_PATH="$(cd "$(dirname "$DMG_PATH")" && pwd)/$(basename "$DMG_PATH")"
RW_DMG="${DMG_PATH%.dmg}.rw.dmg"
FINAL_DMG="${DMG_PATH%.dmg}.final.dmg"
MOUNT_DIR=""
DEVICE=""

cleanup() {
  if [[ -n "$DEVICE" ]]; then
    hdiutil detach "$DEVICE" >/dev/null 2>&1 || true
  fi
  rm -f "$RW_DMG" "$FINAL_DMG"
}
trap cleanup EXIT

detach_disk() {
  local attempt
  for attempt in 1 2 3 4 5; do
    if hdiutil detach "$DEVICE" >/dev/null 2>&1; then
      DEVICE=""
      return 0
    fi
    sleep 1
  done
  echo "Unable to detach the finalized DMG after several attempts." >&2
  return 1
}

echo "Converting DMG to read-write format..."
hdiutil convert "$DMG_PATH" -format UDRW -ov -o "$RW_DMG" >/dev/null

echo "Attaching read-write DMG..."
ATTACH_OUTPUT="$(hdiutil attach -readwrite -noautoopen "$RW_DMG")"
DEVICE="$(printf '%s\n' "$ATTACH_OUTPUT" | awk '/^\/dev\// { print $1; exit }')"
MOUNT_DIR="$(printf '%s\n' "$ATTACH_OUTPUT" | awk '/^\/dev\// && NF >= 3 { $1 = ""; $2 = ""; sub(/^[[:space:]]+/, ""); path = $0 } END { print path }')"

if [[ -z "$DEVICE" || -z "$MOUNT_DIR" || ! -d "$MOUNT_DIR" ]]; then
  echo "Could not determine the mounted DMG volume." >&2
  exit 1
fi

VOLUME_NAME="$(basename "$MOUNT_DIR")"
if [[ ! -d "$MOUNT_DIR/omp-switch.app" || ! -e "$MOUNT_DIR/Applications" ]]; then
  echo "Mounted DMG is missing omp-switch.app or Applications." >&2
  exit 1
fi

echo "Copying background image..."
mkdir -p "$MOUNT_DIR/.background"
cp -f "$BACKGROUND_SOURCE" "$MOUNT_DIR/.background/dmg-background.png"
rm -f "$MOUNT_DIR/.DS_Store"

echo "Applying Finder layout and background picture..."
osascript - "$VOLUME_NAME" "$MOUNT_DIR" <<'APPLESCRIPT'
on run argv
  set volumeName to item 1 of argv
  set mountPath to item 2 of argv
  set backgroundFile to POSIX file (mountPath & "/.background/dmg-background.png") as alias

  tell application "Finder"
    repeat with existingWindow in every Finder window
      try
        if (name of existingWindow is volumeName) then close existingWindow
      end try
    end repeat

    tell disk volumeName
      open
      repeat 15 times
        if exists container window then exit repeat
        delay 1
      end repeat
      if not (exists container window) then error "Finder did not open the DMG volume window"

      tell container window
        set current view to icon view
        set toolbar visible to false
        set statusbar visible to false
        set the bounds to {100, 100, 760, 500}
      end tell

      tell icon view options of container window
        set icon size to 128
        set text size to 16
        set arrangement to not arranged
        set background picture to backgroundFile
      end tell

      if not (exists item "omp-switch.app") then error "omp-switch.app is missing from the DMG"
      if not (exists item "Applications") then error "Applications is missing from the DMG"
      set position of item "omp-switch.app" to {126, 170}
      set position of item "Applications" to {534, 170}

      update without registering applications
      delay 2
      close
      delay 1
      open
      repeat 10 times
        if exists container window then exit repeat
        delay 1
      end repeat
      if not (exists container window) then error "Finder did not reopen the DMG volume window"
      close
    end tell
  end tell
end run
APPLESCRIPT

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if [[ -f "$MOUNT_DIR/.DS_Store" ]]; then
    break
  fi
  sleep 1
done
if [[ ! -f "$MOUNT_DIR/.DS_Store" ]]; then
  echo "Finder did not persist the DMG layout (.DS_Store)." >&2
  exit 1
fi

sync
echo "Detaching DMG..."
detach_disk

echo "Converting to compressed DMG..."
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -ov -o "$FINAL_DMG" >/dev/null
mv -f "$FINAL_DMG" "$DMG_PATH"

echo "Successfully finalized Finder background and icon layout in $DMG_PATH"
