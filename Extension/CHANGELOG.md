# Change Log

## Version 0.5.12

- Only hide the architecture button if the query result returns 1 item

## Version 0.5.11

- bugfix: don't show update popup of verion query fails (would have shown 0.0.0)

## Version 0.5.10

- change "Configure" icon in status bar

## Version 0.5.9

- bugfix: send current state of toolchain & arch buttons to "Generate VS Code Project Files" command

## Version 0.5.8

- bugfix: send current state of toolchain & arch buttons to "Generate VS Code Project Files" command

## Version 0.5.8

- Add "Generate VS Code Project Files" command to run 'chalet export vscode' and copy the resulting .vscode dir if it doesn't exist

## Version 0.5.7

- Update button order to cmd, toolchain, arch, config, run target

## Version 0.5.6

- bugfix: Typechecks in new vscode lib, vscode-uri dep

## Version 0.5.5

- bugfix: Use esbuild to bundle extension

## Version 0.5.4

- bugfix: Don't explicitly set build strategy or build path unless asked (use whatever is in settings)

## Version 0.5.3

- bugfix: Use fs/promises when checking for changes in chalet.json & .chaletrc

## Version 0.5.2

- bugfix: Allow architecture menu if toolchain starts with `llvm-`

## Version 0.5.1

- bugfix: Build strategy & path style should be unset unless otherwise set

## Version 0.5.0

- Chalet version 0.5.0 sync
- Add support for Build Strategy & Build Path Style CLI commands
- Add minimum version check message
- Global settings: ~/.chaletconfig > ~/.chalet/config.json

## Version 0.4.0

- bugfix: fix terminal process input on windows, use utf-8 as default encoding  
- Updated changelog

## Version 0.3.14
## Version 0.3.13

- child_process stdin requires "\n" for enter key press in non-windows.
- update changelog & formatting

## Version 0.3.12

- fix issue with build target showing up on run target button if no run targets exist

## Version 0.3.11
## Version 0.3.10

- remove `chalet:makeDebugBuild` command - assumes there's always a "Debug" build available
- publish in CI server

## Version 0.3.9

- Initial public release
