import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildConfigurations, ChaletCommands, CommandId, Optional } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";
import { getChaletToolsInstance } from "../ChaletToolsLoader";

type MenuType = string;

class BuildConfigurationCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(onClick: ValueChangeCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildConfiguration, onClick, context, priority);
    }

    private getRawMenu = (): MenuType[] => getChaletToolsInstance()?.configurations ?? [];

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return this.getRawMenu().map((label) => ({
            label,
        }));
    }

    requiredForVisibility = async (command: Optional<ChaletCommands>): Promise<void> => {
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
            command === ChaletCommands.Clean
        );
    };
}

export { BuildConfigurationCommandMenu };
