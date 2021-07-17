import * as vscode from "vscode";
import { Optional } from "../Types";
import { BuildConfigurations, ChaletCommands, CommandId } from "../Types/Enums";

import { StatusBarCommandMenu } from "./StatusBarCommandMenu";

class BuildConfigurationCommand extends StatusBarCommandMenu<BuildConfigurations | string> {
    constructor(context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildConfiguration, context, priority);
    }

    initialize = async (defaultValue: Optional<BuildConfigurations | string> = null): Promise<void> => {
        await this.setDefaults();
        return await super.initialize(defaultValue);
    };

    updateAndSetVisibility = (command: ChaletCommands): void => {
        if (this.required(command)) {
            const value = this.value ?? (this.menu.length > 0 ? this.menu[0] : BuildConfigurations.Invalid);
            this.setValue(value);
            this.setVisible(true);
        } else {
            this.setVisible(false);
        }
    };

    setDefaults = (): Promise<void> => {
        const defaults = [
            BuildConfigurations.Debug,
            BuildConfigurations.Release,
            BuildConfigurations.RelWithDebInfo,
            BuildConfigurations.MinSizeRel,
            BuildConfigurations.Profile,
        ];
        return this.setMenu(defaults);
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

    valid = (value: BuildConfigurations | string): boolean => {
        return (
            value === BuildConfigurations.Debug ||
            value === BuildConfigurations.Release ||
            value === BuildConfigurations.RelWithDebInfo ||
            value === BuildConfigurations.MinSizeRel ||
            value === BuildConfigurations.Profile
        );
    };

    refreshMenuAndValue = (): void => {
        if ((this.menu.length > 0 && this.value === null) || (this.value !== null && !this.menu.includes(this.value))) {
            this.setValue(this.menu[0]);
        }

        if (this.value !== null && this.menu.length === 0) {
            this.setValue(null);
        }
    };
}

export { BuildConfigurationCommand };
