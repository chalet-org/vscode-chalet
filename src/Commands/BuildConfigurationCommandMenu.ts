import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { BuildConfigurations, ChaletCommands, CommandId, Optional } from "../Types";
import { StatusBarCommandMenu, ValueChangeCallback, MenuItem } from "./StatusBarCommandMenu";
import { OutputChannel } from "../OutputChannel";

type MenuType = BuildConfigurations | string;

const kDefaultMenu: MenuType[] = [
    BuildConfigurations.Debug,
    BuildConfigurations.Release,
    BuildConfigurations.RelWithDebInfo,
    BuildConfigurations.MinSizeRel,
    BuildConfigurations.Profile,
];

class BuildConfigurationCommandMenu extends StatusBarCommandMenu<MenuType> {
    constructor(onClick: ValueChangeCallback, context: vscode.ExtensionContext, priority: number) {
        super(CommandId.BuildConfiguration, onClick, context, priority);
    }

    @bind
    protected getDefaultMenu(): MenuItem<MenuType>[] {
        return kDefaultMenu.map((label) => ({
            label,
        }));
    }

    requiredForVisibility = async (command: Optional<ChaletCommands>): Promise<void> => {
        if (command === null) {
            this.setVisible(false);
            return;
        }

        const required: boolean = this.required(command);
        if (required) {
            const value = this.value ?? { label: BuildConfigurations.Invalid };
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
            let result: boolean = false;
            let configurations: any = chaletJson["configurations"];
            if (!!configurations) {
                if (Array.isArray(configurations)) {
                    await this.setMenu(
                        configurations.reduce((out: MenuItem<string>[], label) => {
                            if (typeof label === "string") {
                                if (this.defaultMenuIncludesLabel(label)) {
                                    out.push({ label });
                                }
                            }
                            return out;
                        }, [])
                    );
                    result = true;
                } else if (typeof configurations === "object") {
                    this.resetMenu();
                    for (const [label, value] of Object.entries(configurations)) {
                        let item: any = value;
                        if (item && typeof item === "object") {
                            this.addToMenu({ label });
                        }
                    }
                    result = true;
                }
            }

            if (result) {
                await this.refreshMenuAndValue();
                return true;
            }

            await this.setDefaultMenu();
            return false;
        } catch (err) {
            OutputChannel.logError(err);
            return false;
        }
    };
}

export { BuildConfigurationCommandMenu };
