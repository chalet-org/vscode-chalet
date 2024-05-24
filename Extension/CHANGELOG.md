# Change Log

## Version 0.7.12

- Add additional publishing targets: `linux-arm64` `web`

## Version 0.7.11

- Problem matcher: fix a bug where the file cache was not cleared with the rest of the diagnostics

## Version 0.7.10

- Problem matcher: Support 'note' in MSVC, allowing for full parsing of template errors

## Version 0.7.9

- Problem matcher: If running (`chalet run` / `chalet buildrun`), update the problem matcher before the user's application starts running

## Version 0.7.8

- Problem matcher: cache duplicate lines in the case of errors coming from large template hierarchies

## Version 0.7.7

- Fix Open VSX deployment

## Version 0.7.6

- Added internal problem matcher that runs at the end of a build - supports Clang, GCC and MSVC style diagnostics

## Version 0.7.5

- Fix a file watcher caching regression from 0.7.4

## Version 0.7.4

- If a workspace contains both a yaml and json build file, favor the json file to match the behavior of the Chalet executable
- Fixed a minor issue trashing the Chalet terminal if the process has finished already

## Version 0.7.3

- Fix halting Chalet process via trash icon on Windows

## Version 0.7.2

- Remove some logging in 0.7.1, simplify some code

## Version 0.7.1

- When ending the Chalet process via the trash icon on unix platforms, use `tree-kill` to make sure child processes close as well

## Version 0.7.0

- Use the TextDocumentContentProvider for `chalet.yaml` files instead of the hard-coded URL, if using Red Hat YAML extension (thanks to [vaclavHala](https://github.com/redhat-developer/vscode-yaml/issues/986))

## Version 0.6.6

- Detect `chalet.yaml` changes (in development)

## Version 0.6.5

- Add `yamlValidation` support for `chalet.yaml` (in development)

## Version 0.6.4

- Fix a terminal issue where it wouldn't restart when it should

## Version 0.6.3

- Make terminal restart behavior from 0.6.2 work the same way on Windows

## Version 0.6.2

- Always send SIGINT to Chalet process when restarting terminal or disposing it. SIGTERM can leave emrun server open if using emscripten (in development)
- Revert 'preserveFocus' change - old behavior is a little more expected

## Version 0.6.1

- Fix a regression where 'Chalet' pseudoterminal wouldn't launch if one was already open
- Added 'preserveFocus" param when pseudoterminal launches, so it wouldn't change the keyboard shortcut context

## Version 0.6.0

- Handle CTRL_C_EVENT to child process in Windows to exit latest development Chalet builds gracefully (for v0.7.0+ or possibly v0.6.10+) - downside is, a 3rd party app has to be used for this, [windows-kill](https://github.com/ElyDotDev/windows-kill)

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
