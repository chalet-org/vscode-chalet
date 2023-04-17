import * as vscode from "vscode";
import * as JSONC from "comment-json";

import { CommandId, Optional } from "../../Types";
import { getWebviewNonce, getWebviewUri } from "../WebviewUtilities";
import { ChaletToolsExtension } from "../../ChaletToolsExtension";
import { formatText, css, html } from "../../Functions";

export class HelloWorldPanel {
    public static currentPanel: Optional<HelloWorldPanel> = null;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private _chaletJson: any = {};
    private _settingsJson: any = { options: {} };

    private constructor(
        panel: vscode.WebviewPanel,
        private extensionUri: vscode.Uri,
        private extension: ChaletToolsExtension
    ) {
        this._panel = panel;

        this._panel.webview.html = this.getLoadingScreen();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._setWebviewMessageListener(this._panel.webview);
    }

    private loadPanel = async () => {
        try {
            const [chaletJson, settingsJson] = await Promise.all([
                this.extension.getInputFileContents(),
                this.extension.getSettingsFileContents(false),
            ]);

            this._chaletJson = JSONC.parse(chaletJson);
            this._settingsJson = JSONC.parse(settingsJson);
            console.log(this._chaletJson);
            console.log(this._settingsJson);

            this._panel.webview.html = this.getMainSettingsScreen();
        } catch {}
    };

    public static render(extensionUri: vscode.Uri, extension: ChaletToolsExtension) {
        if (HelloWorldPanel.currentPanel) {
            HelloWorldPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
        } else {
            const panel = vscode.window.createWebviewPanel(
                CommandId.OpenProjectSettings,
                "Open Project Settings",
                vscode.ViewColumn.One,
                {
                    // Enable javascript in the webview
                    enableScripts: true,
                    // Restrict the webview to only load resources from the `out` directory
                    localResourceRoots: [vscode.Uri.joinPath(extensionUri, "out")],
                }
            );

            HelloWorldPanel.currentPanel = new HelloWorldPanel(panel, extensionUri, extension);
        }
        HelloWorldPanel.currentPanel.loadPanel();
    }

    public dispose() {
        HelloWorldPanel.currentPanel = null;

        this._panel.dispose();

        while (this._disposables.length > 0) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private getWebviewUri(webview: vscode.Webview, extensionUri: vscode.Uri) {
        return getWebviewUri(webview, extensionUri, ["out", "webview.min.js"]);
    }

    private getLoadingScreen() {
        const webview = this._panel.webview;
        const webviewUri = this.getWebviewUri(webview, this.extensionUri);
        const nonce = getWebviewNonce();

        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return html`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <meta
                        http-equiv="Content-Security-Policy"
                        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; https:;"
                    />
                    <title>Loading...</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                        }
                    </style>
                </head>
                <body>
                    <vscode-progress-ring></vscode-progress-ring>
                    <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
                </body>
            </html>
        `;
    }

    private objectToVscodeWebview(data: any, level: number = 0, parent?: string): string {
        let result: string = "";

        const entries = Object.entries(data);
        for (const [key, value] of entries) {
            const name = parent ? `${parent}.${key}` : key;
            switch (typeof value) {
                case "object": {
                    if (Array.isArray(value)) {
                    } else {
                        result += `<div class="indent">`;
                        result += `<h3>${formatText(key)}</h3>`;
                        result += this.objectToVscodeWebview(value, level + 1, name);
                        result += `</div>`;
                    }
                    break;
                }
                case "string": {
                    result += `<vscode-text-field name="${name}" size="50" value="${value}">${formatText(
                        key
                    )}</vscode-text-field>`;
                    break;
                }
                case "boolean": {
                    result += `<vscode-checkbox ${value ? "checked" : ""}>${formatText(key)}</vscode-checkbox>`;
                    break;
                }
                case "number": {
                    result += `<vscode-text-field name="${name}" size="50" value="${value}">${formatText(
                        key
                    )}</vscode-text-field>`;
                    break;
                }
                default:
                    break;
            }
        }

        return result;
    }

    private getMainSettingsScreen() {
        const webview = this._panel.webview;
        const webviewUri = this.getWebviewUri(webview, this.extensionUri);
        const nonce = getWebviewNonce();

        const body = this.objectToVscodeWebview(this._settingsJson, 0);
        const uiCss = this.getUiCss();

        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return html`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <meta
                        http-equiv="Content-Security-Policy"
                        content="default-src 'none'; style-src 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';"
                    />
                    <title>Hello World!</title>
                    <style>
                        ${uiCss}
                    </style>
                </head>
                <body>
                    <h1>Project Settings</h1>
                    ${body}
                    <!--<vscode-button id="howdy">Howdy!</vscode-button>-->

                    <script type="module" nonce="${nonce}" src="${webviewUri}"></script>
                </body>
            </html>
        `;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;
                const text = message.text;

                switch (command) {
                    case "hello":
                        vscode.window.showInformationMessage(text);
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }

    private getUiCss(): string {
        return css`
            html {
                font-size: 16px;
            }
            body {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                height: 100vh;
                width: 100vw;
            }
            div.indent {
                display: block;
                margin-left: 2rem;
            }
            vscode-text-field {
                display: block;
                margin: 1rem 0;
            }
            vscode-checkbox {
                display: block;
                margin: 1rem 0;
            }
        `;
    }
}

/*

Note: As your extension grows you will likely want to add custom styles, fonts, and/or images to your webview. If you do, you will need to update the content security policy meta tag to explicity allow for these resources. This MDN documentation provides further information on the topic. Also here's a simple example of configuring these:

private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
	return `
		// ... other markup ...
		<meta
			http-equiv="Content-Security-Policy"
			content="default-src 'none';
				style-src ${webview.cspSource};
				font-src ${webview.cspSource};
				img-src ${webview.cspSource} https:;
				script-src 'nonce-${nonce}';">
	`;
}
*/
