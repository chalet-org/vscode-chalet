import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { OutputChannel } from "../OutputChannel";
import { Optional, CommandId } from "../Types";
import { StatusBarCommand } from "./StatusBarCommand";

abstract class StatusBarCommandMenu<T extends string> extends StatusBarCommand<T> {
    protected menu: T[] = [];

    protected abstract getDefaultMenu(): T[];

    constructor(id: CommandId, context: vscode.ExtensionContext, priority: number) {
        super(id, context, priority);
    }

    @bind
    protected async onClick(): Promise<void> {
        try {
            if (this.value === null) return;

            const result = await vscode.window.showQuickPick(this.menu);
            if (result) {
                await this.setValue(result as T);
            }
            this.clickCallback?.();
        } catch (err) {
            OutputChannel.logError(err);
        }
    }

    @bind
    async initialize(defaultValue: Optional<T> = null): Promise<void> {
        try {
            await this.setDefaultMenu();
            await this.setValue(this.getStateValue(defaultValue));
        } catch (err) {
            OutputChannel.logError(err);
        }
    }

    @bind
    getStateValue(defaultValue: Optional<T> = null): Optional<T> {
        return super.getStateValue(this.menu.length > 0 ? this.menu[0] : defaultValue);
    }

    resetMenu = (): void => {
        this.menu = [];
    };

    addToMenu = (item: T): void => {
        this.menu.push(item);
    };

    setMenu = async (value: T[]): Promise<void> => {
        try {
            this.menu = value;

            if (this.value === null || !this.menu.includes(this.value)) {
                if (this.menu.length > 0) {
                    await this.setValue(this.menu[0]);
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
                (this.menu.length > 0 && this.value === null) ||
                (this.value !== null && !this.menu.includes(this.value))
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

    isDefault = (value: T): boolean => {
        const defaults = this.getDefaultMenu();
        return defaults.includes(value);
    };

    setDefaultMenu = (): Promise<void> => {
        return this.setMenu(this.getDefaultMenu());
    };
}

export { StatusBarCommandMenu };
