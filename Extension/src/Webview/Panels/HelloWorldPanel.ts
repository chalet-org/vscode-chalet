import * as vscode from "vscode";
import { CommandId } from "../../Types";
import { getWebviewNonce, getWebviewUri } from "../WebviewUtilities";

export class HelloWorldPanel {
    public static currentPanel: HelloWorldPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;

        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(extensionUri: vscode.Uri) {
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

            HelloWorldPanel.currentPanel = new HelloWorldPanel(panel, extensionUri);
        }
    }

    public dispose() {
        HelloWorldPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const webviewUri = getWebviewUri(webview, extensionUri, ["out", "webview.min.js"]);
        const nonce = getWebviewNonce();

        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
		  <!DOCTYPE html>
		  <html lang="en">
			<head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
			  <title>Hello World!</title>
			</head>
			<body>
			  <h1>Hello World!</h1>
			  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
			  <vscode-button id="howdy">Howdy!</vscode-button>

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
