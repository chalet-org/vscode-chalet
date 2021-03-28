"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalController = void 0;
const vscode_1 = require("vscode");
const subprocess = require("child_process");
const treeKill = require("tree-kill");
// suppress:
// [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
// (comes from child_process)
process.removeAllListeners("warning");
class TerminalController {
    constructor() {
        this.subprocess = null;
        this.writeEmitter = null;
        this.closeEmitter = null;
        this.terminal = null;
        this.interrupted = false;
        this.shellPath = "";
        this.name = "";
        this.createTerminal = (options) => {
            const { name } = options;
            let terminal;
            if (name && typeof name === "string") {
                terminal = vscode_1.window.terminals.find((term) => term.name === name);
            }
            else {
                terminal = vscode_1.window.activeTerminal;
            }
            if (terminal) {
                // might be useful to do something here
            }
            else {
                terminal = vscode_1.window.createTerminal(options);
            }
            return terminal;
        };
        this.deactivate = () => {
            var _a;
            this.haltSubProcess();
            (_a = this.terminal) === null || _a === void 0 ? void 0 : _a.dispose();
            this.terminal = null;
        };
        this.haltSubProcess = (signal = null) => {
            if (this.subprocess) {
                if (this.subprocess.pid) {
                    this.subprocess.stdout.pause();
                    this.subprocess.stderr.pause();
                    if (signal) {
                        treeKill(this.subprocess.pid, signal, (err) => {
                            console.error(err);
                        });
                    }
                    else {
                        treeKill(this.subprocess.pid, "SIGINT", (err) => {
                            console.error(err);
                        });
                    }
                }
                this.subprocess = null;
            }
        };
        // Terminal callbacks
        this.onTerminalInput = (data) => {
            var _a;
            if (!this.subprocess)
                return;
            // console.log(JSON.stringify(data)); // logs escape characters
            // CTRL+C
            if (data === "\u0003") {
                this.onTerminalClose(null, "SIGINT");
                this.interrupted = true;
            }
            else {
                // newline characters within data get replaced with \r somewhere in terminal.sendText
                data = data.replace(/\r/g, "\r\n");
                console.log(data.slice(0, data.length - 1));
                (_a = this.writeEmitter) === null || _a === void 0 ? void 0 : _a.fire(data);
            }
        };
        this.openTerminal = () => { };
        this.closeTerminal = () => {
            var _a, _b;
            this.haltSubProcess();
            (_a = this.writeEmitter) === null || _a === void 0 ? void 0 : _a.dispose();
            (_b = this.closeEmitter) === null || _b === void 0 ? void 0 : _b.dispose();
            this.writeEmitter = null;
            this.closeEmitter = null;
            this.deactivate();
        };
        this.onTerminaStdOut = (data) => {
            var _a;
            if (!this.subprocess)
                return;
            (_a = this.terminal) === null || _a === void 0 ? void 0 : _a.sendText(data.toString(), false);
        };
        this.onTerminaStdErr = (data) => {
            var _a;
            if (!this.subprocess)
                return;
            (_a = this.terminal) === null || _a === void 0 ? void 0 : _a.sendText(data.toString(), false);
        };
        this.onTerminalClose = (code, signal) => {
            var _a;
            let color = 37;
            if (this.terminal) {
                if (this.interrupted) {
                    this.terminal.sendText(`\x1b[1;${color}m\r\n${this.name} exited with code: 2 (Interrupt)\r\n\x1b[0m`, false);
                }
                else if (code === null) {
                    this.terminal.sendText(`\x1b[1;${color}m\r\n${this.name} exited\r\n\x1b[0m`, false);
                }
                else {
                    if (code === -2) {
                        this.terminal.sendText(`\x1b[1;${color}m\r\n\x1b[1;31mCritial Error:\x1b[0m ${this.shellPath} was not found in PATH\r\n\x1b[0m`, false);
                    }
                    else {
                        this.terminal.sendText(`\x1b[1;${color}m\r\n${this.name} exited with code: ${code}\r\n\x1b[0m`, false);
                    }
                }
                if (code)
                    (_a = this.onSuccess) === null || _a === void 0 ? void 0 : _a.call(this, code, signal);
                setTimeout(this.haltSubProcess, 250);
            }
            else {
                this.haltSubProcess();
            }
        };
        this.onTerminalError = (err) => {
            if (this.onFailure) {
                this.onFailure(err);
            }
            else {
                console.error(err.name);
                console.error(err.message);
                console.error(err.stack);
            }
            setTimeout(this.haltSubProcess, 250);
        };
        this.execute = async ({ autoClear, name, cwd, env, onStart, onSuccess, onFailure, ...options }) => {
            var _a;
            try {
                this.haltSubProcess();
                if (this.writeEmitter === null) {
                    this.writeEmitter = new vscode_1.EventEmitter();
                }
                if (this.closeEmitter === null) {
                    this.closeEmitter = new vscode_1.EventEmitter();
                }
                const pty = {
                    onDidWrite: this.writeEmitter.event,
                    onDidClose: this.closeEmitter.event,
                    handleInput: this.onTerminalInput,
                    open: this.openTerminal,
                    close: this.closeTerminal,
                };
                this.interrupted = false;
                this.terminal = this.createTerminal({
                    name,
                    pty,
                });
                if (!!autoClear) {
                    await vscode_1.commands.executeCommand("workbench.action.terminal.clear");
                }
                // console.log(cwd);
                // console.log(env);
                const shellArgs = (_a = options.shellArgs) !== null && _a !== void 0 ? _a : [];
                // console.log(options.shellPath, shellArgs.join(" "));
                const spawnOptions = {
                    cwd: cwd !== null && cwd !== void 0 ? cwd : "",
                    env,
                };
                this.subprocess = subprocess.spawn(options.shellPath, shellArgs, spawnOptions);
                onStart === null || onStart === void 0 ? void 0 : onStart();
                this.name = name;
                this.shellPath = options.shellPath;
                this.onSuccess = onSuccess;
                this.onFailure = onFailure;
                this.subprocess.on("error", this.onTerminalError);
                this.subprocess.stdout.on("data", this.onTerminaStdOut);
                this.subprocess.stderr.on("data", this.onTerminaStdErr);
                this.subprocess.on("close", this.onTerminalClose);
                if (this.terminal !== vscode_1.window.activeTerminal) {
                    this.terminal.show();
                }
            }
            catch (err) {
                console.error(err);
            }
        };
    }
}
exports.TerminalController = TerminalController;
//# sourceMappingURL=TerminalController.js.map