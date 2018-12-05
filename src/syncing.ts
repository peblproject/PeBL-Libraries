const USER_PREFIX = "user-";
const PEBL_THREAD_PREFIX = "peblThread://";
const PEBL_THREAD_USER_PREFIX = "peblThread://" + USER_PREFIX;

import { XApiStatement, Reference, Message, Voided, Annotation, SharedAnnotation, Session, Navigation, Quiz, Question, Action } from "./xapi";
import { SyncProcess } from "./adapters";
import { Endpoint } from "./models";
import { PEBL } from "./pebl";

export class LLSyncAction implements SyncProcess {

    private bookPoll: (number | null) = null;
    private threadPoll: (number | null) = null;

    private running: boolean = false;
    private endpoint: Endpoint;

    private pebl: PEBL;

    constructor(pebl: PEBL, endpoint: Endpoint) {
        this.pebl = pebl;
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
        this.pebl.storage.getCurrentBook(function(book) {
            if (book) {
                let lastSynced = self.endpoint.lastSyncedBooksMine[book];
                if (lastSynced == null) {
                    lastSynced = new Date("2017-06-05T21:07:49-07:00");
                    self.endpoint.lastSyncedBooksMine[book] = lastSynced;
                }
                self.pullBook(lastSynced, book);
            } else if (self.running)
                self.bookPoll = setTimeout(self.bookPollingCallback.bind(self), 5000);
        });
    }

