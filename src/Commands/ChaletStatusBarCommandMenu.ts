import * as vscode from "vscode";
import { Optional } from "../Types";
import { ChaletCommands, CommandId } from "../Types/Enums";
import { StatusBarCommandMenu } from "./StatusBarCommandMenu";

class ChaletStatusBarCommandMenu extends StatusBarCommandMenu<ChaletCommands> {
    constructor(context: vscode.ExtensionContext, priority: number) {
        super(CommandId.ChaletCommand, context, priority);

        this.setMenu([
            ChaletCommands.BuildRun,
            ChaletCommands.Run,
            ChaletCommands.Build,
            ChaletCommands.Rebuild,
            ChaletCommands.Clean,
            ChaletCommands.Bundle,
            ChaletCommands.Configure,
        ]);
    }

    willRun = (): boolean => {
        return this.value === ChaletCommands.Run || this.value === ChaletCommands.BuildRun;
    };

    getIcon = (): string => {
        switch (this.value) {
            case ChaletCommands.Build:
            case ChaletCommands.Rebuild:
                return "$(tools)";
            case ChaletCommands.Clean:
                return "$(trash)";
            case ChaletCommands.Bundle:
                return "$(package)";
            case ChaletCommands.Configure:
                return "$(circuit-board)";
            case ChaletCommands.Init:
                return "$(rocket)";

            case ChaletCommands.Run:
            case ChaletCommands.BuildRun:
            default:
                return "$(play)";
        }
    };

    getCliSubCommand = (label: Optional<ChaletCommands>): string => {
        const value = label ?? this.value;
        if (value === null) return "";

        switch (value) {
            case ChaletCommands.BuildRun:
                return "buildrun";
            case ChaletCommands.Run:
                return "run";
            case ChaletCommands.Build:
                return "build";
            case ChaletCommands.Rebuild:
                return "rebuild";
            case ChaletCommands.Clean:
                return "clean";
            case ChaletCommands.Bundle:
                return "bundle";
            case ChaletCommands.Configure:
                return "configure";
            case ChaletCommands.Init:
                return "init";
        }
    };
}

export { ChaletStatusBarCommandMenu };
