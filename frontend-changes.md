# Frontend changes

## Scope

This release refreshes the application's visual identity and settings presentation while keeping the existing profile and model-switching behavior unchanged.

## User-visible changes

- Added the new omp-switch icon assets in `public/` for the browser favicon, Apple touch icon, and in-app branding.
- Added the SVG icon and favicon declarations in `index.html`.
- Added omp-switch branding to the global models-library section in `src/components/ProfileList.tsx`.
- Refined the About section and settings modal presentation in `src/components/SettingsModal.tsx`, including the app icon, version label, and product description.
- Regenerated the Tauri application icons under `src-tauri/icons/` for packaged builds.
- Added a designed DMG background at `src-tauri/resources/dmg-background.png`; the DMG installer uses a 660×400 window with the app and Applications icons aligned to the artwork.

## Validation

- `pnpm build`
- `cargo test --manifest-path src-tauri/Cargo.toml -- --test-threads=1`
- On macOS, `pnpm dmg` should be used to generate and finalize the Finder-based installer layout.
