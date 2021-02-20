import {
    ExtensionTerminalOptions as VSCExtensionTerminalOptions,
    Terminal,
    window,
    commands,
    EventEmitter,
    Pseudoterminal,
} from "vscode";
import * as subprocess from "child_process";
import { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from "child_process";
import { Dictionary, Optional } from "../Types";

// suppress:
// [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
// (comes from child_process)
process.removeAllListeners("warning");

type TerminalOptions = {
    name: string;
    autoClear?: boolean;
    shellPath: string;
    shellArgs?: string[];
    cwd?: string;
    env?: Dictionary<string>;
    onStart?: () => void;
    onSuccess?: (code?: number, signal?: Optional<NodeJS.Signals>) => void;
    onFailure?: (err?: Error) => void;
};

export class TerminalController {
    subprocess: Optional<ChildProcessWithoutNullStreams> = null;
    writeEmitter: Optional<EventEmitter<string>> = null;
    closeEmitter: Optional<EventEmitter<void | number>> = null;
    terminal: Terminal | null = null;
    interrupted: boolean = false;

    private createTerminal = (options: VSCExtensionTerminalOptions): Terminal => {
        const { name } = options;

        let terminal: Terminal | undefined;
        if (name && typeof name === "string") {
            terminal = window.terminals.find((term) => term.name === name);
        } else {
            terminal = window.activeTerminal;
        }

        if (terminal) {
            // might be useful to do something here
        } else {
            terminal = window.createTerminal(options);
        }

        return terminal;
    };

    deactivate = () => {
        this.haltSubProcess();
        this.terminal?.dispose();
        this.terminal = null;
    };

    haltSubProcess = (signal: Optional<NodeJS.Signals> = null) => {
        if (this.subprocess) {
            if (!this.subprocess.killed && this.subprocess.pid) {
                this.subprocess.stdout.pause();
                this.subprocess.stderr.pause();
                if (signal) {
                    this.subprocess.kill(signal);
                } else {
                    this.subprocess.kill();
                }
            }
            this.subprocess = null;
        }
    };

    closeTerminal = () => {
        this.haltSubProcess();

        this.writeEmitter?.dispose();
        this.closeEmitter?.dispose();

        this.writeEmitter = null;
        this.closeEmitter = null;

        this.deactivate();
    };

    execute = async ({ autoClear, name, cwd, env, onStart, onSuccess, onFailure, ...options }: TerminalOptions) => {
        try {
            this.haltSubProcess();

            if (this.writeEmitter === null) {
                this.writeEmitter = new EventEmitter<string>();
            }
            if (this.closeEmitter === null) {
                this.closeEmitter = new EventEmitter<void | number>();
            }
            const pty: Pseudoterminal = {
                onDidWrite: this.writeEmitter.event,
                onDidClose: this.closeEmitter.event,
                handleInput: (data: string) => {
                    if (!this.subprocess) return;
                    // console.log(JSON.stringify(data)); // logs escape characters
                    // CTRL+C
                    if (data === "\u0003") {
                        this.haltSubProcess();
                        this.interrupted = true;
                    } else {
                        // newline characters within data get replaced with \r somewhere in terminal.sendText
                        data = data.replace(/\r/g, "\r\n");
                        console.log(data.slice(0, data.length - 1));
                        this.writeEmitter?.fire(data);
                    }
                },
                open: () => {},
                close: this.closeTerminal,
            };
            this.interrupted = false;
            this.terminal = this.createTerminal({
                name,
                pty,
            });

            if (!!autoClear) {
                await commands.executeCommand("workbench.action.terminal.clear");
            }

            // console.log(cwd);
            // console.log(env);

            const shellArgs: string[] = options.shellArgs ?? [];
            // console.log(options.shellPath, shellArgs.join(" "));
            const spawnOptions: SpawnOptionsWithoutStdio = {
                cwd: cwd ?? "",
                env,
            };
            this.subprocess = subprocess.spawn(options.shellPath, shellArgs, spawnOptions);
            onStart?.();

            this.subprocess.on("error", (err: Error) => {
                if (onFailure) {
                    onFailure(err);
                } else {
                    console.error(err.name);
                    console.error(err.message);
                    console.error(err.stack);
                }
                setTimeout(this.haltSubProcess, 250);
            });

            this.subprocess.stdout.on("data", (data: Buffer) => {
                if (!this.subprocess) return;
                this.terminal?.sendText(data.toString(), false);
            });

            this.subprocess.stderr.on("data", (data: Buffer) => {
                if (!this.subprocess) return;
                this.terminal?.sendText(data.toString(), false);
            });

            this.subprocess.on("close", (code: Optional<number>, signal: Optional<NodeJS.Signals>) => {
                let color: number = 37;
                if (this.terminal) {
                    if (this.interrupted) {
                        this.terminal.sendText(
                            `\x1b[1;${color}m\r\n${name} exited with code: 2 (Interrupt)\r\n\x1b[0m`,
                            false
                        );
                    } else if (code === null) {
                        this.terminal.sendText(`\x1b[1;${color}m\r\n${name} exited\r\n\x1b[0m`, false);
                    } else {
                        if (code === -2) {
                            this.terminal.sendText(
                                `\x1b[1;${color}m\r\n\x1b[1;31mCritial Error:\x1b[0m ${options.shellPath} was not found in PATH\r\n\x1b[0m`,
                                false
                            );
                        } else {
                            this.terminal.sendText(
                                `\x1b[1;${color}m\r\n${name} exited with code: ${code}\r\n\x1b[0m`,
                                false
                            );
                        }
                    }

                    if (code) onSuccess?.(code, signal);
                    setTimeout(this.haltSubProcess, 250);
                } else {
                    this.haltSubProcess();
                }
            });

            if (this.terminal !== window.activeTerminal) {
                this.terminal.show();
            }
        } catch (err) {
            console.error(err);
        }
    };
}
