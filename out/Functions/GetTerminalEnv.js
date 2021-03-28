"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTerminalEnv = void 0;
const vscode_1 = require("vscode");
const Enums_1 = require("../Types/Enums");
const getTerminalEnv = (platform) => {
    let out;
    if (platform === Enums_1.VSCodePlatform.Windows) {
        out = {};
    }
    else {
        out = process.env;
    }
    let inheritEnv = true;
    const workspaceConfig = vscode_1.workspace.getConfiguration("terminal");
    if (workspaceConfig["integrated"]) {
        const integratedTerminal = workspaceConfig["integrated"];
        // if (integratedTerminal["inheritEnv"]) {
        //     inheritEnv = integratedTerminal["inheritEnv"];
        // }
        if (integratedTerminal["env"]) {
            const terminalEnv = integratedTerminal["env"];
            if (terminalEnv[platform]) {
                const platformEnv = terminalEnv[platform];
                if (platformEnv) {
                    for (const [key, value] of Object.entries(platformEnv)) {
                        const regex = /\$\{env:(\w+)\}/g;
                        const matches = [...value.matchAll(regex)];
                        if (matches && matches.length > 0) {
                            let outValue = value;
                            for (const match of matches) {
                                if (match.length < 2)
                                    break;
                                const env = process.env[match[1]];
                                if (env) {
                                    const re = new RegExp(match[0].replace("$", "\\$"), "g");
                                    outValue = outValue.replace(re, env.replace(/\\/g, "/"));
                                }
                            }
                            out[key] = outValue;
                        }
                        else {
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
        if (platform === Enums_1.VSCodePlatform.Windows) {
            let path = process.env[PATH_WIN];
            if (path) {
                path = path.replace(/\\/g, "/");
                if (out[PATH_WIN] && !out[PATH_WIN].includes(path)) {
                    out[PATH_WIN] = `${out[PATH_WIN]};${path}`;
                }
            }
        }
        else {
            let path = process.env[PATH_UNIX];
            if (path) {
                if (out[PATH_UNIX] && !out[PATH_UNIX].includes(path)) {
                    out[PATH_UNIX] = `${out[PATH_UNIX]}:${path}`;
                }
            }
        }
    }
    return out;
};
exports.getTerminalEnv = getTerminalEnv;
//# sourceMappingURL=GetTerminalEnv.js.map