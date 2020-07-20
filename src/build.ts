export const DEBUG_MODE = false;

export function consoleLog(...vars: any): any {
    if (DEBUG_MODE)
        console.log(...vars);
}
