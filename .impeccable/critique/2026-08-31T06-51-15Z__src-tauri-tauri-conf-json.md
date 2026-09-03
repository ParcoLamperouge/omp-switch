---
target: DMG 安装界面
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-08-31T06-51-15Z
slug: src-tauri-tauri-conf-json
---
## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | No installation direction or completion cue. |
| 2 | Match system and real world | 2 | Applications link exists, but no conventional drag path. |
| 3 | User control and freedom | 3 | Finder remains native and simple. |
| 4 | Consistency and standards | 2 | Standard DMG model is only partially expressed. |
| 5 | Error prevention | 1 | Easy to run the app from the read-only image. |
| 6 | Recognition rather than recall | 1 | Users must remember the drag-to-Applications convention. |
| 7 | Flexibility and efficiency | 3 | Two-object flow is efficient once understood. |
| 8 | Aesthetic and minimalist design | 2 | Sparse, but uncomposed; absent visual hierarchy. |
| 9 | Error recovery | 2 | No guidance after a mistaken launch from the volume. |
| 10 | Help and documentation | 1 | No lightweight in-context install help. |
| **Total** | | **19/40** | **Needs focused packaging polish** |

## Design Specificity Verdict

The installed application icon is product-specific, but the DMG is category-interchangeable: a white Finder window with two 48px icons, no defined composition, and no installation signal. The DMG contains neither `.background` nor `.DS_Store`; it is the default packaging outcome rather than a designed surface.

The Tauri 2.11.4 schema supports `background`, `windowPosition`, `windowSize`, `appPosition`, and `applicationFolderPosition`, yet none is configured in `src-tauri/tauri.conf.json`. The deterministic detector reported no findings, as expected for JSON rather than a DOM target; this is not evidence of visual quality.

## What's Working

- The Applications symlink preserves the familiar macOS install model.
- The volume contains only the two objects necessary for installation.
- The existing app/volume icon is distinctive and fits a precise developer utility.

## Priority Issues

1. **[P0] CI disables Finder customization.** `README.md` recommends `CI=true pnpm tauri build`; the generated packaging script skips custom Finder layout in CI. Build releases with `TAURI_BUNDLER_DMG_IGNORE_CI=1 CI=true pnpm tauri build` (or omit `CI` for the DMG step) and assert that the finished image contains `.DS_Store`.
2. **[P1] No single visible install action.** Add a fixed `bundle.macOS.dmg` layout: app at left, Applications at right, and a background arrow/short “Drag to Applications” cue.
3. **[P1] The DMG does not carry the product’s visual language.** Use a restrained dark background drawn from the existing midnight-blue, cyan, violet, and amber icon palette; a central switch-track/arrow makes the install action feel native to omp-switch.
4. **[P2] Icon scale and whitespace look accidental.** Use roughly 112–128px icon placement in a compact 660×400 window, aligned on one horizontal axis and leaving room for labels.
5. **[P2] Trust breaks before the first launch.** Ship Developer ID signing, notarization, and stapling. An ad-hoc-signed config-writing tool will cause an avoidable trust failure.

## Personas

- **Power user:** absent `.DS_Store` and left/top clustering reads as an unfinished release pipeline.
- **First-time installer:** has to recall the macOS drag-to-install convention and may launch the app from the read-only volume.
- **Security-sensitive developer:** Gatekeeper/signing uncertainty contradicts the product’s safety-and-backup promise.

## Questions to Consider

- Should the DMG primarily optimize for a trusted public release, or remain a developer-only distribution artifact?
- Is a Homebrew Cask also desirable for terminal-first users, while retaining this polished DMG for visual installation?
