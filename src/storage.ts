const MASTER_INDEX = "master";
const CURRENT_BOOK = "peblCurrentBook";
const CURRENT_USER = "peblCurrentUser";
const VERB_INDEX = "verbs";

class IndexedDBStorageAdapter implements StorageAdapter {

    private db: (IDBDatabase | null) = null;

    constructor(callback: () => void) {
        let request = window.indexedDB.open("pebl", 10);
        let self: IndexedDBStorageAdapter = this;

        request.onupgradeneeded = function(event) {
            let db = request.result;

            let objectStores = db.objectStoreNames;
            for (let i = 0; i < objectStores.length; i++)
                db.deleteObjectStore(objectStores[i]);

            let eventStore = db.createObjectStore("events", { keyPath: "id" });
            let annotationStore = db.createObjectStore("annotations", { keyPath: "id" });
            let competencyStore = db.createObjectStore("competencies", { keyPath: ["url", "identity"] });
            let generalAnnotationStore = db.createObjectStore("generalAnnotations", { keyPath: "id" });
            let outgoingStore = db.createObjectStore("outgoing", { keyPath: ["identity", "id"] });
            let messageStore = db.createObjectStore("messages", { keyPath: "id" });
            db.createObjectStore("user", { keyPath: "identity" });
            db.createObjectStore("state", { keyPath: "id" });
            db.createObjectStore("assets", { keyPath: "id" });
            let queuedReferences = db.createObjectStore("queuedReferences", { keyPath: ["identity", "id"] });
            let notificationStore = db.createObjectStore("notifications", { keyPath: ["identity", "id"] });
            let tocStore = db.createObjectStore("tocs", { keyPath: ["identity", "containerPath", "section", "pageKey"] });
            db.createObjectStore("lrsAuth", { keyPath: "id" });

            eventStore.createIndex(MASTER_INDEX, ["identity", "containerPath"]);
            annotationStore.createIndex(MASTER_INDEX, ["identity", "containerPath"]);
            competencyStore.createIndex(MASTER_INDEX, "identity");
            generalAnnotationStore.createIndex(MASTER_INDEX, "containerPath");
            outgoingStore.createIndex(MASTER_INDEX, "identity");
            messageStore.createIndex(MASTER_INDEX, ["identity", "thread"]);
            queuedReferences.createIndex(MASTER_INDEX, "identity");
            notificationStore.createIndex(MASTER_INDEX, "identity");
            tocStore.createIndex(MASTER_INDEX, ["identity", "containerPath"]);

        };

        request.onsuccess = function(event) {
            self.db = request.result;

            callback();
        };

        request.onerror = function(event) {

            console.log("error opening indexeddb", event);
        };
    }

    private getAll(index: IDBIndex, query: IDBKeyRange, callback: (stmts: any[]) => void): void {
        let request = index.openCursor(query);
        let result: XApiStatement[] = [];

        request.onerror = function(e) {
            console.log("Error", query, e);
        };
        request.onsuccess = function(e) {
            let r = request.result;
            if (result) {
                if (r) {
                    result.push(r.value);
                    r.continue();
                } else if (callback != null)
                    callback(result);
            } else {
                if (callback != null) {
                    if (r != null)
                        callback(r.value);
                    else
                        callback([]);
                }
            }
        };
    }

    private cleanRecord(r: ({ [key: string]: any } | [])): ({ [key: string]: any } | []) {
        let recordType: string = typeof (r);
        if (recordType == "object") {
            let rec: { [key: string]: any } = r;
            for (let p of Object.keys(r)) {
                let v = rec[p];
                let t: string = typeof (v);
                if (t == "function")
                    delete rec[p];
                else if (t == "array")
                    for (let i = 0; i < v.length; i++)
                        this.cleanRecord(v[i]);
                else if (t == "object")
                    this.cleanRecord(v);
            }
        } else if (recordType == "array") {
            let rec: any[] = (<any[]>r);
            for (let i = 0; i < rec.length; i++)
                this.cleanRecord(rec[i]);
        }
        return r;
    }

    // -------------------------------

