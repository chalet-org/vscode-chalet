import * as proc from "child_process";
import * as treeKill from "tree-kill";
import * as vscode from "vscode";

import { OutputChannel } from "../OutputChannel";
import { SpawnError } from "../Terminal/TerminalProcess";
import { Dictionary } from "../Types";

export const getProcessOutput = (
    executable: string,
    args: string[],
    env?: Dictionary<string>,
    cwd?: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        let ret: string = "";
        const runningProcess = proc.spawn(executable, args, {
            cwd: cwd ?? process.cwd(),
            env,
            stdio: ["inherit", "pipe", "pipe"],
        });

        OutputChannel.logCommand(`${executable} ${args.join(" ")}`);

        runningProcess.stdout.on("data", (chunk: Buffer) => {
            ret += chunk.toString();
        });
        runningProcess.on("error", (err: SpawnError) => {
            if (err.code == "ENOENT") {
                OutputChannel.logError({
                    ...err,
                    message: `Error: '${executable}' was not found in PATH.`,
                });
            }
            setTimeout(() => {
                if (runningProcess.pid && !runningProcess.killed) {
                    treeKill(runningProcess.pid, "SIGTERM");
                }
            }, 250);
            reject(err);
        });
        runningProcess.on("exit", () => {
            while (ret.endsWith("\n") || ret.endsWith("\r")) {
                ret = ret.slice(0, -1);
            }
            resolve(ret);
        });
    });
};
