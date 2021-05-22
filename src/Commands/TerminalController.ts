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
// import * as treeKill from "tree-kill";

type SucessCallback = (code?: number, signal?: Optional<NodeJS.Signals>) => void;
type FailureCallback = (err?: Error) => void;

type TerminalOptions = {
    name: string;
    autoClear?: boolean;
    shellPath: string;
    shellArgs?: string[];
    cwd?: string;
    env?: Dictionary<string>;
    onStart?: () => void;
    onSuccess?: SucessCallback;
    onFailure?: FailureCallback;
};

export class TerminalController {
    subprocess: Optional<ChildProcessWithoutNullStreams> = null;
    writeEmitter: EventEmitter<string>;
    closeEmitter: EventEmitter<void | number>;
    terminal: Terminal | null = null;
    interrupted: boolean = false;

    shellPath: string = "";
    name: string = "";
    onSuccess?: SucessCallback;
    onFailure?: FailureCallback;

    constructor() {
        this.writeEmitter = new EventEmitter<string>();
        this.closeEmitter = new EventEmitter<void | number>();
    }

    private fetchOrMakeTerminal = (name: string): Terminal => {
        let terminal: Terminal | undefined;
        if (name && typeof name === "string") {
            terminal = window.terminals.find((term) => term.name === name);
        } else {
            terminal = window.activeTerminal;
        }

        if (terminal) {
            // might be useful to do something here
            console.log("found existing terminal");
            terminal.show();
        } else {
            terminal = window.createTerminal({
                name,
                pty: {
                    onDidWrite: this.writeEmitter.event,
                    onDidClose: this.closeEmitter.event,
                    handleInput: this.onTerminalInput,
                    open: this.openTerminal,
                    close: this.closeTerminal,
                },
            });
        }

        return terminal;
    };

    deactivate = () => {
        this.haltSubProcess();
        this.terminal?.dispose();
        this.terminal = null;

        this.writeEmitter.dispose();
        this.closeEmitter.dispose();
    };

    haltSubProcess = (signal: Optional<NodeJS.Signals> = null) => {
        if (this.subprocess) {
            if (this.subprocess.pid) {
                this.subprocess.kill(signal ?? "SIGTERM");
                /*if (signal) {
                    treeKill(this.subprocess.pid, signal, (err?: Error) => {
                        if (err) console.error(err);
                    });
                } else {
                    treeKill(this.subprocess.pid, "SIGTERM", (err?: Error) => {
                        if (err) console.error(err);
                    });
                }*/
            }
            this.subprocess = null;
        }
    };

    // Terminal callbacks
    onTerminalInput = (data: string) => {
        if (!this.subprocess) return;
        // console.log(JSON.stringify(data)); // logs escape characters
        // CTRL+C
        if (data === "\u0003") {
            this.onTerminalClose(null, "SIGTERM");
            this.interrupted = true;
        } else {
            // newline characters within data get replaced with \r somewhere in terminal.sendText
            data = data.replace(/\r/g, "\r\n");
            console.log(data.slice(0, data.length - 1));
            this.writeEmitter?.fire(data);
        }
    };

    openTerminal = () => {};

    closeTerminal = this.deactivate;

    onTerminalClose = (code: Optional<number>, signal: Optional<NodeJS.Signals>) => {
        let color: number = 37;
        if (this.terminal) {
            if (this.interrupted) {
                this.terminal.sendText(
                    `\x1b[1;${color}m\r\n${this.name} exited with code: 2 (Interrupt)\r\n\x1b[0m`,
                    false
                );
            } else if (code === null) {
                this.terminal.sendText(`\x1b[1;${color}m\r\n${this.name} exited\r\n\x1b[0m`, false);
            } else {
                if (code === -2) {
                    this.terminal.sendText(
                        `\x1b[1;${color}m\r\n\x1b[1;31mCritial Error:\x1b[0m ${this.shellPath} was not found in PATH\r\n\x1b[0m`,
                        false
                    );
                } else {
                    this.terminal.sendText(
                        `\x1b[1;${color}m\r\n${this.name} exited with code: ${code}\r\n\x1b[0m`,
                        false
                    );
                }
            }

            if (code) this.onSuccess?.(code, signal);
            setTimeout(this.haltSubProcess, 250);
        } else {
            this.haltSubProcess();
        }
    };

    clearTerminal = (): Thenable<void> => {
        return commands.executeCommand("workbench.action.terminal.clear");
    };

    execute = async ({ autoClear, name, cwd, env, onStart, onSuccess, onFailure, ...options }: TerminalOptions) => {
        try {
            this.haltSubProcess();

            this.interrupted = false;

            if (this.terminal == null) {
                this.terminal = this.fetchOrMakeTerminal(name);
            }

            if (!!autoClear) {
                await this.clearTerminal();
            }

            // console.log(cwd);
            // console.log(env);

            const shellArgs: string[] = options.shellArgs ?? [];
            // console.log(options.shellPath, shellArgs.join(" "));
            const spawnOptions: SpawnOptionsWithoutStdio = {
                cwd: cwd ?? process.cwd(),
                env,
            };

            if (this.subprocess === null) {
                this.subprocess = subprocess.spawn(options.shellPath, shellArgs, spawnOptions);
                onStart?.();

                this.name = name;
                this.shellPath = options.shellPath;
                this.onSuccess = onSuccess;
                this.onFailure = onFailure;

                this.subprocess.on("error", (err: Error) => {
                    if (this.onFailure) {
                        this.onFailure(err);
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

                this.subprocess.on("close", this.onTerminalClose);
            }

            if (this.terminal !== window.activeTerminal) {
                this.terminal.show();
            }
        } catch (err) {
            console.error(err);
        }
    };
}