    saveGeneralAnnotations(userProfile: UserProfile, book: string, stmts: (GeneralAnnotation | GeneralAnnotation[])): void {
        if (this.db) {
            if (stmts instanceof GeneralAnnotation) {
                let ga: GeneralAnnotation = stmts;
                let request = this.db.transaction(["generalAnnotations"], "readwrite").objectStore("generalAnnotations").put(ga);
                request.onerror = function(e) {
                    console.log(e)
                };
                request.onsuccess = function(e) {
                    // console.log(e);
                };
            } else {
                let objectStore = this.db.transaction(["generalAnnotations"], "readwrite").objectStore("generalAnnotations");
                let stmtsCopy: GeneralAnnotation[] = stmts.slice(0);
                let callback = function() {
                    let record: (GeneralAnnotation | undefined) = stmtsCopy.pop();
                    if (record) {
                        let request = objectStore.put(record);
                        request.onerror = callback;
                        request.onsuccess = callback;
                    }
                };
                callback();
            }
        }
    }

    getGeneralAnnotations(userProfile: UserProfile, book: string, callback: (stmts: GeneralAnnotation[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["generalAnnotations"], "readonly").objectStore("generalAnnotations").index(MASTER_INDEX);
            let param = book;
            let self = this;
            this.getAll(index,
                IDBKeyRange.only(param),
                function(arr) {
                    if (arr.length == 0)
                        self.getAll(index,
                            IDBKeyRange.only([param]),
                            callback);
                    else
                        callback(arr);
                });
        }
    }

    removeGeneralAnnotation(userProfile: UserProfile, id: string, book: string): void {
        if (this.db) {
            let request = this.db.transaction(["generalAnnotations"], "readwrite").objectStore("generalAnnotations").delete(IDBKeyRange.only(id));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    // -------------------------------

    getAnnotations(userProfile: UserProfile, book: string, callback: (stmts: Annotation[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["annotations"], "readonly").objectStore("annotations").index(MASTER_INDEX);
            let param = book;
            let self = this;
            this.getAll(index,
                IDBKeyRange.only(param),
                function(arr) {
                    if (arr.length == 0)
                        self.getAll(index,
                            IDBKeyRange.only([param]),
                            callback);
                    else
                        callback(arr);
                });
        }
    }

    saveAnnotations(userProfile: UserProfile, book: string, stmts: Annotation | Annotation[]): void {
        if (this.db) {
            if (stmts instanceof Annotation) {
                let ga: GeneralAnnotation = stmts;
                let request = this.db.transaction(["annotations"], "readwrite").objectStore("annotations").put(ga);
                request.onerror = function(e) {
                    console.log(e);
                };
                request.onsuccess = function(e) {
                    // console.log(e);
                };
            } else {
                let objectStore = this.db.transaction(["annotations"], "readwrite").objectStore("annotations");
                let stmtsCopy: Annotation[] = stmts.slice(0);
                let self: IndexedDBStorageAdapter = this;
                let callback = function() {
                    let record: (Annotation | undefined) = stmtsCopy.pop();
                    if (record) {
                        let request = objectStore.put(self.cleanRecord(record.toObject()));
                        request.onerror = callback;
                        request.onsuccess = callback;
                    }
                };
                callback();
            }
        }

    }

    removeAnnotation(userProfile: UserProfile, id: string, book: string): void {
        if (this.db) {
            let request = this.db.transaction(["annotations"], "readwrite").objectStore("annotations").delete(IDBKeyRange.only(id));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    // -------------------------------

    saveCurrentUser(userProfile: UserProfile, callback: () => void): void {
        let pack = {
            id: CURRENT_USER,
            value: userProfile.identity
        };
        if (this.db) {
            let request: IDBRequest = this.db.transaction(["state"], "readwrite").objectStore("state").put(this.cleanRecord(pack));

            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                if (callback)
                    callback();
            };
        }
    }

    getCurrentUser(callback: (userIdentity: (string | null)) => void): void {
        if (this.db) {
            let request: IDBRequest = this.db.transaction(["state"], "readonly").objectStore("state").get(CURRENT_USER);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                let r = request.result;
                if (r != null)
                    callback(r.value);
                else
                    callback(null);
            };
        }
    }

    // -------------------------------

    getUserProfile(userIdentity: string, callback: (userProfile: (UserProfile | null)) => void): void {
        if (this.db) {
            let request = this.db.transaction(["user"], "readonly").objectStore("user").get(userIdentity);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                let r = request.result;
                if (r != null)
                    callback(r.value);
                else
                    callback(null);
            };
        }
    }

    saveUserProfile(userProfile: UserProfile): void {
        if (this.db) {
            let request = this.db.transaction(["user"], "readwrite").objectStore("user").put(this.cleanRecord(userProfile));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                // console.log(e);
            };
        }
    }

    // -------------------------------

