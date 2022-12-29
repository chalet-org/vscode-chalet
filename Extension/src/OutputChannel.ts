import * as vscode from "vscode";
import { Optional } from "./Types";

type OutputChannelError = Error & {
    logged?: boolean;
};

class OutputChannel {
    private static output: Optional<vscode.OutputChannel> = null;

    static create = (name: string): void => {
        if (OutputChannel.output === null) {
            OutputChannel.output = vscode.window.createOutputChannel(name);
        }
    };

    static log = (...args: any[]): void => {
        let line: string = "";
        // arr join, but stringifies objects
        args.forEach((value, i, arr) => {
            if (typeof value === "object") {
                line += JSON.stringify(value);
            } else {
                line += value;
            }
            if (i < arr.length - 1) {
                line += " ";
            }
        });
        if (line.length > 0) {
            OutputChannel.output?.appendLine(line);
        }
    };

    static logWithName = (text: string): void => {
        OutputChannel.output?.appendLine(`${OutputChannel.output.name}: ${text}`);
    };

    static logCommand = (text: string): void => {
        OutputChannel.output?.appendLine(`> ${text}`);
    };

    static logError = (err?: any): void => {
        if (err && !err.logged) {
            OutputChannel.output?.appendLine(`Error: ${err.message}`);
            console.error(err);
            err.logged = true;
        }
    };

    static dispose = () => {
        OutputChannel.output?.dispose();
        OutputChannel.output = null;
    };

    static setVisible = (visible: boolean) => {
        if (OutputChannel.output !== null) {
            if (visible) {OutputChannel.output.show();}
            else {OutputChannel.output.hide();}
        }
    };

    static clear = () => {
        OutputChannel.output?.clear();
    };
}

export { OutputChannel };
