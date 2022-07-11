import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { OutputChannel } from "../OutputChannel";
import { Optional, CommandId } from "../Types";
import { StatusBarCommand } from "./StatusBarCommand";

export type ValueChangeCallback = Optional<() => Promise<void>>;

export interface MenuItem<T extends string> extends vscode.QuickPickItem {
    label: T;
}

abstract class StatusBarCommandMenu<T extends string> extends StatusBarCommand {
    protected value: Optional<MenuItem<T>> = null;
    private menu: MenuItem<T>[] = [];

    protected abstract getDefaultMenu(): MenuItem<T>[];

    constructor(id: CommandId, private onClickCallback: ValueChangeCallback, context: vscode.ExtensionContext) {
        super(id, context);
    }

    @bind
    protected async onClick(): Promise<void> {
        try {
            const result = await vscode.window.showQuickPick(this.menu, {
                placeHolder: this.getTooltip(),
            });
            if (!!result) {
                await this.setValue(result);
            }
            await this.onClickCallback?.();
        } catch (err) {
            OutputChannel.logError(err);
        }
    }

    @bind
    async initialize(): Promise<void> {
        try {
            await this.setDefaultMenu();
        } catch (err) {
            OutputChannel.logError(err);
        }
    }

    getStateValue = (defaultValue: Optional<MenuItem<T>> = null): Optional<MenuItem<T>> => {
        const result = this.workspaceState.get(this.id, defaultValue);
        // OutputChannel.log(result);
        return result;
    };

    setValue = async (value: Optional<MenuItem<T>>): Promise<void> => {
        try {
            if (JSON.stringify(this.value) === JSON.stringify(value)) return;

            this.value = value;
            if (this.value !== null) {
                this.setLabel(this.value.label);
            }

            await this.workspaceState.update(this.id, this.value);
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    setValueFromString = (label: Optional<T>): Promise<void> => {
        if (label === null) {
            return this.setValue(null);
        } else if (label.length === 0 && this.menu.length > 0) {
            return this.setValue(this.menu[0]);
        } else {
            if (this.includesLabel(label)) {
                const idx = this.menu.findIndex((item) => item.label === label);
                return this.setValue(this.menu[idx]);
            } else {
                return this.setValue({
                    label,
                });
            }
        }
    };

    setFirstValueInMenu = (label: Optional<T> = null): Promise<void> => {
        if (this.menu.length > 0) {
            return this.setValue(this.menu[0]);
        } else {
            return this.setValueFromString(label);
        }
    };

    getValue = (): Optional<MenuItem<T>> => {
        return this.value;
    };

    @bind
    getLabel(): Optional<T> {
        return this.value?.label ?? null;
    }
    resetMenu = (): void => {
        this.menu = [];
    };

    addToMenu = (item: MenuItem<T>): void => {
        this.menu.push(item);
    };

    setMenu = async (value: MenuItem<T>[]): Promise<void> => {
        try {
            this.menu = value;

            if (this.value === null || !this.includesLabel(this.value.label)) {
                if (this.menu.length > 0) {
                    const firstInMenu = this.menu[0] ?? null;
                    const valueFromState = this.getStateValue(firstInMenu);
                    if (!!valueFromState && this.includesLabel(valueFromState.label)) {
                        await this.setValue(valueFromState);
                    } else {
                        await this.setValue(firstInMenu);
                    }
                } else {
                    await this.setValue(null);
                }
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    refreshMenuAndValue = async (): Promise<void> => {
        try {
            if (
                (this.value === null && this.menu.length > 0) ||
                (this.value !== null && !this.includesLabel(this.value.label))
            ) {
                await this.setValue(this.menu[0]);
            }

            if (this.value !== null && this.menu.length === 0) {
                await this.setValue(null);
            }
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    defaultMenuIncludesLabel = (value: T): boolean => {
        const defaults = this.getDefaultMenu();
        return defaults.filter((i) => i.label === value).length > 0;
    };

    includesLabel = (value: T): boolean => {
        return this.menu.filter((i) => i.label === value).length > 0;
    };

    setDefaultMenu = (): Promise<void> => {
        return this.setMenu(this.getDefaultMenu());
    };
}

export { StatusBarCommandMenu };
