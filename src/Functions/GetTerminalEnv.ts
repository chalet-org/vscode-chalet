import { workspace } from "vscode";
import { Dictionary } from "../Types";
import { VSCodePlatform } from "../Types/Enums";

const rootEnv: Dictionary<string> = process.env as Dictionary<string>;

export const getTerminalEnv = (platform: VSCodePlatform): Dictionary<string> => {
    let out: Dictionary<string> = rootEnv;

    /*
    let inheritEnv: boolean = true;
    const workspaceConfig = workspace.getConfiguration("terminal");
    if (workspaceConfig["integrated"]) {
        const integratedTerminal: any = workspaceConfig["integrated"];
        // if (integratedTerminal["inheritEnv"]) {
        //     inheritEnv = integratedTerminal["inheritEnv"];
        // }
        if (integratedTerminal["env"]) {
            const terminalEnv: any = integratedTerminal["env"];
            if (terminalEnv[platform]) {
                const platformEnv: Dictionary<string> = terminalEnv[platform];
                if (platformEnv) {
                    for (const [key, value] of Object.entries(platformEnv)) {
                        const regex = /\$\{env:(\w+)\}/g;
                        const matches = [...value.matchAll(regex)];
                        if (matches && matches.length > 0) {
                            let outValue = value;
                            for (const match of matches) {
                                if (match.length < 2) break;

                                const env = process.env[match[1]];
                                if (env) {
                                    const re = new RegExp(match[0].replace("$", "\\$"), "g");
                                    outValue = outValue.replace(re, env.replace(/\\/g, "/"));
                                }
                            }
                            out[key] = outValue;
                        } else {
                            out[key] = value;
                        }
                    }
                }
            }
        }
    }

    if (inheritEnv) {
        const PATH_WIN = "Path";
        const PATH_UNIX = "PATH";
        if (platform === VSCodePlatform.Windows) {
            let path = process.env[PATH_WIN];
            if (path) {
                path = path.replace(/\\/g, "/");
                if (out[PATH_WIN] && !out[PATH_WIN].includes(path)) {
                    out[PATH_WIN] = `${out[PATH_WIN]};${path}`;
                }
            }
        } else {
            let path = process.env[PATH_UNIX];
            if (path) {
                if (out[PATH_UNIX] && !out[PATH_UNIX].includes(path)) {
                    out[PATH_UNIX] = `${out[PATH_UNIX]}:${path}`;
                }
            }
        }
    }
    */

    return out;
};
