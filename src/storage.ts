import { StorageAdapter } from "./adapters";
import { XApiStatement, Reference, Message, Annotation, SharedAnnotation } from "./xapi";
import { UserProfile } from "./models";

const MASTER_INDEX = "master";
const CURRENT_BOOK = "peblCurrentBook";
const CURRENT_USER = "peblCurrentUser";
// const VERB_INDEX = "verbs";

export class IndexedDBStorageAdapter implements StorageAdapter {

    private db?: IDBDatabase;
    private invocationQueue: Function[] = [];

    constructor(callback: () => void) {
        let request = window.indexedDB.open("pebl", 12);
        let self: IndexedDBStorageAdapter = this;

        request.onupgradeneeded = function() {
            let db = request.result;

            let objectStores = db.objectStoreNames;
            for (let i = 0; i < objectStores.length; i++)
                db.deleteObjectStore(objectStores[i]);

            let eventStore = db.createObjectStore("events", { keyPath: ["identity", "id"] });
            let annotationStore = db.createObjectStore("annotations", { keyPath: ["identity", "id"] });
            let competencyStore = db.createObjectStore("competencies", { keyPath: ["url", "identity"] });
            let generalAnnotationStore = db.createObjectStore("sharedAnnotations", { keyPath: ["identity", "id"] });
            let outgoingStore = db.createObjectStore("outgoing", { keyPath: ["identity", "id"] });
            let messageStore = db.createObjectStore("messages", { keyPath: ["identity", "id"] });
            db.createObjectStore("user", { keyPath: "identity" });
            db.createObjectStore("state", { keyPath: "id" });
            db.createObjectStore("assets", { keyPath: ["identity", "id"] });
            let queuedReferences = db.createObjectStore("queuedReferences", { keyPath: ["identity", "id"] });
            let notificationStore = db.createObjectStore("notifications", { keyPath: ["identity", "id"] });
            let tocStore = db.createObjectStore("tocs", { keyPath: ["identity", "containerPath", "section", "pageKey"] });
            db.createObjectStore("lrsAuth", { keyPath: "id" });

            eventStore.createIndex(MASTER_INDEX, ["identity", "book"]);
            annotationStore.createIndex(MASTER_INDEX, ["identity", "book"]);
            competencyStore.createIndex(MASTER_INDEX, "identity");
            generalAnnotationStore.createIndex(MASTER_INDEX, ["identity", "book"]);
            outgoingStore.createIndex(MASTER_INDEX, "identity");
            messageStore.createIndex(MASTER_INDEX, ["identity", "thread"]);
            queuedReferences.createIndex(MASTER_INDEX, "identity");
            notificationStore.createIndex(MASTER_INDEX, "identity");
            tocStore.createIndex(MASTER_INDEX, ["identity", "containerPath"]);

        };

        request.onsuccess = function() {
            self.db = request.result;

            callback();
            for (let i = 0; i < self.invocationQueue.length; i++)
                self.invocationQueue[i]();
            self.invocationQueue = [];
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
        request.onsuccess = function() {
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
        if (r && (recordType == "object")) {
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

    saveSharedAnnotations(userProfile: UserProfile, stmts: (SharedAnnotation | SharedAnnotation[]), callback?: (() => void)): void {
        if (this.db) {
            if (stmts instanceof SharedAnnotation) {
                let ga = stmts;
                ga.identity = userProfile.identity;
                let request = this.db.transaction(["sharedAnnotations"], "readwrite").objectStore("sharedAnnotations").put(ga);
                request.onerror = function(e) {
                    console.log(e)
                };
                request.onsuccess = function() {
                    if (callback)
                        callback();
                };
            } else {
                let objectStore = this.db.transaction(["sharedAnnotations"], "readwrite").objectStore("sharedAnnotations");
                let stmtsCopy: SharedAnnotation[] = stmts.slice(0);
                let processCallback = function() {
                    let record: (SharedAnnotation | undefined) = stmtsCopy.pop();
                    if (record) {
                        let ga = record;
                        ga.identity = userProfile.identity;
                        let request = objectStore.put(ga);
                        request.onerror = processCallback;
                        request.onsuccess = processCallback;
                    } else {
                        if (callback)
                            callback();
                    }
                };
                processCallback();
            }
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveSharedAnnotations(userProfile, stmts, callback);
            });
        }
    }

    getSharedAnnotations(userProfile: UserProfile, book: string, callback: (stmts: SharedAnnotation[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["sharedAnnotations"], "readonly").objectStore("sharedAnnotations").index(MASTER_INDEX);
            let param = [userProfile.identity, book];
            this.getAll(index,
                IDBKeyRange.only(param),
                callback);
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getSharedAnnotations(userProfile, book, callback);
            });
        }
    }

