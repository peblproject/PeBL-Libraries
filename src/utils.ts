import { PEBL } from "./pebl";
import { XApiStatement } from "./xapi";

export class Utils {

    private pebl: PEBL;

    constructor(pebl: PEBL) {
        this.pebl = pebl;
    }

    getAnnotations(callback: (stmts: XApiStatement[]) => void) {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.getAnnotations(userProfile, book, callback);
                    else
                        callback([]);
                });
            } else
                callback([]);
        });
    }

    getSharedAnnotations(callback: (stmts: XApiStatement[]) => void) {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.getSharedAnnotations(userProfile, book, callback);
                    else
                        callback([]);
                });
            } else
                callback([]);
        });
    }
}
