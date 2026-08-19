# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers and AI agent power users managing local OMP (`~/.omp/agent/`) configuration profiles and switching models, endpoints, and environment settings quickly across workflows.

## Product Purpose

Provide a fast, reliable, and visual desktop management tool for `~/.omp/agent/` configuration snapshots (`models.yml` and `config.yml`), making it seamless to create, edit, backup, and switch profiles while detecting configuration drift.

## Positioning

Direct integration with the local live configuration files and background processes with automatic pre-switch backups, real-time external drift detection, and visual tree/form editors alongside raw YAML validation.

## Operating Context

- Local macOS desktop environment (built with Tauri 2 + React + TypeScript + Tailwind CSS v4), with cross-platform desktop readiness (Linux/Windows).
- Interacts directly with live files in `~/.omp/agent/` and manages profiles and state in `~/.omp-switch/`.
- Developer workflows involving rapid switching between different LLM providers, model sets, prompt configs, and local tools without breaking working states.

## Capabilities and Constraints

- **Profile Lifecycle**: Create, duplicate, rename, export, import, and delete configuration profiles.
- **Safe Switching**: Instant one-click profile activation with automatic timestamped backups saved to `~/.omp-switch/backups/`.
- **Drift & Status Detection**: Real-time identification of active status, last-switched profile, and external drift warnings when live files diverge from the profile snapshot.
- **Dual-Mode Editing**: Visual structured editors (`ConfigVisualizer`, `ModelsVisualizer`) and raw YAML editor with inline validation.
- **Process Awareness**: Detection of active `omp` processes to notify users during switching.
- **Desktop Experience**: Dark/light theme customization, internationalization (English / Simplified Chinese), and responsive desktop layout.

## Brand Commitments

- **Name**: `omp-switch`
- **Voice & Feel**: Precise, utilitarian, modern developer tool aesthetics with crisp visual hierarchy and unobtrusive status indicators.

## Evidence on Hand

- Complete React 19 + TypeScript + Tailwind CSS v4 frontend under `src/`.
- Tauri 2 Rust backend under `src-tauri/` handling filesystem operations, process detection, and validation.
- [`README.md`](file:///Users/parco/Documents/workspace/lab/omp-switch/README.md) specifying data directories, commands, and live file management rules.

## Product Principles

- **Safety First**: Never overwrite live configurations without automated backup and clear drift warning.
- **Speed & Clarity**: One-click switching with unambiguous visual cues for active and drifted states.
- **Dual-Mode Flexibility**: Seamless transition between visual form controls and raw YAML for power users.
- **Desktop Fidelity**: Snappy, distraction-free desktop utility tailored for developer daily use.

## Accessibility & Inclusion

- High-contrast visual status indicators (active badges, drift dots, validation error summaries).
- Full bilingual i18n support (English and Simplified Chinese).
