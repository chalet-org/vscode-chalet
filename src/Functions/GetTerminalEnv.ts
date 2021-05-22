import { workspace } from "vscode";
import { Dictionary } from "../Types";
import { VSCodePlatform } from "../Types/Enums";

const PATH_WIN = "Path";
const PATH_UNIX = "PATH";

const rootEnv: Dictionary<string> = JSON.parse(JSON.stringify(process.env)) as Dictionary<string>;

export const getTerminalEnv = (platform: VSCodePlatform): Dictionary<string> => {
    let out: Dictionary<string> = JSON.parse(JSON.stringify(rootEnv));

    const workspaceConfig = workspace.getConfiguration("terminal");
    if (workspaceConfig["integrated"]) {
        const integratedTerminal: any = workspaceConfig["integrated"];
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

                                if (
                                    (match[1] != PATH_WIN && platform === VSCodePlatform.Windows) ||
                                    (match[1] != PATH_UNIX && platform !== VSCodePlatform.Windows)
                                )
                                    continue;

                                const env = rootEnv[match[1]];
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

    if (platform === VSCodePlatform.Windows) {
        let path = rootEnv[PATH_WIN];
        path = path.replace(/\\/g, "/");
        if (path) {
            if (out[PATH_WIN] && !out[PATH_WIN].includes(path)) {
                out[PATH_WIN] += ";" + path;
            }
        }
    } else {
        let path = rootEnv[PATH_UNIX];
        if (path) {
            if (out[PATH_UNIX] && !out[PATH_UNIX].includes(path)) {
                out[PATH_UNIX] += ":" + path;
            }
        }
    }

    return out;
};
