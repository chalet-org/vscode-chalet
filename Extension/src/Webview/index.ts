import * as vscodeui from "@vscode/webview-ui-toolkit";

const vscode = acquireVsCodeApi();

vscodeui
    .provideVSCodeDesignSystem()
    .register(
        vscodeui.vsCodeButton(),
        vscodeui.vsCodeCheckbox(),
        vscodeui.vsCodeProgressRing(),
        vscodeui.vsCodeTextField()
    );

type Optional<T> = T | null;
type Listener = (...args: any[]) => void;
type ListenerCache = {
    id: string;
    event: string;
    listener: Listener;
};

class WebviewLoader {
    private listeners: ListenerCache[] = [];

    private handleHowdyClick = () => {
        vscode.postMessage({
            command: "hello",
            text: "Hey there partner! 🤠",
        });
    };

    load = () => {
        this.addElementListener<vscodeui.Button>("howdy", "click", this.handleHowdyClick);
    };

    unload = () => {
        while (this.listeners.length > 0) {
            const { id, event, listener } = this.listeners.pop()!;
            this.removeElementListener(id, event, listener);
        }
    };

    private addElementListener<T extends HTMLElement>(id: string, event: string, listener: (...args: any[]) => void) {
        const element = document.getElementById(id) as Optional<T>;
        if (element) {
            element.addEventListener(event, listener);
            this.listeners.push({ id, event, listener });
        }
    }

    private removeElementListener(id: string, event: string, listener: (...args: any[]) => void) {
        const element = document.getElementById(id);
        if (element) {
            element.removeEventListener(event, listener);
        }
    }
}

const loader = new WebviewLoader();

window.addEventListener("load", loader.load);
window.addEventListener("unload", loader.unload);
