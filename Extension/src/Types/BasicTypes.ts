export interface ClassType<T = any> {
    new (...args: any[]): T;
}

export type Optional<T> = T | null;

export type Dictionary<T> = {
    [key: string]: T;
};

export type SemanticVersion = {
    major: number;
    minor: number;
    patch: number;
};
