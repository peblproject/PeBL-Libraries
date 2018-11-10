import { XApiStatement, Reference, Message, Voided } from "./xapi";
import { SyncProcess } from "./adapters";
import { Endpoint } from "./models";
import { PEBL } from "./pebl";

export class LLSyncAction implements SyncProcess {

    private bookPoll: (number | null) = null;
    private threadPoll: (number | null) = null;

    private running: boolean = false;
    private endpoint: Endpoint;

    private pebl: PEBL;

    constructor(incomingPebl: PEBL, endpoint: Endpoint) {
        this.pebl = incomingPebl;
        this.endpoint = endpoint;

        this.pull();
    }

    private clearTimeouts(): void {
        if (this.bookPoll)
            clearTimeout(this.bookPoll);
        this.bookPoll = null;

        if (this.threadPoll)
            clearTimeout(this.threadPoll);
        this.threadPoll = null;
    }

    private toVoidRecord(rec: XApiStatement): XApiStatement {
        let o = {
            "context": {
                "contextActivities": {
                    "parent": [{
                        "id": (rec.object) ? rec.object.id : "",
                        "objectType": "Activity"
                    }]
                }
            },
            "actor": rec.actor,
            "verb": {
                "display": {
                    "en-US": "voided"
                },
                "id": "http://adlnet.gov/expapi/verbs/voided"
            },
            "object": {
                "id": rec.id,
                "objectType": "StatementRef"
            },
            "stored": rec.stored,
            "timestamp": rec.timestamp,
            "id": "v-" + rec.id
        };

        return new Voided(o);
    }

    private bookPollingCallback(): void {
        let self = this;
        this.pebl.activity.getBook(function(book) {
            if (book) {
                let lastSynced = self.endpoint.lastSyncedBooksMine[book];
                if (lastSynced == null)
                    lastSynced = new Date("2017-06-05T21:07:49-07:00");
                self.pullBook(lastSynced, book);
            } else if (self.running)
                self.bookPoll = setTimeout(self.bookPollingCallback.bind(self), 5000);
        });
    }

    private threadPollingCallback(): void {
        let self = this;
        this.pebl.messager.getThreads(function(threadCallbacks): void {
            let threadPairs: { [key: string]: any }[] = [];

            for (let thread of Object.keys(threadCallbacks)) {
                let timeStr = self.endpoint.lastSyncedThreads[thread];
                let timestamp: Date = timeStr == null ? new Date("2017-06-05T21:07:49-07:00") : timeStr;
                self.endpoint.lastSyncedThreads[thread] = timestamp;
                threadPairs.push({
                    "statement.stored": {
                        "$gt": timestamp.toISOString()
                    },
                    "statement.object.id": "peblThread://" + thread
                });
            }

            if ((threadPairs.length == 0) && self.running)
                self.threadPoll = setTimeout(self.threadPollingCallback.bind(self), 2000);
            else
                self.pullMessages({ "$or": threadPairs }, threadCallbacks);
        });
    }

    private pullHelper(pipeline: { [key: string]: any }[], callback: (stmts: XApiStatement[]) => void): void {
        let self = this;
        let request = new XMLHttpRequest();
        request.onreadystatechange = function() {
            if (request.readyState == 4) {
                if (request.status == 200) {
                    let result = JSON.parse(request.responseText);
                    for (let i = 0; i < result.length; i++) {
                        let rec = result[i]
                        if (!rec.voided)
                            result[i] = rec.statement;
                        else
                            result[i] = self.toVoidRecord(rec.statement);
                    }
                    if (callback != null) {
                        callback(result);
                    }
                }
            }
        };

        request.open("GET", self.endpoint.url + "api/statements/aggregate?pipeline=" + encodeURIComponent(JSON.stringify(pipeline)), true);

        request.setRequestHeader("Authorization", "Basic " + self.endpoint.token);
        request.setRequestHeader("Content-Type", "application/json");

        request.send();
    }

    private pullMessages(params: { [key: string]: any }, callbacks: { [thread: string]: (stmts: XApiStatement[]) => void }): void {
        let pipeline: { [key: string]: any }[] = [
            {
                "$sort": {
                    "stored": -1,
                    "_id": 1
                }
            },
            {
                "$match": params
            },
            {
                "$limit": 1500
            },
            {
                "$project": {
                    "statement": 1,
                    "_id": 0,
                    "voided": 1
                }
            }
        ];


        let self = this;
        this.pullHelper(pipeline,
            function(stmts: XApiStatement[]): void {
                let buckets: { [thread: string]: { [id: string]: XApiStatement } } = {};
                let deleteIds: Voided[] = [];

                for (let i = 0; i < stmts.length; i++) {
                    let xapi = stmts[i];
                    let thread: (string | null) = null;
                    let tsd: (XApiStatement | null) = null;

                    if (Message.is(xapi)) {
                        let m = new Message(xapi);
                        thread = m.thread;
                        tsd = m;
                    } else if (Reference.is(xapi)) {
                        let r = new Reference(xapi);
                        self.pebl.messager.queueReference(r);
                        tsd = r;
                        thread = r.thread;
                    } else if (Voided.is(xapi)) {
                        let v = new Voided(xapi);
                        deleteIds.push(v);
                        thread = v.thread;
                    }
                    if (thread != null) {
                        if (tsd != null) {
                            let stmts = buckets[thread];
                            if (stmts == null) {
                                stmts = {};
                                buckets[thread] = stmts;
                            }
                            stmts[tsd.id] = tsd;
                        }

                        let temp = new Date(xapi.stored);
                        let lastSyncedDate = self.endpoint.lastSyncedThreads[thread];
                        if (lastSyncedDate.getTime() < temp.getTime())
                            self.endpoint.lastSyncedThreads[thread] = temp;
                    }
                }

                self.pebl.user.getUser(function(userProfile) {

                    if (userProfile) {
                        for (let i = 0; i < deleteIds.length; i++) {
                            let v = deleteIds[i];
                            let thread = v.thread;
                            let bucket = buckets[thread];
                            if (bucket != null) {
                                delete bucket[v.target];
                            }

                            self.pebl.storage.removeMessage(userProfile, v.target);
                        }

                        for (let thread of Object.keys(buckets)) {
                            let bucket = buckets[thread];
                            let cleanMessages = [];
                            let cleanXAPIMessages = [];

                            for (let messageId of Object.keys(bucket)) {
                                cleanMessages.push(bucket[messageId]);
                                cleanXAPIMessages.push(bucket[messageId]);
                            }
                            cleanMessages.sort();
                            self.pebl.storage.saveMessages(userProfile, <Message[]>cleanXAPIMessages);
                            let callback = callbacks[thread];
                            if (callback != null)
                                callback(cleanMessages);
                        }

                        self.pebl.storage.saveUserProfile(userProfile);
                        if (self.running)
                            self.threadPoll = setTimeout(self.threadPollingCallback, 2000);
                    }
                });
            });
    }

    private pullBook(lastSynced: Date, book: string): void {

    }

    pull(): void {
        this.running = true;

        this.clearTimeouts();

        this.bookPollingCallback();
        this.threadPollingCallback();
    }

    push(outgoing: XApiStatement[], callback: (result: boolean) => void): void {
        throw new Error("Method not implemented.");
    }

    terminate(): void {
        this.running = false;

        this.clearTimeouts();
    }


}
