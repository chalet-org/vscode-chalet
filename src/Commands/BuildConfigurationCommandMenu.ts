import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildConfigurations, ChaletCommands, CommandId, Optional } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";

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
        if (command === null) {
            this.setVisible(false);
            return;
        }

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

    parseJsonConfigurations = async (chaletJson: any): Promise<boolean> => {
        try {
            let configurations: any = chaletJson["configurations"];
            if (configurations) {
                if (Array.isArray(configurations)) {
                    await this.setMenu(
                        configurations.reduce((out: string[], item) => {
                            if (typeof item === "string") {
                                if (this.isDefault(item)) {
                                    out.push(item);
                                }
                            }
                            return out;
                        }, [] as string[])
                    );
                } else if (typeof configurations === "object") {
                    this.resetMenu();
                    for (const [key, value] of Object.entries(configurations)) {
                        let item: any = value;
                        if (item && typeof item === "object") {
                            this.addToMenu(key);
                        }
                    }
                } else {
                    this.setDefaultMenu();
                    return false;
                }

                await this.refreshMenuAndValue();
                return true;
            } else {
                this.setDefaultMenu();
                return false;
            }
        } catch (err) {
            OutputChannel.logError(err);
            this.setDefaultMenu();
            return false;
        }
    };
}

export { BuildConfigurationCommandMenu };
