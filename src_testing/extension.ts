import * as vscode from "vscode";
import { ChaletToolsLoader } from "./ChaletToolsLoader";

interface ChaletJson {
    version: string;
    workspace: string;
    "abstracts:all": {
        language: string;
        "settings:Cxx": {
            cppStandard: string;
            warnings: string;
        };
    };
    configurations: string[];
    targets: object;
    distribution: object;
}

/*async function getDiagnostics(doc: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
    const text = doc.getText();
    const diagnostics: vscode.Diagnostic[] = [];

    let chaletJson: ChaletJson;
    try {
        chaletJson = JSON.parse(text);
    } catch {
        return diagnostics;
    }

    // const textArr: string[] = text.split(/\r\n|\n/);
    console.log(chaletJson);

    return diagnostics;
}*/

let extensionLoader: ChaletToolsLoader | null = null;

export function activate(context: vscode.ExtensionContext) {
    /*const diagnosticsCollection = vscode.languages.createDiagnosticCollection("chalet-tools");

        const handler = async (doc: vscode.TextDocument) => {
            try {
                if (!doc.fileName.endsWith("chalet.json")) {
                    return;
                }

                const diagnostics = await getDiagnostics(doc);
                diagnosticsCollection.set(doc.uri, diagnostics);
            } catch (err) {
                console.error(err);
            }
        };

        const didOpen = vscode.workspace.onDidOpenTextDocument(handler);
        const didChange = vscode.workspace.onDidChangeTextDocument((ev) => handler(ev.document));
		*/
    extensionLoader = new ChaletToolsLoader(context);

    /*if (vscode.window.activeTextEditor) {
            await handler(vscode.window.activeTextEditor.document);
        }*/

    // console.log('Congratulations, your extension "chalet-tools" is now active!');

    // context.subscriptions.push(diagnosticsCollection, didOpen, didChange);
}

// this method is called when your extension is deactivated
export function deactivate() {
    if (extensionLoader) {
        extensionLoader.deactivate();
    }
    extensionLoader = null;
}
