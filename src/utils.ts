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

    initializeToc(data: { [key: string]: any }): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book) {
                        self.pebl.storage.getToc(userProfile, book,
                            function(toc: { [key: string]: any }[]): void {
                                if (toc.length == 0) {
                                    for (let section in data) {
                                        let pages = data[section];
                                        for (let pageKey in pages) {
                                            let pageMetadata = pages[pageKey];
                                            if (pageKey == "DynamicContent") {
                                                let documents = pageMetadata["documents"];
                                                for (let dynamicPageKey in documents) {
                                                    let documentMetadata = documents[dynamicPageKey];
                                                    documentMetadata["pageKey"] = dynamicPageKey;
                                                    self.pebl.storage.saveToc(userProfile, book, documentMetadata);
                                                }
                                            } else {
                                                pageMetadata.$put("pageKey", pageKey);
                                                pageMetadata.$put("section", section);
                                                self.pebl.storage.saveToc(userProfile, book, pageMetadata);
                                            }
                                        }
                                    }
                                }
                            });
                    }
                });
            }
        });
    }

    getToc(callback: (toc: { [key: string]: any }) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.getToc(userProfile, book,
                            function(entries: { [key: string]: any }[]): void {
                                let toc: { [key: string]: any } = {};
                                for (let i = 0; i < entries.length; i++) {
                                    let entry = entries[i];
                                    let sectionKey = entry["section"];
                                    if (toc[sectionKey] == null) {
                                        toc[sectionKey] = {};
                                    }
                                    let section = toc[sectionKey];
                                    if (sectionKey == "DynamicContent") {
                                        if (section["documents"] == null) {
                                            section["location"] = entry["location"];
                                            section["documents"] = {};
                                        }
                                        let dynamicSection = section["documents"];
                                        dynamicSection[entry["pageKey"]] = entry;
                                    } else
                                        section[entry["pageKey"]] = entry;
                                }
                                callback(toc);
                            });
                    else
                        callback({});
                });
            } else
                callback({});
        });
    }
}