    private threadPollingCallback(): void {
        let self = this;
        let threadPairs: { [key: string]: any }[] = [];

        for (let thread of Object.keys(this.pebl.subscribedThreadHandlers)) {
            let timeStr = self.endpoint.lastSyncedThreads[thread];
            let timestamp: Date = timeStr == null ? new Date("2017-06-05T21:07:49-07:00") : timeStr;
            self.endpoint.lastSyncedThreads[thread] = timestamp;
            threadPairs.push({
                "statement.stored": {
                    "$gt": timestamp.toISOString()
                },
                "statement.object.id": PEBL_THREAD_PREFIX + thread
            });
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile && self.pebl.enableDirectMessages) {
                let directThread = PEBL_THREAD_USER_PREFIX + userProfile.identity;
                let timeStr = self.endpoint.lastSyncedThreads[directThread];
                let timestamp: Date = timeStr == null ? new Date("2017-06-05T21:07:49-07:00") : timeStr;
                self.endpoint.lastSyncedThreads[USER_PREFIX + userProfile.identity] = timestamp;

                threadPairs.push({
                    "statement.stored": {
                        "$gt": timestamp.toISOString()
                    },
                    "statement.object.id": directThread
                });
            }

            if ((threadPairs.length == 0) && self.running)
                self.threadPoll = setTimeout(self.threadPollingCallback.bind(self), 2000);
            else
                self.pullMessages({ "$or": threadPairs });
        });
    }

    private pullHelper(pipeline: { [key: string]: any }[], callback: (stmts: XApiStatement[]) => void): void {
        let self = this;
        let xhr = new XMLHttpRequest();


        xhr.addEventListener("load", function() {
            let result = JSON.parse(xhr.responseText);
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
        });

        xhr.addEventListener("error", function() {
            callback([]);
        });

        xhr.open("GET", self.endpoint.url + "api/statements/aggregate?pipeline=" + encodeURIComponent(JSON.stringify(pipeline)), true);

        xhr.setRequestHeader("Authorization", "Basic " + self.endpoint.token);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.send();
    }

    private pullMessages(params: { [key: string]: any }): void {
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
                let buckets: { [thread: string]: { [id: string]: (Message | Reference) } } = {};
                let deleteIds: Voided[] = [];

                for (let i = 0; i < stmts.length; i++) {
                    let xapi = stmts[i];
                    let thread: (string | null) = null;
                    let tsd: (Message | Reference | null) = null;

                    if (Message.is(xapi)) {
                        let m = new Message(xapi);
                        thread = m.thread;
                        tsd = m;
                    } else if (Reference.is(xapi)) {
                        let r = new Reference(xapi);
                        self.pebl.network.queueReference(r);
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
                            let cleanMessages: Message[] = [];

                            for (let messageId of Object.keys(bucket)) {
                                let rec: (Message | Reference) = bucket[messageId];
                                if (rec instanceof Message)
                                    cleanMessages.push(rec);
                            }
                            if (cleanMessages.length > 0) {
                                cleanMessages.sort();
                                self.pebl.storage.saveMessages(userProfile, cleanMessages);

                                self.pebl.emitEvent(thread, cleanMessages);
                            }
                        }

                        self.pebl.storage.saveUserProfile(userProfile);
                        if (self.running)
                            self.threadPoll = setTimeout(self.threadPollingCallback.bind(self), 2000);
                    }
                });
            });
    }

    private pullBook(lastSynced: Date, book: string): void {
        let teacherPack: { [key: string]: any } = {
            "statement.object.id": "pebl://" + book,
            "statement.stored": {
                "$gt": lastSynced.toISOString()
            }
        };

        let self = this;

        let pipeline: { [key: string]: any }[] = [
            {
                "$sort": {
                    "stored": -1,
                    "_id": 1
                }
            },
            {
                "$match": {
                    "$or": [
                        teacherPack,
                        {
                            "statement.object.id": "pebl://" + book,
                            "statement.stored": {
                                "$gt": lastSynced.toISOString()
                            },
                            "statement.verb.id": "http://adlnet.gov/expapi/verbs/shared"
                        }
                    ]
                }
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

        this.pebl.user.getUser(function(userProfile) {

            if (userProfile) {

                if (!self.pebl.teacher)
                    teacherPack["agents"] = userProfile.homePage + "|" + userProfile.identity;

                self.pullHelper(pipeline,
                    function(stmts) {
                        let annotations: { [key: string]: Annotation } = {};
                        let sharedAnnotations: { [key: string]: SharedAnnotation } = {};
                        let events: { [key: string]: any } = {};
                        let deleted = [];

                        for (let i = 0; i < stmts.length; i++) {
                            let xapi = stmts[i];

                            if (Annotation.is(xapi)) {
                                let a = new Annotation(xapi);
                                annotations[a.id] = a;
                            } else if (SharedAnnotation.is(xapi)) {
                                let a = new SharedAnnotation(xapi);
                                sharedAnnotations[a.id] = a;
                            } else if (Voided.is(xapi)) {
                                let v = new Voided(xapi);
                                deleted.push(v);
                            } else if (Session.is(xapi)) {
                                let s = new Session(xapi);
                                events[s.id] = s;
                            } else if (Action.is(xapi)) {
                                let a = new Action(xapi);
                                events[a.id] = a;
                            } else if (Navigation.is(xapi)) {
                                let a = new Navigation(xapi);
                                events[a.id] = a;
                            } else if (Quiz.is(xapi)) {
                                let q = new Quiz(xapi);
                                events[q.id] = q;
                            } else if (Question.is(xapi)) {
                                let q = new Question(xapi);
                                events[q.id] = q;
                            } else if (Reference.is(xapi)) {
                                let r = new Reference(xapi);
                                events[r.id] = r;
                                self.pebl.network.queueReference(r);
                            } else {
                                new Error("Unknown Statement type");
                            }


                            let temp = new Date(xapi.stored);
                            let lastSyncedDate = self.endpoint.lastSyncedBooksMine[book];
                            if (lastSyncedDate.getTime() < temp.getTime())
                                self.endpoint.lastSyncedBooksMine[book] = temp;
                        }

                        for (let i = 0; i < deleted.length; i++) {
                            let v = deleted[i];

                            delete annotations[v.target];
                            delete sharedAnnotations[v.target];
                            // delete events[v.target];

                            self.pebl.storage.removeAnnotation(userProfile, v.target);
                            self.pebl.storage.removeSharedAnnotation(userProfile, v.target);
                            // self.pebl.storage.removeEvent(userProfile, v.target);
                        }

                        let cleanAnnotations = [];
                        for (let id of Object.keys(annotations))
                            cleanAnnotations.push(annotations[id]);

                        if (cleanAnnotations.length > 0) {
                            cleanAnnotations.sort();
                            self.pebl.storage.saveAnnotations(userProfile, cleanAnnotations);
                            self.pebl.emitEvent(self.pebl.events.incomingAnnotations, cleanAnnotations);
                        }

                        let cleanSharedAnnotations = [];
                        for (let id of Object.keys(sharedAnnotations))
                            cleanSharedAnnotations.push(sharedAnnotations[id]);

                        if (cleanAnnotations.length > 0) {
                            cleanSharedAnnotations.sort();
                            self.pebl.storage.saveSharedAnnotations(userProfile, cleanSharedAnnotations);
                            self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, cleanSharedAnnotations);
                        }

                        let cleanEvents = [];
                        for (let id of Object.keys(events))
                            cleanEvents.push(events[id]);

                        if (cleanEvents.length > 0) {
                            cleanEvents.sort();
                            self.pebl.storage.saveEvent(userProfile, cleanEvents);
                            self.pebl.emitEvent(self.pebl.events.incomingEvents, cleanEvents);
                        }

                        self.pebl.storage.saveUserProfile(userProfile);
                        if (self.running)
                            self.threadPoll = setTimeout(self.bookPollingCallback.bind(self), 5000);
                    });
            }
        });
    }

    pull(): void {
        this.running = true;

        this.clearTimeouts();

        this.bookPollingCallback();
        this.threadPollingCallback();
    }

    push(outgoing: XApiStatement[], callback: (result: boolean) => void): void {
        let xhr = new XMLHttpRequest();

        xhr.addEventListener("load", function() {
            callback(true);
        });

        xhr.addEventListener("error", function() {
            callback(false);
        });

        xhr.open("POST", this.endpoint.url + "data/xapi/statements");
        xhr.setRequestHeader("Authorization", "Basic " + this.endpoint.token);
        xhr.setRequestHeader("X-Experience-API-Version", "1.0.3");
        xhr.setRequestHeader("Content-Type", "application/json");

        outgoing.forEach(function(rec) {
            delete rec.identity;
        })

        xhr.send(JSON.stringify(outgoing));
    }

    terminate(): void {
        this.running = false;

        this.clearTimeouts();
    }


}
