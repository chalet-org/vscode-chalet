const enum ChaletFile {
    ChaletJson = "chalet.json",
    ChaletYaml = "chalet.yaml",
    LocalConfig = ".chaletrc",
    GlobalDirectory = ".chalet",
    GlobalConfig = "config.json",
}

const UNSET: string = "<unset>";

export { UNSET, ChaletFile };
