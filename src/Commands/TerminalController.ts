import { TerminalOptions as VSCTerminalOptions, window, commands, Terminal } from "vscode";

type TerminalOptions = Partial<VSCTerminalOptions> & {
    autoClear?: boolean;
};

function createTerminal(options: VSCTerminalOptions): Terminal {
    const { name } = options;

    if (name && typeof name === "string") {
        return window.terminals.find((term) => term.name === name) || window.createTerminal(options);
    }

    return window.activeTerminal || window.createTerminal(options);
}

export class TerminalController {
    async execute(cmd: string, options: TerminalOptions) {
        const { autoClear, ...terminalOptions }: TerminalOptions = {
            ...options,
            hideFromUser: true,
        };

        try {
            const terminal: Terminal = createTerminal(terminalOptions);

            terminal.sendText(cmd);

            if (terminal !== window.activeTerminal) {
                terminal.show();
            }

            if (!!autoClear) {
                await commands.executeCommand("workbench.action.terminal.clear");
            }
        } catch (err) {
            console.error(err);
        }
    }
}
