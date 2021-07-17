import * as vscode from "vscode";

import { getCommandId } from "../Functions";
import { CommandId } from "../Types";

abstract class StatusBarCommand {
    protected label: string = "";
    protected visible: boolean = false;
    protected workspaceState: vscode.Memento;
    protected item: vscode.StatusBarItem;

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

    setVisible = (value: boolean): void => {
        this.visible = value;

        if (this.visible) this.item.show();
        else this.item.hide();
    };

    setLabel = (value: string): void => {
        this.label = value;
        this.item.text = this.label;
    };

    getLabel = (): string => {
        return this.label;
    };
}

export { StatusBarCommand };
