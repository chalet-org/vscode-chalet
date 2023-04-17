import capitalize from "capitalize";

export function formatText(rawString: string): string {
    const opts: any = { skipWord: /^(a|the|an|and|or|but|in|on|of|it)$/ };
    return capitalize.words(rawString.replace(/([A-Z])/g, " $1"), opts);
}
