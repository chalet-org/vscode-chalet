import { Dictionary, VSCodePlatform } from "../Types";

// const rootEnv: Dictionary<string> = (process.env ?? {}) as Dictionary<string>;

export const getTerminalEnv = (platform: VSCodePlatform): Dictionary<string> => {
    // let out: Dictionary<string> = JSON.parse(JSON.stringify(rootEnv)); // copies

    // Note: This used to handle terminal.integrated.env before .envs in Chalet were a thing,
    //   and before VS Code changed the way terminals were handled

    // return out;
    // return rootEnv;
    return (process.env ?? {}) as Dictionary<string>;
};
