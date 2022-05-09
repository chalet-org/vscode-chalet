export const enum EscapeCodes {
    Backspace = "\x7F",
    CursorBack = "\x1B[D",
    DeleteChar = "\x1B[P",
    Clear = "\x1B[2J\x1B[3J\x1B[;H",
    Interrupt = "\u0003",
    // Arrow Keys
    ArrowUp = "\x1b[A",
    ArrowDown = "\x1b[B",
    ArrowRight = "\x1b[C",
    ArrowLeft = "\x1b[D",
    End = "\x1b[F",
    Home = "\x1b[H",
    Insert = "\x1b[2~",
    Delete = "\x1b[3~",
    PageUp = "\x1b[5~",
    PageDown = "\x1b[6~",
}
