import * as proc from "child_process";
import * as path from "path";
import treeKill from "tree-kill";
import { OutputChannel } from "../OutputChannel";

import { Dictionary, getVSCodePlatform, Optional, VSCodePlatform } from "../Types";
import { Readable, Writable } from "stream";
import { EscapeCodes } from "./EscapeCodes";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

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
type ProblemCallback = (lastOutput: string) => void;

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
    onGetOutput?: ProblemCallback;
};

class TerminalProcess {
    private subprocess: Optional<proc.ChildProcessByStdio<Writable, Readable, Readable>> = null;
    private interrupted: boolean = false;
    private killed: boolean = false;

    private shellPath: string = "";
    private label: string = "";
    private lastOutput: string = "";

    private platform: VSCodePlatform;

    constructor(public onWrite: (text: string) => void) {
        this.platform = getVSCodePlatform();
    }

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

        if (!this.interrupted && !!signal) {
            this.haltSubProcess();
        }
    };

    private haltSubProcess = (signal: NodeJS.Signals = "SIGINT", onHalt?: () => void): void => {
        if (!!this.subprocess?.pid && !this.killed) {
            const pid = this.subprocess.pid;

            const callback = (err: any) => {
                // We don't care if the process was not found - it means it finished already but the subprocess context still exists
                const message: string = err?.message ?? "";
                const processNotFound: boolean =
                    message.includes('ERROR: The process "') && message.includes('" not found.');
                if (!!err && !processNotFound) {
                    // OutputChannel.logError(err);
                    console.error(err);
                    console.error("there was an error halting the process");
                } else {
                    this.subprocess = null;
                    onHalt?.();
                }
            };

            if (this.platform === VSCodePlatform.Windows) {
                if (signal === "SIGINT") {
                    // Note: on Windows, we have to use 3rd party app to bypass a nodejs shortcoming
                    //   In Node, you can't send a CTRL_C_EVENT to a child process
                    //

                    // TODO: calling windows-kill twice is a bit of a hack
                    //  The first time it's called, it might not work
                    //
                    const extensionPath = getChaletToolsInstance().extensionPath;
                    const windowsKill = path.join(extensionPath, "bin", "windows-x64", "windows-kill.exe");
                    const cmd = `${windowsKill} -${signal} ${pid}`;
                    proc.exec(cmd, () => proc.exec(cmd, callback));
                } else {
                    proc.exec(`taskkill /pid ${pid} /T /F`, callback);
                }
            } else {
                treeKill(this.subprocess.pid, signal, callback);
            }
            this.killed = true;
        } else {
            onHalt?.();
        }
    };

    inputBuffer: string = "";
    inputOffset: number = 0;

    private writeInputBuffer = () => {
        if (this.subprocess) {
            this.subprocess.stdin.cork();
            this.subprocess.stdin.write(this.inputBuffer);
            this.subprocess.stdin.uncork();
            // this.subprocess.stdin.end();
        }
        this.inputBuffer = "";
        this.inputOffset = 0;
    };

    write = (data: string) => {
        if (data.length === 0) {
            return;
        }

        // console.log(JSON.stringify(data));

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
        if (data === "\r\n") {
            if (this.platform === VSCodePlatform.Windows) {
                this.inputBuffer += data;
            } else {
                this.inputBuffer += "\n";
            }
            this.writeInputBuffer();
        } else {
            this.inputBuffer += data;
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
        onGetOutput,
        ...options
    }: TerminalProcessOptions): Promise<number> => {
        return new Promise((resolve, reject) => {
            const onCreate = () => {
                if (!!this.subprocess) {
                    // Note: Fixes a bug where if the process is recreated, the old listeners don't get fired
                    this.subprocess.stdout.removeAllListeners("data");
                    this.subprocess.stderr.removeAllListeners("data");
                    this.subprocess.removeAllListeners("close");
                    this.subprocess.removeAllListeners("error");
                }

                this.killed = false;
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
                this.subprocess.stdin.setDefaultEncoding("utf-8");

                this.lastOutput = "";
                onStart?.();

                this.label = label;
                this.shellPath = options.shellPath;

                this.subprocess.on("error", (err: SpawnError) => {
                    if (onFailure) {
                        onFailure(err);
                    } else {
                        if (err.code === "ENOENT") {
                            this.onWrite(
                                `\x1b[31;1mError:\n\x1b[0m   '${options.shellPath}' was not found in PATH.\n\n`
                            );
                        }
                        OutputChannel.logError(err);
                    }
                    setTimeout(this.haltSubProcess, 250);
                    reject(err);
                });

                let captureOutput = true;
                let passedProblems = false;
                const searchStringA = "▼  Run:";
                const searchStringB =
                    "--------------------------------------------------------------------------------";

                const passChaletOutputToProblemMatcher = () => {
                    if (!passedProblems) {
                        onGetOutput?.(
                            this.lastOutput
                                .replace(/\x1b\[[0-9;]*[Km]/g, "")
                                .replace(/\r\n/g, "\n")
                                .replace(/\r/g, "")
                        );
                        passedProblems = true;
                    }
                };

                // stdin
                // this.subprocess.stdin.on("data", (chunk: Buffer) => this.onWrite(chunk.toString()));

                // stdout
                this.subprocess.stdout.on("data", (chunk: Buffer) => {
                    const data = chunk.toString();
                    if (captureOutput) {
                        if (data.indexOf(searchStringA) >= 0 || data.indexOf(searchStringB) >= 0) {
                            passChaletOutputToProblemMatcher();
                            captureOutput = false;
                        }
                    }
                    if (captureOutput) {
                        this.lastOutput += data;
                    }
                    this.onWrite(data);
                });

                // stderr
                this.subprocess.stderr.on("data", (chunk: Buffer) => {
                    const data = chunk.toString();
                    if (captureOutput) {
                        this.lastOutput += data;
                    }
                    this.onWrite(data);
                });

                // exit - stdio streams have not finished
                // close - stdio streams have finished
                this.subprocess.on("close", (code, signal) => {
                    try {
                        this.onProcessClose(code, signal);
                        passChaletOutputToProblemMatcher();
                        onSuccess?.(code ?? 0, signal);
                        resolve(code ?? 0);
                    } catch (err) {
                        reject(err);
                    }
                });
            };

            this.haltSubProcess("SIGINT", onCreate);
        });
    };

    interrupt = () => {
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