    saveCurrentBook(book: string): void {
        let pack = {
            value: book,
            id: CURRENT_BOOK
        };
        if (this.db) {
            let request = this.db.transaction(["state"], "readwrite").objectStore("state").put(this.cleanRecord(pack));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                console.log(e);
            };
        }
    }

    getCurrentBook(callback: (book: (string | null)) => void): void {
        if (this.db) {
            let request = this.db.transaction(["state"], "readonly").objectStore("state").get(CURRENT_BOOK);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                let r = request.result;
                if (callback != null) {
                    if (r != null)
                        callback(r.value);
                    else
                        callback(null);
                }
            };
        }
    }

    // -------------------------------

    saveEvent(userProfile: UserProfile, book: string, events: xEvent | xEvent[]): void {
        if (this.db) {
            if (events instanceof xEvent) {
                let ga: xEvent = events;
                let request = this.db.transaction(["events"], "readwrite").objectStore("events").put(ga);
                request.onerror = function(e) {
                    console.log(e);
                };
                request.onsuccess = function(e) {
                    // console.log(e);
                };
            } else {
                let objectStore = this.db.transaction(["events"], "readwrite").objectStore("events");
                let stmtsCopy: xEvent[] = events.slice(0);
                let self: IndexedDBStorageAdapter = this;
                let callback = function() {
                    let record: (xEvent | undefined) = stmtsCopy.pop();
                    if (record) {
                        let request = objectStore.put(self.cleanRecord(record.toObject()));
                        request.onerror = callback;
                        request.onsuccess = callback;
                    }
                };
                callback();
            }
        }
    }

    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["events"], "readonly").objectStore("events").index(MASTER_INDEX);
            let param = book;
            let self = this;
            this.getAll(index,
                IDBKeyRange.only(param),
                function(arr) {
                    if (arr.length == 0)
                        self.getAll(index,
                            IDBKeyRange.only([param]),
                            callback);
                    else
                        callback(arr);
                });
        }
    }

    // -------------------------------

    getCompetencies(userProfile: UserProfile, callback: (competencies: object) => void): void {
        if (this.db) {
            let os = this.db.transaction(["competencies"], "readonly").objectStore("competencies");
            let index = os.index(MASTER_INDEX);
            let param = userProfile.identity;
            let self = this;
            this.getAll(index,
                IDBKeyRange.only(param),
                function(arr) {
                    if (arr.length == 0)
                        self.getAll(index,
                            IDBKeyRange.only([param]),
                            callback);
                    else
                        callback(arr);
                });
        }
    }

    saveCompetencies(userProfile: UserProfile, competencies: { [key: string]: any }): void {
        if (this.db) {
            let os = this.db.transaction(["competencies"], "readwrite").objectStore("competencies");
            for (let p of Object.keys(competencies)) {
                let c = competencies[p];
                c.url = p;
                c.identity = userProfile.identity;
                competencies.push(c);
            }
            let self: IndexedDBStorageAdapter = this;
            let callback = function() {
                if (competencies.length > 0) {
                    let record = competencies.pop();
                    let request = os.put(self.cleanRecord(record));
                    request.onerror = callback;
                    request.onsuccess = callback;
                }
            };
            callback();
        }
    }

    // -------------------------------

    saveOutgoing(userProfile: UserProfile, stmt: XApiStatement): void {
        if (this.db) {
            let request = this.db.transaction(["outgoing"], "readwrite").objectStore("outgoing").put(this.cleanRecord(stmt));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    getOutgoing(userProfile: UserProfile, callback: (stmts: XApiStatement[]) => void): void {
        if (this.db) {
            let os = this.db.transaction(["outgoing"], "readonly").objectStore("outgoing");
            let index = os.index(MASTER_INDEX);
            let param = userProfile.identity;
            let self = this;
            this.getAll(index,
                IDBKeyRange.only(param),
                function(arr) {
                    if (arr.length == 0)
                        self.getAll(index,
                            IDBKeyRange.only([param]),
                            callback);
                    else
                        callback(arr);
                });
        }
    }

    clearOutgoing(userProfile: UserProfile, toClear: XApiStatement[]): void {
        if (this.db) {
            let objectStore = this.db.transaction(["outgoing"], "readwrite").objectStore("outgoing");
            let toClearCopy = toClear.slice(0);
            let callback = function() {
                if (toClear.length > 0) {
                    let record = toClearCopy.pop();
                    if (record) {
                        let request = objectStore.delete(IDBKeyRange.only([userProfile.identity, record.id]));
                        request.onerror = callback;
                        request.onsuccess = callback;
                    }
                }
            };
            callback();
        }
    }

    // -------------------------------

    saveMessage(userProfile: UserProfile, stmts: Message | Message[]): void {
        if (this.db) {
            if (stmts instanceof Message) {
                let request = this.db.transaction(["messages"], "readwrite").objectStore("messages").put(this.cleanRecord(stmts));
                request.onerror = function(e) {
                    console.log(e);
                };
                request.onsuccess = function(e) {
                    //console.log(e);
                };
            } else {
                let objectStore = this.db.transaction(["messages"], "readwrite").objectStore("messages");
                let stmtsCopy: Message[] = stmts.slice(0);
                let self: IndexedDBStorageAdapter = this;
                let callback = function() {
                    let record: (Message | undefined) = stmtsCopy.pop();
                    if (record) {
                        let request = objectStore.put(self.cleanRecord(record.toObject()));
                        request.onerror = callback;
                        request.onsuccess = callback;
                    }
                };
                callback();
            }
        }
    }

    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: XApiStatement[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["messages"], "readonly").objectStore("messages").index(MASTER_INDEX);
            this.getAll(index,
                IDBKeyRange.only([userProfile.identity, thread]),
                callback);
        }
    }

    // -------------------------------

    saveAsset(assetId: string, data: object): void {
        // data.id = id;
        // data.content = new Blob([data.content.response], { type: data.content.getResponseHeader("Content-Type") });
        // let request = this.db.transaction(["assets"], "readwrite").objectStore("assets").put(cleanRecord(data));
        // request.onerror = function(e) {
        //     // console.log(e);
        // };
        // request.onabort = function(e) {
        //     console.log("Abort", query, e);
        // };
        // request.onsuccess = function(e) {
        //     // console.log(e);
        // };
        throw new Error("Method not implemented.");
    }

    getAsset(assetId: string, callback: (data: object) => void): void {
        // let request = this.db.transaction(["assets"], "readonly").objectStore("assets").get(id);
        // request.onerror = function(e) {
        //     //console.log(e);
        // };
        // request.onsuccess = function(e) {
        //     if (callback != null)
        //         callback(e.target.result);
        // };
        throw new Error("Method not implemented.");
    }

    // -------------------------------

    saveQueuedReference(userProfile: UserProfile, ref: Reference): void {
        if (this.db) {
            let request = this.db.transaction(["queuedReferences"], "readwrite").objectStore("queuedReferences").put(this.cleanRecord(ref));
            request.onerror = function(e) {
                console.log(e);
            }
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    getQueuedReference(userProfile: UserProfile, callback: (ref: (Reference | null)) => void): void {
        if (this.db) {
            let os = this.db.transaction(["queuedReferences"], "readonly").objectStore("queuedReferences")
            let index = os.index(MASTER_INDEX);
            let request = index.openCursor(IDBKeyRange.only(userProfile.identity));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                if (request.result == null) {
                    let req = index.openCursor(IDBKeyRange.only([userProfile.identity]));
                    req.onerror = function(e) {

                    };
                    req.onsuccess = function(e) {
                        if (callback && request.result)
                            callback(request.result.value);
                        else
                            callback(null);
                    };
                } else if (callback && request.result)
                    callback(request.result.value);
                else
                    callback(null);
            };
        }
    }

    removeQueuedReference(userProfile: UserProfile, refId: string): void {
        if (this.db) {
            let request = this.db.transaction(["queuedReferences"], "readwrite").objectStore("queuedReferences").delete(IDBKeyRange.only([userProfile.identity, refId]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    // -------------------------------

    saveToc(userProfile: UserProfile, book: string, data: object): void {
        if (this.db) {
            let request = this.db.transaction(["tocs"], "readwrite").objectStore("tocs").put(this.cleanRecord(data));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    getToc(userProfile: UserProfile, book: string, callback: (data: object) => void): void {
        if (book == null) {
            callback([]);
            return;
        }

        if (this.db) {
            let os = this.db.transaction(["tocs"], "readonly").objectStore("tocs");
            let index = os.index(MASTER_INDEX);
            this.getAll(index,
                IDBKeyRange.only([userProfile.identity, book]),
                callback);
        }
    }

    removeToc(userProfile: UserProfile, book: string, section: string, id: string): void {
        if (this.db) {
            let request = this.db.transaction(["tocs"], "readwrite").objectStore("tocs").delete(IDBKeyRange.only([userProfile.identity, book, section, id]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function(e) {
                //console.log(e);
            };
        }
    }

    // -------------------------------
}
