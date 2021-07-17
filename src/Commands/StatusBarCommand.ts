import * as vscode from "vscode";
import { bind } from "bind-decorator";

import { getCommandId } from "../Functions";
import { Optional, CommandId } from "../Types";
import { OutputChannel } from "../OutputChannel";

type ClickCallback = Optional<() => void>;

abstract class StatusBarCommand<T extends string> {
    protected clickCallback: ClickCallback = null;

    protected visible: boolean = false;
    protected workspaceState: vscode.Memento;
    protected item: vscode.StatusBarItem;
    protected value: Optional<T> = null;

    protected abstract onClick(): Promise<void>;
    protected abstract initialize(): Promise<void>;

    constructor(protected id: CommandId, context: vscode.ExtensionContext, priority: number) {
        this.workspaceState = context.workspaceState;

        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priority);
        this.registerCommand(id, context);
    }

    private registerCommand = (id: CommandId, context: vscode.ExtensionContext) => {
        const command = getCommandId(id);
        this.item.command = command;

        context.subscriptions.push(vscode.commands.registerCommand(command, this.onClick), this.item);
    };

    dispose = (): void => {
        this.item.dispose();
    };

    @bind
    getStateValue(defaultValue: Optional<T> = null): Optional<T> {
        return this.workspaceState.get(this.id, defaultValue);
    }

    setVisible = (value: boolean): void => {
        this.visible = value;

        if (this.visible) this.item.show();
        else this.item.hide();
    };

    setValue = async (value: Optional<T>): Promise<void> => {
        try {
            if (this.value === value) return;

            this.value = value;
            if (this.value !== null) {
                this.item.text = this.value;
            }
            await this.workspaceState.update(this.id, this.value);
        } catch (err) {
            OutputChannel.logError(err);
        }
    };

    getValue = (): Optional<T> => {
        return this.value;
    };

    setOnClickCallback = (value: ClickCallback) => {
        this.clickCallback = value;
    };
}

export { StatusBarCommand };
