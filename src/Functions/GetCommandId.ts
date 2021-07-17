import { EXTENSION_ID } from "../ExtensionID";

export function getCommandID(id: string) {
    return `${EXTENSION_ID}.${id}`;
}
