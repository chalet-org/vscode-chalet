import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildConfigurations, ChaletCommands, CommandId, Optional } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

type MenuType = string;

class BuildConfigurationCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(context: vscode.ExtensionContext, onClick: ValueChangeCallback) {
        super(CommandId.BuildConfiguration, onClick, context);

        this.setTooltip("Change Build Configuration");
    }

    private getRawMenu = (): MenuType[] => getChaletToolsInstance()?.configurations ?? [];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({ label }));
    }

    updateVisibility = async (command: Optional<ChaletCommands>): Promise<void> => {
        if (command === null) {
            this.setVisible(false);
        } else {
            const required: boolean = this.required(command);
            if (required) {
                const value = this.value ?? { label: BuildConfigurations.Invalid };
                await this.setValue(value);
            }

            this.setVisible(required);
        }
    };

    required = (command: ChaletCommands): boolean => {
        return (
            command === ChaletCommands.Build ||
            command === ChaletCommands.Run ||
            command === ChaletCommands.BuildRun ||
            command === ChaletCommands.Rebuild ||
            command === ChaletCommands.Clean ||
            command === ChaletCommands.Bundle
        );
    };
}

export { BuildConfigurationCommandMenu };
