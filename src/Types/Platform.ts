export enum VSCodePlatform {
    MacOS = "osx",
    Linux = "linux",
    Windows = "windows",
}

export enum ChaletPlatform {
    MacOS = "macos",
    Linux = "linux",
    Windows = "windows",
}

export function getChaletPlatform(platform: VSCodePlatform): ChaletPlatform {
    switch (platform) {
        case VSCodePlatform.MacOS:
            return ChaletPlatform.MacOS;

        default:
            return (<string>platform) as ChaletPlatform;
    }
}

export function getVSCodePlatform(platform: ChaletPlatform): VSCodePlatform {
    switch (platform) {
        case ChaletPlatform.MacOS:
            return VSCodePlatform.MacOS;

        default:
            return (<string>platform) as VSCodePlatform;
    }
}
