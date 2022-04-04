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
    label: string;
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
    private label: string = "";

    constructor(public onWrite: (text: string) => void) {}

    private onProcessClose = (code: Optional<number>, signal: Optional<NodeJS.Signals>): void => {
        let color: number = 37;
        if (this.interrupted) {
            this.onWrite(`\x1b[1;${color}m${this.label} exited with code: 2 (Interrupt)\r\n\x1b[0m`);
        } else if (code === null) {
            this.onWrite(`\x1b[1;${color}m${this.label} exited\r\n\x1b[0m`);
        } else {
            if (code === -2) {
                color = 31;
                this.onWrite(
                    `\x1b[1;${color}mCritial Error:\x1b[0m ${this.shellPath} was not found in PATH\r\n\x1b[0m`
                );
            } else if (code !== -4058 /* ENOENT */) {
                this.onWrite(`\x1b[1;${color}m${this.label} exited with code: ${code}\r\n\x1b[0m`);
            }
        }

        return this.haltSubProcess(signal);
    };

    private haltSubProcess = (signal: Optional<NodeJS.Signals> = null, onHalt?: () => void): void => {
        if (!!this.subprocess?.pid) {
            let sig = !!signal ? signal : "SIGTERM";
            // this.subprocess.kill(sig);
            // this.subprocess = null;
            // resolve();

            treeKill(this.subprocess.pid, sig, (_err?: Error) => {
                // Note: We don't care about the error
                // if (!!err) OutputChannel.logError(err);

                this.subprocess = null;
                onHalt?.();
            });
        } else {
            onHalt?.();
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

    execute = ({
        autoClear,
        label,
        cwd,
        env,
        onStart,
        onSuccess,
        onFailure,
        ...options
    }: TerminalProcessOptions): Promise<number> => {
        return new Promise((resolve, reject) => {
            if (!!this.subprocess) {
                // Note: Fixes a bug where if the process is recreated, the old listeners don't get fired
                this.subprocess.stdout.removeAllListeners("data");
                this.subprocess.stderr.removeAllListeners("data");
                this.subprocess.removeAllListeners("close");
                this.subprocess.removeAllListeners("error");
            }

            this.haltSubProcess("SIGTERM", () => {
                this.interrupted = false;

                // console.log(cwd);
                // console.log(env);

                const shellArgs: string[] = options.shellArgs ?? [];
                // console.log(options.shellPath, shellArgs.join(" "));
                const spawnOptions: proc.SpawnOptionsWithStdioTuple<proc.StdioPipe, proc.StdioPipe, proc.StdioPipe> = {
                    cwd: cwd ?? process.cwd(),
                    env,
                    stdio: ["pipe", "pipe", "pipe"],
                    windowsHide: true,
                };

                this.onWrite("\r\n");
                this.subprocess = proc.spawn(options.shellPath, shellArgs, spawnOptions);
                onStart?.();

                this.label = label;
                this.shellPath = options.shellPath;

                this.subprocess.on("error", (err: SpawnError) => {
                    if (onFailure) {
                        onFailure(err);
                    } else {
                        if (err.code == "ENOENT") {
                            this.onWrite(
                                `\x1b[31;1mError:\n\x1b[0m   '${options.shellPath}' was not found in PATH.\n\n`
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
                    try {
                        this.onProcessClose(code, signal);
                        onSuccess?.(code ?? 0, signal);
                        resolve(code ?? 0);
                    } catch (err) {
                        reject(err);
                    }
                });
            });
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