    removeSharedAnnotation(userProfile: UserProfile, id: string, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["sharedAnnotations"], "readwrite").objectStore("sharedAnnotations").delete(IDBKeyRange.only([userProfile.identity, id]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeSharedAnnotation(userProfile, id, callback);
            });
        }
    }

    // -------------------------------

    getAnnotations(userProfile: UserProfile, book: string, callback: (stmts: Annotation[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["annotations"], "readonly").objectStore("annotations").index(MASTER_INDEX);
            let param = [userProfile.identity, book];
            this.getAll(index,
                IDBKeyRange.only(param),
                callback);
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getAnnotations(userProfile, book, callback);
            });
        }
    }

    saveAnnotations(userProfile: UserProfile, stmts: Annotation | Annotation[], callback?: (() => void)): void {
        if (this.db) {
            if (stmts instanceof Annotation) {
                let ga = stmts;
                ga.identity = userProfile.identity;
                let request = this.db.transaction(["annotations"], "readwrite").objectStore("annotations").put(ga);
                request.onerror = function(e) {
                    console.log(e);
                };
                request.onsuccess = function() {
                    if (callback)
                        callback();
                };
            } else {
                let objectStore = this.db.transaction(["annotations"], "readwrite").objectStore("annotations");
                let stmtsCopy: Annotation[] = stmts.slice(0);
                let self: IndexedDBStorageAdapter = this;
                let processCallback = function() {
                    let record: (Annotation | undefined) = stmtsCopy.pop();
                    if (record) {
                        let clone = record;
                        clone.identity = userProfile.identity;
                        let request = objectStore.put(self.cleanRecord(clone));
                        request.onerror = processCallback;
                        request.onsuccess = processCallback;
                    } else {
                        if (callback)
                            callback();
                    }
                };
                processCallback();
            }
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveAnnotations(userProfile, stmts, callback);
            });
        }
    }

    removeAnnotation(userProfile: UserProfile, id: string, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["annotations"], "readwrite").objectStore("annotations").delete(IDBKeyRange.only([userProfile.identity, id]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeAnnotation(userProfile, id, callback);
            });
        }
    }

    // -------------------------------

    removeCurrentUser(callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["state"], "readwrite").objectStore("state").delete(IDBKeyRange.only(CURRENT_USER));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeCurrentUser(callback);
            });
        }
    }

    saveCurrentUser(userProfile: UserProfile, callback?: () => void): void {
        let pack = {
            id: CURRENT_USER,
            value: userProfile.identity
        };
        if (this.db) {
            let request: IDBRequest = this.db.transaction(["state"], "readwrite").objectStore("state").put(this.cleanRecord(pack));

            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveCurrentUser(userProfile, callback);
            });
        }
    }

    getCurrentUser(callback: (userIdentity?: string) => void): void {
        if (this.db) {
            let request: IDBRequest = this.db.transaction(["state"], "readonly").objectStore("state").get(CURRENT_USER);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                let r = request.result;
                if (r != null)
                    callback(r.value);
                else
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getCurrentUser(callback);
            });
        }
    }

    // -------------------------------

    getUserProfile(userIdentity: string, callback: (userProfile?: UserProfile) => void): void {
        if (this.db) {
            let request = this.db.transaction(["user"], "readonly").objectStore("user").get(userIdentity);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                let r = request.result;
                if (r != null)
                    callback(r);
                else
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getUserProfile(userIdentity, callback);
            });
        }
    }

    saveUserProfile(userProfile: UserProfile, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["user"], "readwrite").objectStore("user").put(this.cleanRecord(userProfile));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveUserProfile(userProfile, callback);
            });
        }
    }

    // -------------------------------

    saveCurrentActivity(book: string, callback?: (() => void)): void {
        let pack = {
            value: book,
            id: CURRENT_BOOK
        };
        if (this.db) {
            let request = this.db.transaction(["state"], "readwrite").objectStore("state").put(this.cleanRecord(pack));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveCurrentActivity(book, callback);
            });
        }
    }

    getCurrentActivity(callback: (activity?: string) => void): void {
        if (this.db) {
            let request = this.db.transaction(["state"], "readonly").objectStore("state").get(CURRENT_BOOK);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                let r = request.result;
                if (callback != null) {
                    if (r != null)
                        callback(r.value);
                    else
                        callback();
                }
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getCurrentActivity(callback);
            });
        }
    }

    removeCurrentActivity(callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["state"], "readwrite").objectStore("state").delete(IDBKeyRange.only(CURRENT_BOOK));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeCurrentActivity(callback);
            });
        }
    }

    // -------------------------------

    saveCurrentBook(book: string, callback?: (() => void)): void {
        let pack = {
            value: book,
            id: CURRENT_BOOK
        };
        if (this.db) {
            let request = this.db.transaction(["state"], "readwrite").objectStore("state").put(this.cleanRecord(pack));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveCurrentBook(book, callback);
            });
        }
    }

    getCurrentBook(callback: (book?: string) => void): void {
        if (this.db) {
            let request = this.db.transaction(["state"], "readonly").objectStore("state").get(CURRENT_BOOK);
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                let r = request.result;
                if (callback != null) {
                    if (r != null)
                        callback(r.value);
                    else
                        callback();
                }
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getCurrentBook(callback);
            });
        }
    }

    // -------------------------------

    saveEvent(userProfile: UserProfile, events: (XApiStatement | XApiStatement[]), callback?: (() => void)): void {
        if (this.db) {
            if (events instanceof XApiStatement) {
                let ga = events;
                ga.identity = userProfile.identity;
                let request = this.db.transaction(["events"], "readwrite").objectStore("events").put(ga);
                request.onerror = function(e) {
                    console.log(e);
                };
                request.onsuccess = function() {
                    if (callback)
                        callback();
                };
            } else {
                let objectStore = this.db.transaction(["events"], "readwrite").objectStore("events");
                let stmtsCopy: XApiStatement[] = events.slice(0);
                let self: IndexedDBStorageAdapter = this;
                let processCallback = function() {
                    let record: (XApiStatement | undefined) = stmtsCopy.pop();
                    if (record) {
                        let clone = record;
                        clone.identity = userProfile.identity;
                        let request = objectStore.put(self.cleanRecord(clone));
                        request.onerror = processCallback;
                        request.onsuccess = processCallback;
                    } else {
                        if (callback)
                            callback();
                    }
                };
                processCallback();
            }
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveEvent(userProfile, events, callback);
            });
        }
    }

    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["events"], "readonly").objectStore("events").index(MASTER_INDEX);
            let param = [userProfile.identity, book];
            let self = this;
            self.getAll(index,
                IDBKeyRange.only(param),
                callback);
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getEvents(userProfile, book, callback);
            });
        }
    }

    // -------------------------------

    getCompetencies(userProfile: UserProfile, callback: (competencies: { [key: string]: any }) => void): void {
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
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getCompetencies(userProfile, callback);
            });
        }
    }

    saveCompetencies(userProfile: UserProfile, competencies: { [key: string]: any }, callback?: (() => void)): void {
        if (this.db) {
            let os = this.db.transaction(["competencies"], "readwrite").objectStore("competencies");
            for (let p of Object.keys(competencies)) {
                let c = competencies[p];
                c.url = p;
                c.identity = userProfile.identity;
                competencies.push(c);
            }
            let self: IndexedDBStorageAdapter = this;
            let processCallback = function() {
                if (competencies.length > 0) {
                    let record = competencies.pop();
                    let request = os.put(self.cleanRecord(record));
                    request.onerror = processCallback;
                    request.onsuccess = processCallback;
                } else {
                    if (callback)
                        callback();
                }
            };
            processCallback();
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveCompetencies(userProfile, competencies, callback);
            });
        }
    }

    // -------------------------------

    saveOutgoing(userProfile: UserProfile, stmt: XApiStatement, callback?: (() => void)): void {
        if (this.db) {
            let clone = stmt.toXAPI();
            clone.identity = userProfile.identity;
            let request = this.db.transaction(["outgoing"], "readwrite").objectStore("outgoing").put(this.cleanRecord(clone));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveOutgoing(userProfile, stmt, callback);
            });
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
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getOutgoing(userProfile, callback);
            });
        }
    }

    removeOutgoing(userProfile: UserProfile, toClear: XApiStatement[], callback?: (() => void)): void {
        if (this.db) {
            let objectStore = this.db.transaction(["outgoing"], "readwrite").objectStore("outgoing");
            let toClearCopy = toClear.slice(0);
            let processCallback = function() {
                if (toClear.length > 0) {
                    let record = toClearCopy.pop();
                    if (record) {
                        let request = objectStore.delete(IDBKeyRange.only([userProfile.identity, record.id]));
                        request.onerror = processCallback;
                        request.onsuccess = processCallback;
                    } else {
                        if (callback)
                            callback();
                    }
                }
            };
            processCallback();
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeOutgoing(userProfile, toClear, callback);
            });
        }
    }

    // -------------------------------

    saveMessages(userProfile: UserProfile, stmts: Message | Message[], callback?: (() => void)): void {
        if (this.db) {
            if (stmts instanceof Message) {
                let clone = stmts;
                clone.identity = userProfile.identity;
                let request = this.db.transaction(["messages"], "readwrite").objectStore("messages").put(this.cleanRecord(clone));
                request.onerror = function(e) {
                    console.log(e);
                };
                request.onsuccess = function() {
                    if (callback)
                        callback();
                };
            } else {
                let objectStore = this.db.transaction(["messages"], "readwrite").objectStore("messages");
                let stmtsCopy: Message[] = stmts.slice(0);
                let self: IndexedDBStorageAdapter = this;
                let processCallback = function() {
                    let record: (Message | undefined) = stmtsCopy.pop();
                    if (record) {
                        let clone = record;
                        clone.identity = userProfile.identity;
                        let request = objectStore.put(self.cleanRecord(clone));
                        request.onerror = processCallback;
                        request.onsuccess = processCallback;
                    } else if (callback)
                        callback();
                };
                processCallback();
            }
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveMessages(userProfile, stmts, callback);
            });
        }
    }

    removeMessage(userProfile: UserProfile, id: string, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["messages"], "readwrite").objectStore("messages").delete(IDBKeyRange.only([userProfile.identity, id]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeMessage(userProfile, id, callback);
            });
        }
    }

    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: Message[]) => void): void {
        if (this.db) {
            let index = this.db.transaction(["messages"], "readonly").objectStore("messages").index(MASTER_INDEX);
            this.getAll(index,
                IDBKeyRange.only([userProfile.identity, thread]),
                callback);
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getMessages(userProfile, thread, callback);
            });
        }
    }

    // -------------------------------

    saveAsset(assetId: string, data: { [key: string]: any }, callback?: (() => void)): void {
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

    getAsset(assetId: string, callback: (data: { [key: string]: any }) => void): void {
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

    saveQueuedReference(userProfile: UserProfile, ref: Reference, callback?: (() => void)): void {
        if (this.db) {
            ref.identity = userProfile.identity;
            let request = this.db.transaction(["queuedReferences"], "readwrite").objectStore("queuedReferences").put(this.cleanRecord(ref));
            request.onerror = function(e) {
                console.log(e);
            }
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveQueuedReference(userProfile, ref, callback);
            });
        }
    }

    getQueuedReference(userProfile: UserProfile, callback: (ref?: Reference) => void): void {
        if (this.db) {
            let os = this.db.transaction(["queuedReferences"], "readonly").objectStore("queuedReferences")
            let index = os.index(MASTER_INDEX);
            let request = index.openCursor(IDBKeyRange.only(userProfile.identity));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (request.result == null) {
                    let req = index.openCursor(IDBKeyRange.only([userProfile.identity]));
                    req.onerror = function(e) {
                        console.log(e);
                    };
                    req.onsuccess = function() {
                        if (callback && request.result)
                            callback(request.result.value);
                        else
                            callback();
                    };
                } else if (callback && request.result)
                    callback(request.result.value);
                else
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getQueuedReference(userProfile, callback);
            });
        }
    }

    removeQueuedReference(userProfile: UserProfile, refId: string, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["queuedReferences"], "readwrite").objectStore("queuedReferences").delete(IDBKeyRange.only([userProfile.identity, refId]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeQueuedReference(userProfile, refId, callback);
            });
        }
    }

    // -------------------------------

    saveToc(userProfile: UserProfile, book: string, data: { [key: string]: any }, callback?: (() => void)): void {
        if (this.db) {
            data.identity = userProfile.identity;
            data.book = book;
            let request = this.db.transaction(["tocs"], "readwrite").objectStore("tocs").put(this.cleanRecord(data));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveToc(userProfile, book, data, callback);
            });
        }
    }

    getToc(userProfile: UserProfile, book: string, callback: (data: { [key: string]: any }) => void): void {
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
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getToc(userProfile, book, callback);
            });
        }
    }

    removeToc(userProfile: UserProfile, book: string, section: string, id: string, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["tocs"], "readwrite").objectStore("tocs").delete(IDBKeyRange.only([userProfile.identity, book, section, id]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeToc(userProfile, book, section, id, callback);
            });
        }
    }

    // -------------------------------

    saveNotification(userProfile: UserProfile, notification: XApiStatement, callback?: (() => void)): void {
        if (this.db) {
            notification.identity = userProfile.identity;
            let request = this.db.transaction(["notifications"], "readwrite").objectStore("notifications").put(this.cleanRecord(notification));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.saveNotification(userProfile, notification, callback);
            });
        }
    }

    getNotifications(userProfile: UserProfile, callback: ((stmts: XApiStatement[]) => void)): void {
        if (this.db) {
            let os = this.db.transaction(["notifications"], "readonly").objectStore("notifications");
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
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.getNotifications(userProfile, callback);
            });
        }
    }

    removeNotification(userProfile: UserProfile, notificationId: string, callback?: (() => void)): void {
        if (this.db) {
            let request = this.db.transaction(["notifications"], "readwrite").objectStore("notifications").delete(IDBKeyRange.only([userProfile.identity, notificationId]));
            request.onerror = function(e) {
                console.log(e);
            };
            request.onsuccess = function() {
                if (callback)
                    callback();
            };
        } else {
            let self = this;
            this.invocationQueue.push(function() {
                self.removeNotification(userProfile, notificationId, callback);
            });
        }
    }

    // -------------------------------    
}
