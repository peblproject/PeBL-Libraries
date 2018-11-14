// import { PEBL } from "./pebl";
// import { MessageAdapter } from "./adapters";
// import { XApiStatement, Reference } from "./xapi";

// export class Messenger implements MessageAdapter {

//     // private pebl: PEBL;

//     constructor(pebl: PEBL) {
//         // this.pebl = pebl;
//     }

//     setDirectMessageHandler(callback: (messages: XApiStatement[]) => void): void {
//         throw new Error("Method not implemented.");
//     }

//     getThreads(callback: (threads: { [key: string]: ((stmts: XApiStatement[]) => void) }) => void): void {
//         // this.pebl.storage.getThread
//     }

//     unsubscribeAll(): void {
//         throw new Error("Method not implemented.");
//     }

//     subscribe(thread: string, callback: (stmts: XApiStatement[]) => void): void {
//         throw new Error("Method not implemented.");
//     }

//     setAssetNotificationHandler(callback: (stmt: XApiStatement) => void): void {
//         throw new Error("Method not implemented.");
//     }

//     queueReference(ref: Reference): void {
//         throw new Error("Method not implemented.");
//     }

// }
