import bind from "bind-decorator";
import * as vscode from "vscode";

import { getCommandID } from "../Functions";
import { CommandId, Optional } from "../Types";

let priorityRange = 7.7;

abstract class StatusBarCommand {
    protected visible: boolean = false;
    protected workspaceState: vscode.Memento;
    protected item: vscode.StatusBarItem;

    protected abstract onClick(): Promise<void>;
    protected abstract initialize(): Promise<void>;

    constructor(protected id: CommandId, context: vscode.ExtensionContext) {
        this.workspaceState = context.workspaceState;

        priorityRange = Math.round((priorityRange += 0.01) * 100) / 100;
        // console.log(priorityRange, id);

        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, priorityRange);
        this.registerCommand(id, context);
    }

    private registerCommand = (id: CommandId, context: vscode.ExtensionContext) => {
        const command = getCommandID(id);
        this.item.command = command;

        context.subscriptions.push(vscode.commands.registerCommand(command, this.onClick), this.item);
    };

    dispose = (): void => {
        this.item.dispose();
    };

    setVisible = (value: boolean): void => {
        this.visible = value;

        if (this.visible) {this.item.show();}
        else {this.item.hide();}
    };

    protected setLabel = (value: string): void => {
        this.item.text = value;
    };

    @bind
    getLabel(): Optional<string> {
        return this.item.text;
    }

    protected setTooltip = (text: string): void => {
        this.item.tooltip = text;
    };

    @bind
    getTooltip(): string {
        if (typeof this.item.tooltip === "string") {
            return this.item.tooltip;
        }
        return "";
    }
}

export { StatusBarCommand };
