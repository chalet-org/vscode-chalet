import { EXTENSION_ID } from "../ExtensionID";

export const getCommandID = (id: string) => {
    return `${EXTENSION_ID}.${id}`;
};
