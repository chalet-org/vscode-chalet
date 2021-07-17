import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildConfigurations, ChaletCommands, CommandId, Optional } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";

type MenuType = BuildConfigurations | string;

class BuildConfigurationCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(onClick: ValueChangeCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildConfiguration, onClick, context, priority);
    }

    @bind
    protected getDefaultMenu(): MenuType[] {
        return [
            BuildConfigurations.Debug,
            BuildConfigurations.Release,
            BuildConfigurations.RelWithDebInfo,
            BuildConfigurations.MinSizeRel,
            BuildConfigurations.Profile,
        ];
    }

    requiredForVisibility = async (command: Optional<ChaletCommands>): Promise<void> => {
        if (command === null) return;

        const required: boolean = this.required(command);
        if (required) {
            const value = this.value ?? (this.menu.length > 0 ? this.menu[0] : BuildConfigurations.Invalid);
            await this.setValue(value);
        }

        this.setVisible(required);
    };

    required = (command: ChaletCommands): boolean => {
        return (
            command === ChaletCommands.Build ||
            command === ChaletCommands.Run ||
            command === ChaletCommands.BuildRun ||
            command === ChaletCommands.Rebuild ||
            command === ChaletCommands.Clean
        );
    };
}

export { BuildConfigurationCommandMenu };
