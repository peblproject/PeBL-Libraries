import { PEBL } from "./pebl"

declare let window: any;
// declare let PeBLConfig: ({ [key: string]: any } | undefined);
// declare let PeBLReady: ((PeBL: PEBL) => void) | undefined;


window.PeBL = new PEBL(window.PeBLConfig, window.PeBLLoaded);

