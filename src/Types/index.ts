export interface ClassType<T = any> {
    new (...args: any[]): T;
}

export type Optional<T> = T | null;

export type Dictionary<T> = {
    [key: string]: T;
};

export * from "./Enums";
export * from "./Platform";
