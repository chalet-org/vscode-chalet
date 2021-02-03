import {
    ExtensionTerminalOptions as VSCExtensionTerminalOptions,
    Terminal,
    window,
    commands,
    EventEmitter,
    Pseudoterminal,
} from "vscode";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { Dictionary } from "../Types";

// suppress:
// [DEP0005] DeprecationWarning: Buffer() is deprecated due to security and usability issues. Please use the Buffer.alloc(), Buffer.allocUnsafe(), or Buffer.from() methods instead.
// (comes from child_process)
process.removeAllListeners("warning");

type TerminalOptions = {
    name: string;
    autoClear?: boolean;
    shellPath: string;
    shellArgs?: string[];
    cwd?: string;
    env?: Dictionary<string>;
};

export class TerminalController {
    subprocess: ChildProcessWithoutNullStreams | null = null;
    writeEmitter: EventEmitter<string> = new EventEmitter<string>();

    private createTerminal = (options: VSCExtensionTerminalOptions): Terminal => {
        const { name } = options;

        let terminal: Terminal | undefined;
        if (name && typeof name === "string") {
            terminal = window.terminals.find((term) => term.name === name);
        } else {
            terminal = window.activeTerminal;
        }

        if (terminal) {
            // might be useful to do something here
        } else {
            terminal = window.createTerminal(options);
        }

        return terminal;
    };

    haltSubProcess = () => {
        if (this.subprocess) {
            if (!this.subprocess.kill("SIGINT")) {
                console.error("Couldn't kill previous process");
            }
        }
    };

    execute = async ({ autoClear, name, cwd, env, ...options }: TerminalOptions) => {
        try {
            const pty: Pseudoterminal = {
                onDidWrite: this.writeEmitter.event,
                handleInput: (data: string) => {
                    // newline characters within data get replaced with \r somewhere in terminal.sendText
                    this.writeEmitter.fire(data.replace(/\r/g, "\r\n"));
                },
                open: () => {},
                close: () => {
                    this.haltSubProcess();
                },
            };
            const terminal: Terminal = this.createTerminal({
                name,
                pty,
            });

            if (!!autoClear) {
                await commands.executeCommand("workbench.action.terminal.clear");
            }

            this.haltSubProcess();

            console.log("starting subprocess");
            console.log(cwd);
            console.log(env);

            const shellArgs: string[] = options.shellArgs ?? [];
            // console.log(options.shellPath, shellArgs.join(" "));
            this.subprocess = spawn(options.shellPath, shellArgs, { cwd: cwd ?? "", env });

            this.subprocess.stdout.on("data", (data: Buffer) => {
                console.log(data.toString());
                terminal.sendText(data.toString());
            });

            this.subprocess.stderr.on("data", (data: Buffer) => {
                console.log(data.toString());
                terminal.sendText(data.toString());
            });

            this.subprocess.on("close", (code: number, signal: NodeJS.Signals) => {
                let color: number = 37;
                terminal.sendText(`\x1b[1;${color}m\r\n${name} exited with code: ${code}\r\n\x1b[0m`);
                // pty.close();
                // terminal.dispose();
            });

            if (terminal !== window.activeTerminal) {
                terminal.show();
            }
        } catch (err) {
            console.error(err);
        }
    };
}
