class IndexedDBStorageAdapter implements StorageAdapter {

    constructor(callback: () => void) {

    }

    private getAll(index: IDBIndex, query: IDBKeyRange, callback: (stmts: object[]) => void): void {
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

    private cleanRecord(r: ({ [key: string]: any } | [])): any {
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
        } else if (recordType == "array")
            for (let i = 0; i < (<any[]>r).length; i++)
                this.cleanRecord((<any[]>r)[i]);
        return r;
    }


    saveGeneralAnnotations(userProfile: UserProfile, book: string, stmts: XApiStatement | XApiStatement[]): void {
        throw new Error("Method not implemented.");
    }
    getGeneralAnnotations(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void {
        throw new Error("Method not implemented.");
    }
    removeAnnotation(userProfile: UserProfile, id: string, book: string): void {
        throw new Error("Method not implemented.");
    }
    removeGeneralAnnotation(userProfile: UserProfile, id: string, book: string): void {
        throw new Error("Method not implemented.");
    }
    saveCurrentUser(userProfile: UserProfile, callback: () => void): void {
        throw new Error("Method not implemented.");
    }
    getCurrentUser(callback: (userIdentity: string) => void): void {
        throw new Error("Method not implemented.");
    }
    getUserProfile(userIdentity: string, callback: (userProfile: UserProfile) => void): void {
        throw new Error("Method not implemented.");
    }
    saveUserProfile(userProfile: UserProfile): void {
        throw new Error("Method not implemented.");
    }
    saveCurrentBook(userProfile: UserProfile, book: string, callback: () => void): void {
        throw new Error("Method not implemented.");
    }
    getCurrentBook(callback: (book: string) => void): void {
        throw new Error("Method not implemented.");
    }
    saveEvent(userProfile: UserProfile, book: string, event: XApiStatement | XApiStatement[]): void {
        throw new Error("Method not implemented.");
    }
    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void {
        throw new Error("Method not implemented.");
    }
    getCompetencies(userProfile: UserProfile, callback: (competencies: object) => void): void {
        throw new Error("Method not implemented.");
    }
    saveCompetencies(userProfile: UserProfile, competencies: object): void {
        throw new Error("Method not implemented.");
    }
    saveOutgoing(userProfile: UserProfile, stmt: XApiStatement): void {
        throw new Error("Method not implemented.");
    }
    getOutgoing(userProfile: UserProfile, callback: (stmts: XApiStatement[]) => void): void {
        throw new Error("Method not implemented.");
    }
    clearOutgoing(userProfile: UserProfile, toClear: XApiStatement[]): void {
        throw new Error("Method not implemented.");
    }
    saveMessage(userProfile: UserProfile, stmts: XApiStatement | XApiStatement[]): void {
        throw new Error("Method not implemented.");
    }
    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: XApiStatement[]) => void): void {
        throw new Error("Method not implemented.");
    }
    saveAsset(assetId: string, data: object): void {
        throw new Error("Method not implemented.");
    }
    getAsset(assetId: string, callback: (data: object) => void): void {
        throw new Error("Method not implemented.");
    }
    saveQueuedReference(userProfile: UserProfile, ref: Reference): void {
        throw new Error("Method not implemented.");
    }
    getQueuedReference(userProfile: UserProfile, callback: (ref: Reference) => void): void {
        throw new Error("Method not implemented.");
    }
    removeQueuedReference(userProfile: UserProfile, refId: string): void {
        throw new Error("Method not implemented.");
    }
    saveToc(userProfile: UserProfile, book: string, data: object): void {
        throw new Error("Method not implemented.");
    }
    getToc(userProfile: UserProfile, book: string, callback: (data: object) => void): void {
        throw new Error("Method not implemented.");
    }
    removeToc(userProfile: UserProfile, book: string, section: string, id: string): void {
        throw new Error("Method not implemented.");
    }
    getAnnotations(userProfile: UserProfile, thread: string, callback: (stmts: XApiStatement[]) => void): void {
        throw new Error("Method not implemented.");
    }
    saveAnnotations(userProfile: UserProfile, book: string, stmts: XApiStatement | XApiStatement[]): void {
        throw new Error("Method not implemented.");
    }
}
