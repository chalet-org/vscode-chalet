import * as vscode from "vscode";
import { OutputChannel } from "../OutputChannel";
import { Optional } from "../Types";

import { CommandId } from "../Types/Enums";
import { getCommandId } from "./GetCommandId";

type ClickCallback = Optional<() => void>;

abstract class StatusBarCommand<T extends string> {
    protected value: Optional<T> = null;
    protected menu: T[] = [];

    private visible: boolean = true;
    private clickCallback: ClickCallback = null;

    protected workspaceState: vscode.Memento;
    protected item: vscode.StatusBarItem;

    private onClick = async (): Promise<void> => {
        try {
            if (this.value === null) return;

            const result = await vscode.window.showQuickPick(this.menu);
            if (result) {
                await this.setValue(result as T);
            }
            this.clickCallback?.();
        } catch (err) {
            OutputChannel.logError(err.message);
        }
    };

    constructor(protected id: CommandId, context: vscode.ExtensionContext, priority: number) {
        this.workspaceState = context.workspaceState;
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);

        const command = getCommandId(id);
        this.item.command = command;
        this.item.show();

        context.subscriptions.push(vscode.commands.registerCommand(command, this.onClick), this.item);
    }

    initialize = (defaultValue: Optional<T> = null): Thenable<void> => {
        return this.setValue(this.workspaceState.get(this.id, this.menu.length > 0 ? this.menu[0] : defaultValue));
    };

    dispose = (): void => {
        this.item.dispose();
    };

    setOnClickCallback = (value: ClickCallback) => {
        this.clickCallback = value;
    };

    setVisible = (value: boolean): void => {
        this.visible = value;

        if (this.visible) this.item.show();
        else this.item.hide();
    };

    setValue = async (value: Optional<T>): Promise<void> => {
        if (this.value === value) return;

        this.value = value;
        if (this.value !== null) {
            this.item.text = this.value;
        }
        await this.workspaceState.update(this.id, this.value);
    };

    getValue = (): Optional<T> => {
        return this.value;
    };

    resetMenu = (): void => {
        this.menu = [];
    };

    addToMenu = (item: T): void => {
        this.menu.push(item);
    };

    setMenu = async (value: T[]): Promise<void> => {
        this.menu = value;

        if (this.value === null || !this.menu.includes(this.value)) {
            if (this.menu.length > 0) {
                await this.setValue(this.menu[0]);
            } else {
                await this.setValue(null);
            }
        }
    };
}

export { StatusBarCommand };
