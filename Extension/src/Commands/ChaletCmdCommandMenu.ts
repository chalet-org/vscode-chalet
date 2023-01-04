import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { Optional, ChaletCommands, CommandId } from "../Types";
import { MenuItem, StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";

const kDefaultMenu: ChaletCommands[] = [
    ChaletCommands.BuildRun,
    ChaletCommands.Run,
    ChaletCommands.Build,
    ChaletCommands.Rebuild,
    ChaletCommands.Clean,
    ChaletCommands.Bundle,
    ChaletCommands.Configure,
];

class ChaletCmdCommandMenu extends StatusBarCommandMenu<ChaletCommands> {
    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.ChaletCommand, onClick, context);

        this.setTooltip("Change Chalet Command");
    }

    @bind
    protected getDefaultMenu(): MenuItem<ChaletCommands>[] {
        return kDefaultMenu.map((label) => ({ label }));
    }

    isConfigure = (): boolean => {
        return !!this.value && this.value.label === ChaletCommands.Configure;
    };

    willRun = (): boolean => {
        return (
            !!this.value && (this.value.label === ChaletCommands.Run || this.value.label === ChaletCommands.BuildRun)
        );
    };

    getIcon = (): string => {
        switch (this.value?.label) {
            case ChaletCommands.Build:
            case ChaletCommands.Rebuild:
                return "tools";
            case ChaletCommands.Clean:
                return "trash";
            case ChaletCommands.Bundle:
                return "package";
            case ChaletCommands.Configure:
                return "circuit-board";
            case ChaletCommands.Init:
                return "rocket";

            case ChaletCommands.Run:
            case ChaletCommands.BuildRun:
            default:
                return "play";
        }
    };

    getCliSubCommand = (label: Optional<ChaletCommands>): string => {
        const value = label ?? this.value?.label ?? null;
        if (value === null) {
            return "";
        }

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
            case ChaletCommands.Export:
                return "export";
            case ChaletCommands.TestTerminal:
                return "termtest";
        }
    };
}

export { ChaletCmdCommandMenu };
