import * as vscode from "vscode";
import { Optional } from "./Types";

class OutputChannel {
    private static output: Optional<vscode.OutputChannel> = null;

    static create = (name: string): void => {
        if (OutputChannel.output === null) {
            OutputChannel.output = vscode.window.createOutputChannel(name);
        }
    };

    static log = (text: string): void => {
        if (OutputChannel.output !== null) {
            OutputChannel.output.appendLine(text);
        }
    };

    static logWithName = (text: string): void => {
        if (OutputChannel.output !== null) {
            OutputChannel.output.appendLine(`${OutputChannel.output.name}: ${text}`);
        }
    };

    static logCommand = (text: string): void => {
        if (OutputChannel.output !== null) {
            OutputChannel.output.appendLine(`> ${text}`);
        }
    };

    static dispose = () => {
        if (OutputChannel.output !== null) {
            OutputChannel.output.dispose();
        }
        OutputChannel.output = null;
    };

    static setVisible = (visible: boolean) => {
        if (OutputChannel.output !== null) {
            if (visible) OutputChannel.output.show();
            else OutputChannel.output.hide();
        }
    };

    static clear = () => {
        if (OutputChannel.output !== null) {
            OutputChannel.output.clear();
        }
    };
}

export { OutputChannel };
