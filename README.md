# Tauri + Vanilla TS

This template should help get you started developing with Tauri in vanilla HTML, CSS and Typescript.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
- build devcontainer with `podman build . -t tauri-devcontainer`
- run with `RUST_LOG=debug ./src-tauri/target/release/bundle/appimage/virtual-keyboard-pad_0.1.0_amd64.AppImage`

### Common issues

- On strip issues build with `NO_STRIP=true npm run tauri build`

### TODO

- keyboard layout/settings from config file
- layers (set display, have a stack of active layers)
- haptic feedback - smoothen on border, configure/disable, padding on keyboard key?
- remove pause channel, since pause related everything is done on rust side/hid thread
- hid thread separate file
- steamdeck specific split
- restructure ts
