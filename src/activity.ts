// import { ActivityAdapter } from "./adapters";
// import { PEBL } from "./pebl";

// export class Activity implements ActivityAdapter {
//     private pebl: PEBL;

//     constructor(pebl: PEBL) {
//         this.pebl = pebl;
//     }

//     // -------------------------------

//     getBook(callback: (book?: string) => void): void {
//         this.pebl.storage.getCurrentBook(callback);
//     }

//     openBook(book: string, callback: (sameBook: boolean) => void): void {
//         let self = this;
//         this.pebl.storage.getCurrentBook(function(currentBook) {
//             if (currentBook) {
//                 self.pebl.storage.saveCurrentBook(book, function() {
//                     callback(currentBook == book);
//                 });
//             } else {
//                 self.pebl.storage.saveCurrentBook(book, function() {
//                     callback(false);
//                 });
//             }
//         });

//     }

//     // -------------------------------

//     initializeToc(toc: object): void {
//         throw new Error("Method not implemented.");
//     }

//     getToc(callback: object): void {
//         throw new Error("Method not implemented.");
//     }

//     // -------------------------------

//     clearParentActivity(): void {
//         throw new Error("Method not implemented.");
//     }

//     getParentActivity(callback: (parentActivity: string) => void): void {
//         throw new Error("Method not implemented.");
//     }

//     startParentActivity(activity: string): void {
//         throw new Error("Method not implemented.");
//     }

// }
