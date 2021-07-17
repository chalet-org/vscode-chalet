import * as proc from "child_process";
import * as treeKill from "tree-kill";
import { OutputChannel } from "../OutputChannel";

import { Dictionary, Optional } from "../Types";

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
    private subprocess: Optional<proc.ChildProcessWithoutNullStreams> = null;
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

    execute = (
        { autoClear, name, cwd, env, onStart, onSuccess, onFailure, ...options }: TerminalProcessOptions,
        onCreate: () => void,
        onAutoClear: () => Thenable<void>
    ): Promise<number> => {
        return new Promise((resolve, reject) => {
            this.haltSubProcess();
            this.interrupted = false;

            onCreate();

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
            const spawnOptions: proc.SpawnOptionsWithoutStdio = {
                cwd: cwd ?? process.cwd(),
                env,
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

                this.subprocess.stdout.on("data", (chunk: Buffer) => this.onWrite(chunk.toString()));
                this.subprocess.stderr.on("data", (chunk: Buffer) => this.onWrite(chunk.toString()));

                this.subprocess.on("close", (code, signal) => {
                    this.onProcessClose(code, signal);
                    onSuccess?.(code ?? 0, signal);
                    resolve(code ?? 0);
                });
            }
        });
    };

    terminate = () => {
        this.interrupted = true;
        this.haltSubProcess("SIGTERM");
    };

    dispose = () => {
        this.terminate();
        this.haltSubProcess();
    };
}

export { TerminalProcess };
