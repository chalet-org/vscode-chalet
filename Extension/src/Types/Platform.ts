import * as os from "os";

export const enum VSCodePlatform {
    MacOS = "osx",
    Linux = "linux",
    Windows = "windows",
}

export const enum ChaletPlatform {
    MacOS = "macos",
    Linux = "linux",
    Windows = "windows",
}

export function getChaletPlatformFromVSCodePlatform(platform: VSCodePlatform): ChaletPlatform {
    switch (platform) {
        case VSCodePlatform.MacOS:
            return ChaletPlatform.MacOS;

        default:
            return (<string>platform) as ChaletPlatform;
    }
}

export function getVSCodePlatformFromChaletPlatform(platform: ChaletPlatform): VSCodePlatform {
    switch (platform) {
        case ChaletPlatform.MacOS:
            return VSCodePlatform.MacOS;

        default:
            return (<string>platform) as VSCodePlatform;
    }
}

export function getVSCodePlatform(): VSCodePlatform {
    const nodePlatform = os.platform();
    if (nodePlatform === "win32") {
        return VSCodePlatform.Windows;
    } else if (nodePlatform === "darwin") {
        return VSCodePlatform.MacOS;
    } else {
        return VSCodePlatform.Linux;
    }
}

export function getHomeDirectory(): string {
    return os.homedir();
}
