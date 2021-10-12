import * as proc from "child_process";
import * as treeKill from "tree-kill";
import { OutputChannel } from "../OutputChannel";

import { Dictionary, Optional } from "../Types";
import { Readable, Writable } from "stream";
import { EscapeCodes } from "./EscapeCodes";

export type SpawnError = Error & {
    code?: string;
    errno?: number;
    message?: string;
    path?: string;
    spawnargs?: string[];
    syscall?: string;
};

type SucessCallback = (code?: Optional<number>, signal?: Optional<NodeJS.Signals>) => void;
type FailureCallback = (err?: SpawnError) => void;

export type TerminalProcessOptions = {
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

class TerminalProcess {
    private subprocess: Optional<proc.ChildProcessByStdio<Writable, Readable, Readable>> = null;
    private interrupted: boolean = false;

    private shellPath: string = "";
    private name: string = "";

    constructor(public onWrite: (text: string) => void) {}

    private onProcessClose = (code: Optional<number>, signal: Optional<NodeJS.Signals>) => {
        let color: number = 37;
        if (this.interrupted) {
            this.onWrite(`\x1b[1;${color}m\r\n${this.name} exited with code: 2 (Interrupt)\r\n\x1b[0m`);
        } else if (code === null) {
            this.onWrite(`\x1b[1;${color}m\r\n${this.name} exited\r\n\x1b[0m`);
        } else {
            if (code === -2) {
                this.onWrite(
                    `\x1b[1;${color}m\r\n\x1b[1;31mCritial Error:\x1b[0m ${this.shellPath} was not found in PATH\r\n\x1b[0m`
                );
            } else if (code !== -4058 /* ENOENT */) {
                this.onWrite(`\x1b[1;${color}m\r\n${this.name} exited with code: ${code}\r\n\x1b[0m`);
            }
        }

        this.haltSubProcess(signal);
    };

    private haltSubProcess = (signal: Optional<NodeJS.Signals> = null) => {
        if (this.subprocess) {
            if (this.subprocess.pid && !this.subprocess.killed) {
                treeKill(this.subprocess.pid, !!signal ? signal : "SIGTERM", (err?: Error) => {
                    if (err) console.error(err.message); // we mostly don't care about this error
                });
            }
            this.subprocess = null;
        }
    };

    inputBuffer: string = "";
    inputOffset: number = 0;

    private writeInputBuffer = () => {
        this.subprocess?.stdin.write(this.inputBuffer);
        // this.subprocess?.stdin.end();
        this.inputBuffer = "";
        this.inputOffset = 0;
    };

    write = (data: string) => {
        if (data.length === 0) return;

        console.log(JSON.stringify(data));

        switch (data) {
            case EscapeCodes.Interrupt: {
                this.interrupt();
                return;
            }
            case EscapeCodes.ArrowUp:
            case EscapeCodes.ArrowDown:
            case EscapeCodes.PageDown:
            case EscapeCodes.PageUp:
            case EscapeCodes.Insert:
            case EscapeCodes.Delete:
            case EscapeCodes.ArrowRight:
            case EscapeCodes.ArrowLeft:
            case EscapeCodes.Home:
            case EscapeCodes.End: {
                this.subprocess?.stdin.write(data);
                return;
            }
            /*case EscapeCodes.ArrowRight: {
                this.subprocess?.stdin.write(data);
                if (this.inputOffset > 0) {
                    this.inputOffset--;
                    this.onWrite(data);
                }
                return;
            }
            case EscapeCodes.ArrowLeft: {
                this.subprocess?.stdin.write(data);
                if (this.inputOffset < this.inputBuffer.length) {
                    this.inputOffset++;
                    this.onWrite(data);
                }
                return;
            }

            case EscapeCodes.End: {
                this.subprocess?.stdin.write(data);
                while (this.inputOffset > 0) {
                    this.inputOffset--;
                    this.onWrite(EscapeCodes.ArrowRight);
                }
                return;
            }

            case EscapeCodes.Home: {
                this.subprocess?.stdin.write(data);
                while (this.inputOffset < this.inputBuffer.length) {
                    this.inputOffset++;
                    this.onWrite(EscapeCodes.ArrowLeft);
                }
                return;
            }*/

            case EscapeCodes.Backspace: {
                if (this.inputBuffer.length - this.inputOffset > 0) {
                    this.inputBuffer = this.inputBuffer.slice(0, -1);
                    this.onWrite("\b \b");
                }
                return;
            }

            default:
                break;
        }

        this.onWrite(data);
        this.inputBuffer += data;
        if (data === "\r\n") {
            this.writeInputBuffer();
        }
    };

    execute = (
        { autoClear, name, cwd, env, onStart, onSuccess, onFailure, ...options }: TerminalProcessOptions,
        onAutoClear: () => Thenable<void>
    ): Promise<number> => {
        return new Promise((resolve, reject) => {
            this.haltSubProcess();
            this.interrupted = false;

            if (!!autoClear) {
                (async () => {
                    try {
                        await onAutoClear();
                    } catch (err) {
                        reject(err);
                    }
                })();
            }

            // console.log(cwd);
            // console.log(env);

            const shellArgs: string[] = options.shellArgs ?? [];
            // console.log(options.shellPath, shellArgs.join(" "));
            const spawnOptions: proc.SpawnOptionsWithStdioTuple<proc.StdioPipe, proc.StdioPipe, proc.StdioPipe> = {
                cwd: cwd ?? process.cwd(),
                env,
                stdio: ["pipe", "pipe", "pipe"],
            };

            if (this.subprocess === null) {
                this.subprocess = proc.spawn(options.shellPath, shellArgs, spawnOptions);
                onStart?.();

                this.name = name;
                this.shellPath = options.shellPath;

                this.subprocess.on("error", (err: SpawnError) => {
                    if (onFailure) {
                        onFailure(err);
                    } else {
                        if (err.code == "ENOENT") {
                            this.onWrite(
                                `\x1b[31;1mChalet Tools Error:\n\x1b[0m   '${options.shellPath}' was not found in PATH.\n\n`
                            );
                        }
                        OutputChannel.logError(err);
                    }
                    setTimeout(this.haltSubProcess, 250);
                    reject(err);
                });

                // this.subprocess.stdin.on("data", (chunk: Buffer) => this.onWrite(chunk.toString()));
                this.subprocess.stdout.on("data", (chunk: Buffer) => this.onWrite(chunk.toString()));
                this.subprocess.stderr.on("data", (chunk: Buffer) => this.onWrite(chunk.toString()));

                // exit - stdio streams have not finished
                // close - stdio streams have finished
                this.subprocess.on("close", (code, signal) => {
                    this.onProcessClose(code, signal);
                    onSuccess?.(code ?? 0, signal);
                    resolve(code ?? 0);
                });
            }
        });
    };

    interrupt = () => {
        // Note: on Windows, the process will always be killed immediately
        //  Days lost trying to figure out otherwise: 1
        //  Does not work: GenerateConsoleCtrlEvent (winapi), "\u0003" or "\x03"
        //
        this.haltSubProcess("SIGINT");
        this.interrupted = true;
    };

    terminate = () => {
        this.haltSubProcess("SIGTERM");
        this.interrupted = true;
    };

    dispose = this.terminate;
}

export { TerminalProcess };
