export function html(strings: TemplateStringsArray, ...expr: any[]) {
    let str = "";
    strings.forEach((string, i) => {
        str += string + (expr[i] ?? "");
    });
    return str;
}
export function css(strings: TemplateStringsArray, ...expr: any[]) {
    let str = "";
    strings.forEach((string, i) => {
        str += string + (expr[i] ?? "");
    });
    return str;
}
