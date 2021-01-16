import * as vscode from "vscode";

const helloWorld = () => {
    vscode.window.showInformationMessage("Hello from chalet-tools!");
};

const addCommand = (context: vscode.ExtensionContext, name: string, command: (...args: any[]) => void) => {
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand(name, command);
    context.subscriptions.push(disposable);
};

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "chalet-tools" is now active!');
    addCommand(context, "chalet-tools.helloWorld", helloWorld);
}

// this method is called when your extension is deactivated
export function deactivate() {}
