const USER_PREFIX = "user-";
const GROUP_PREFIX = "group-";
const PEBL_THREAD_PREFIX = "peblThread://";
// const PEBL_THREAD_REGISTRY = "peblThread://registry";
const PEBL_THREAD_USER_PREFIX = "peblThread://" + USER_PREFIX;
const PEBL_THREAD_GROUP_PREFIX = "peblThread://" + GROUP_PREFIX;
const THREAD_POLL_INTERVAL = 4000;
const BOOK_POLL_INTERVAL = 6000;
// const PRESENCE_POLL_INTERVAL = 120000;
// const LEARNLET_POLL_INTERVAL = 60000;
const PROGRAM_POLL_INTERVAL = 60000;
const INSTITUTION_POLL_INTERVAL = 60000;
const SYSTEM_POLL_INTERVAL = 60000;

import { XApiStatement, Reference, Message, Voided, Annotation, SharedAnnotation, Session, Navigation, Quiz, Question, Action, Membership, ProgramAction, ModuleRating, ModuleFeedback, ModuleExample, ModuleExampleRating, ModuleExampleFeedback } from "./xapi";
import { SyncProcess } from "./adapters";
import { Endpoint, TempMembership } from "./models";
import { PEBL } from "./pebl";
import { Activity, Program, Learnlet, Presence, Institution, System } from "./activity";

export class LLSyncAction implements SyncProcess {

    private bookPoll: (number | null) = null;
    private threadPoll: (number | null) = null;
    private activityPolls: { [key: string]: number } = {};

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

        for (let key in this.activityPolls)
            clearTimeout(this.activityPolls[key]);
        this.activityPolls = {};
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

    // private retrieveActivityListing(activity: string, since: Date): void {
    //     let self = this;
    //     let presence = new XMLHttpRequest();

    //     presence.addEventListener("load", function() {
    //         // self.pebl.emitEvent(self.pebl.events.incomingPresence, JSON.parse(presence.responseText));

    //         // if (self.running)
    //         //     self.activityPoll = setTimeout(self.registerPresence.bind(self), PRESENCE_POLL_INTERVAL);
    //     });

    //     presence.addEventListener("error", function() {
    //         // if (self.running)
    //         //     self.activityPoll = setTimeout(self.registerPresence.bind(self), PRESENCE_POLL_INTERVAL);
    //     });

    //     presence.open("GET", self.endpoint.url + "data/xapi/activities/profile?activityId=" + encodeURIComponent(PEBL_THREAD_PREFIX + activity + "s") + "&since=" + since.toISOString(), true);
    //     presence.setRequestHeader("X-Experience-API-Version", "1.0.3");
    //     presence.setRequestHeader("Authorization", "Basic " + self.endpoint.token);
    //     //TODO fix if-match for post merging

    //     presence.send();
    // }

    pullActivity(activity: string, profileId?: string | Array<string>, callback?: ((activity?: Activity) => void)): void {
        let self = this;
        let presence = new XMLHttpRequest();
        let profileIdToUse;

        presence.addEventListener("load", function() {
            if ((presence.status >= 200) && (presence.status <= 209)) {
                let activityEvent: (string | undefined);
                let activityObj: Activity[];
                let jsonObj = JSON.parse(presence.responseText);
                if (activity == "program" && Program.is(jsonObj)) {
                    activityEvent = self.pebl.events.incomingProgram;
                    let p = new Program(jsonObj);
                    let s: string | null = presence.getResponseHeader("etag");
                    if (s) {
                        p.etag = s;
                    }
                    activityObj = [p];
                    // If passed an array of profileIds, pull them one by one.
                    if (profileId && Array.isArray(profileId) && profileId.length > 0) {
                        self.pullActivity(activity, profileId, callback);
                    }
                } else if (activity == "program" && Array.isArray(jsonObj)) {
                    // First call without a profileId returns an array of all profileIds, use that to start getting them one by one.
                    // FIXME: this should be a separate code path
                    self.pullActivity(activity, jsonObj, callback);
                    if (callback)
                        callback(jsonObj as any);
                    return;
                } else if (activity == "learnlet" && Learnlet.is(jsonObj)) {
                    activityEvent = self.pebl.events.incomingLearnlet;
                    let l = new Learnlet(jsonObj);
                    activityObj = [l];
                    let s: string | null = presence.getResponseHeader("etag");
                    if (s) {
                        l.etag = s;
                    }
                } else if (activity == "presence" && Presence.is(jsonObj)) {
                    activityEvent = self.pebl.events.incomingPresence;
                    let p = new Presence(jsonObj);
                    activityObj = [p];
                    let s: string | null = presence.getResponseHeader("etag");
                    if (s) {
                        p.etag = s;
                    }
                } else if (activity == "institution" && Institution.is(jsonObj)) {
                    activityEvent = self.pebl.events.incomingInstitution;
                    let i = new Institution(jsonObj);
                    activityObj = [i];
                    let s: string | null = presence.getResponseHeader("etag");
                    if (s) {
                        i.etag = s;
                    }
                } else if (activity == "system" && System.is(jsonObj)) {
                    activityEvent = self.pebl.events.incomingSystem;
                    let sys = new System(jsonObj);
                    activityObj = [sys];
                    let s: string | null = presence.getResponseHeader("etag");
                    if (s) {
                        sys.etag = s;
                    }
                } else {
                    console.log(jsonObj);
                    activityObj = [];
                    new Error("Missing activity type dispatch or invalid response");
                }

                if (activityEvent) {
                    self.pebl.user.getUser(function(userProfile) {
                        if (userProfile) {
                            if (activity == "program") {
                                self.pebl.storage.saveActivity(userProfile, activityObj[0])
                            } else if (activity == "learnlet") {

                            } else if (activity == "presense") {

                            } else if (activity == "institution") {
                                self.pebl.storage.saveActivity(userProfile, activityObj[0]);
                            } else if (activity == "system") {
                                self.pebl.storage.saveActivity(userProfile, activityObj[0]);
                            }

                            if (activityEvent) {
                                self.pebl.emitEvent(activityEvent, activityObj);
                            }
                        }
                    })
                }

                if (callback) {
                    if (activityObj && activityObj.length > 0) {
                        callback(activityObj[0])
                    }
                    else
                        callback();
                }
            } else {
                console.log("Failed to pull", activity);
                if (callback) {
                    callback();
                }
            }
        });

        presence.addEventListener("error", function() {
            console.log("Failed to pull", activity);
            if (callback) {
                callback();
            }
        });

        if (profileId) {
            if (Array.isArray(profileId)) {
                profileIdToUse = profileId.pop();
            } else {
                profileIdToUse = profileId;
            }
        }

        presence.open("GET", self.endpoint.url + "data/xapi/activities/profile?activityId=" + encodeURIComponent(PEBL_THREAD_PREFIX + activity + "s") + (profileIdToUse ? ("&profileId=" + encodeURIComponent(profileIdToUse)) : '') + "&t=" + Date.now(), true);
        presence.setRequestHeader("X-Experience-API-Version", "1.0.3");
        presence.setRequestHeader("Authorization", "Basic " + self.endpoint.token);

        presence.send();
    }

    private postActivity(activity: Activity, callback: ((success: boolean, oldActivity?: Activity, newActivity?: Activity) => void)) {
        let xhr = new XMLHttpRequest();
        let self = this;

        let jsObj: (string | null) = null;
        if (Program.is(activity)) {
            activity = new Program(activity);
            jsObj = JSON.stringify(activity.toTransportFormat());
        } else if (Learnlet.is(activity)) {
            activity = new Learnlet(activity);
            jsObj = JSON.stringify(new Learnlet(activity).toTransportFormat());
        } else if (Institution.is(activity)) {
            activity = new Institution(activity);
            jsObj = JSON.stringify(activity.toTransportFormat());
        } else if (System.is(activity)) {
            activity = new System(activity);
            jsObj = JSON.stringify(activity.toTransportFormat());
        } else
            new Error("Unknown activity format");

        xhr.addEventListener("load", function() {
            if (xhr.status === 412) {
                // There is a newer version on the server
                console.log('Receieved a 412');
                activity.clearDirtyEdits();

                self.pullActivity(activity.type, activity.id, function(newActivity) {
                    self.pebl.emitEvent(self.pebl.events.saveProgramConflict, newActivity);
                    callback(false, activity, newActivity);
                });
            } else {
                activity.clearDirtyEdits();
                self.pullActivity(activity.type, activity.id, function() {
                    self.pebl.emitEvent(self.pebl.events.saveProgramSuccess, activity);
                    callback(true);
                });
            }
        });

        xhr.addEventListener("error", function() {
            self.pullActivity(activity.type, activity.id, function() {
                self.pebl.emitEvent(self.pebl.events.saveProgramError, activity);
                callback(false);
            });
        });

        xhr.open("POST", self.endpoint.url + "data/xapi/activities/profile?activityId=" + encodeURIComponent(PEBL_THREAD_PREFIX + activity.type + "s") + "&profileId=" + activity.id, true);

        if (activity.etag) {
            xhr.setRequestHeader("If-Match", activity.etag);
        }
        xhr.setRequestHeader("X-Experience-API-Version", "1.0.3");
        xhr.setRequestHeader("Authorization", "Basic " + self.endpoint.token);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.send(jsObj);
    }

    private deleteActivity(activity: Activity, callback: ((success: boolean, oldActivity?: Activity, newActivity?: Activity) => void)) {
        let xhr = new XMLHttpRequest();
        let self = this;

        if (!Program.is(activity) && !Learnlet.is(activity) && !Institution.is(activity) && !System.is(activity)) {
            new Error("Unknown activity format");
        }

        xhr.addEventListener("load", function() {
            if (xhr.status === 412) {
                console.log('CONFLICT DURING DELETE: RETRYING');
                self.pullActivity(activity.type, activity.id, function(newActivity) {
                    callback(false, activity, newActivity);
                });
            } else {
                callback(true);
            }
        });

        xhr.addEventListener("error", function() {
            callback(false);
        });

        xhr.open("DELETE", self.endpoint.url + "data/xapi/activities/profile?activityId=" + encodeURIComponent(PEBL_THREAD_PREFIX + activity.type + "s") + "&profileId=" + activity.id, true);

        if (activity.etag) {
            xhr.setRequestHeader("If-Match", activity.etag);
        }
        xhr.setRequestHeader("X-Experience-API-Version", "1.0.3");
        xhr.setRequestHeader("Authorization", "Basic " + self.endpoint.token);

        xhr.send();
    }

    // private registerPresence(): void {
    //     let self = this;
    //     let xhr = new XMLHttpRequest();

    //     this.pebl.user.getUser(function(userProfile) {
    //         if (userProfile) {
    //             xhr.addEventListener("load", function() {
    //                 self.retrievePresence();
    //             });

    //             xhr.addEventListener("error", function() {
    //                 if (self.running)
    //                     self.activityPoll = setTimeout(self.registerPresence.bind(self), PRESENCE_POLL_INTERVAL);
    //             });

    //             xhr.open("POST", self.endpoint.url + "data/xapi/activities/profile?activityId=" + encodeURIComponent(PEBL_THREAD_REGISTRY) + "&profileId=Registration", true);

    //             xhr.setRequestHeader("X-Experience-API-Version", "1.0.3");
    //             xhr.setRequestHeader("Authorization", "Basic " + self.endpoint.token);
    //             xhr.setRequestHeader("Content-Type", "application/json");

    //             let obj: { [key: string]: any } = {};

    //             obj[userProfile.identity] = true;

    //             xhr.send(JSON.stringify(obj));
    //         } else if (self.running)
    //             self.activityPoll = setTimeout(self.registerPresence.bind(self), PRESENCE_POLL_INTERVAL);
    //     });
    // }

    // private unregisterPresence(): void {
    //     let self = this;
    //     let xhr = new XMLHttpRequest();

    //     this.pebl.user.getUser(function(userProfile) {

    //         if (userProfile) {
    //             xhr.open("POST", self.endpoint.url + "data/xapi/activities/profile?activityId=" + encodeURIComponent(PEBL_THREAD_REGISTRY) + "&profileId=Registration", true);

    //             xhr.setRequestHeader("X-Experience-API-Version", "1.0.3");
    //             xhr.setRequestHeader("Authorization", "Basic " + self.endpoint.token);
    //             xhr.setRequestHeader("Content-Type", "application/json");

    //             let obj: { [key: string]: any } = {};

    //             obj[userProfile.identity] = false;

    //             xhr.send(JSON.stringify(obj));
    //         }
    //     });
    // }

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
                self.bookPoll = setTimeout(self.bookPollingCallback.bind(self), BOOK_POLL_INTERVAL);
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

        this.pebl.utils.getGroupMemberships(function(memberships) {
            if (memberships) {
                let addedMemberships: { [key: string]: boolean } = {};
                for (let membership of memberships) {
                    let fullDirectThread = PEBL_THREAD_GROUP_PREFIX + membership.membershipId;
                    if (!addedMemberships[fullDirectThread]) {
                        addedMemberships[fullDirectThread] = true;
                        let thread = GROUP_PREFIX + membership.thread;
                        let timeStr = self.endpoint.lastSyncedThreads[thread];
                        let timestamp: Date = timeStr == null ? new Date("2017-06-05T21:07:49-07:00") : timeStr;
                        self.endpoint.lastSyncedThreads[thread] = timestamp;

                        threadPairs.push({
                            "statement.stored": {
                                "$gt": timestamp.toISOString()
                            },
                            "statement.object.id": fullDirectThread
                        });
                    }
                }
            }

            self.pebl.user.getUser(function(userProfile) {
                if (userProfile && self.pebl.enableDirectMessages) {
                    let fullDirectThread = PEBL_THREAD_USER_PREFIX + userProfile.identity;
                    let thread = USER_PREFIX + userProfile.identity;
                    let timeStr = self.endpoint.lastSyncedThreads[thread];
                    let timestamp: Date = timeStr == null ? new Date("2017-06-05T21:07:49-07:00") : timeStr;
                    self.endpoint.lastSyncedThreads[thread] = timestamp;

                    threadPairs.push({
                        "statement.stored": {
                            "$gt": timestamp.toISOString()
                        },
                        "statement.object.id": fullDirectThread
                    });
                }

                if ((threadPairs.length == 0) && self.running)
                    self.threadPoll = setTimeout(self.threadPollingCallback.bind(self), THREAD_POLL_INTERVAL);
                else
                    self.pullMessages({ "$or": threadPairs });
            });
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
        //TODO: Assumes only $or in the object
        let stringifiedParams = JSON.stringify(params["$or"]);
        let arrayChunks = [params["$or"]];

        //If the character count exceeds 4000, keep dividing the arrays in half until they are under 4000 characters
        while (stringifiedParams.length > 4000) {
            let newArrayChunks = [];
            for (let array of arrayChunks) {
                let newHalf = array.splice(0, Math.ceil(array.length / 2));
                newArrayChunks.push(array);
                newArrayChunks.push(newHalf);
            }
            //Deep copy
            arrayChunks = JSON.parse(JSON.stringify(newArrayChunks));
            stringifiedParams = JSON.stringify(newArrayChunks[0]);
        }

        let self = this;

        let chunkIterator = function(arrays: any[]): void {
            let array = arrays.pop();

            let pipeline: { [key: string]: any }[] = [
                {
                    "$match": { "$or": array }
                },
                {
                    "$project": {
                        "statement": 1,
                        "_id": 0,
                        "voided": 1
                    }
                },
                {
                    "$sort": {
                        "stored": -1,
                        "_id": 1
                    }
                },
                {
                    "$limit": 1500
                }
            ];

            self.pullHelper(pipeline,
                function(stmts: XApiStatement[]): void {
                    let buckets: { [thread: string]: { [id: string]: (Message | Reference | ProgramAction) } } = {};
                    let memberships: { [thread: string]: { [id: string]: (Membership) } } = {};
                    let deleteIds: Voided[] = [];
                    self.pebl.user.getUser(function(userProfile) {
                        if (userProfile) {
                            for (let i = 0; i < stmts.length; i++) {
                                let xapi = stmts[i];
                                let thread: (string | null) = null;
                                let tsd: (Message | Reference | Membership | ProgramAction | null) = null;

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
                                } else if (Membership.is(xapi)) {
                                    let m = new Membership(xapi);
                                    thread = m.thread;
                                    tsd = m;
                                } else if (ProgramAction.is(xapi)) {
                                    let pa = new ProgramAction(xapi);
                                    thread = 'group-user-' + userProfile.identity;
                                    tsd = pa;
                                }

                                if (thread != null) {
                                    if (tsd != null) {
                                        let container = tsd instanceof Membership ? memberships : buckets;
                                        let stmts = container[thread];
                                        if (stmts == null) {
                                            stmts = {};
                                            container[thread] = stmts;
                                        }
                                        stmts[tsd.id] = tsd;
                                    }

                                    let temp = new Date(xapi.stored);
                                    let lastSyncedDate = self.endpoint.lastSyncedThreads[thread];
                                    if (lastSyncedDate.getTime() < temp.getTime())
                                        self.endpoint.lastSyncedThreads[thread] = temp;
                                }
                            }

                            for (let i = 0; i < deleteIds.length; i++) {
                                let v = deleteIds[i];
                                let thread = v.thread;
                                let bucket = buckets[thread];
                                if (bucket != null) {
                                    delete bucket[v.target];
                                }

                                self.pebl.storage.removeMessage(userProfile, v.target);
                                self.pebl.storage.removeGroupMembership(userProfile, v.target);
                            }

                            for (let thread of Object.keys(memberships)) {
                                let membership = memberships[thread];
                                let cleanMemberships: Membership[] = [];

                                for (let messageId of Object.keys(membership)) {
                                    let rec = membership[messageId];
                                    cleanMemberships.push(rec);
                                }
                                if (cleanMemberships.length > 0) {
                                    cleanMemberships.sort();
                                    self.pebl.storage.saveGroupMembership(userProfile, cleanMemberships);

                                    self.pebl.emitEvent(thread, cleanMemberships);

                                    self.pullActivitiesFromMemberships("program", cleanMemberships);
                                    self.pullActivitiesFromMemberships("institution", cleanMemberships);
                                    self.pullActivitiesFromMemberships("system", cleanMemberships);
                                }
                            }

                            for (let thread of Object.keys(buckets)) {
                                let bucket = buckets[thread];
                                let cleanMessages: Message[] = [];
                                let cleanProgramActions: ProgramAction[] = [];

                                for (let messageId of Object.keys(bucket)) {
                                    let rec: (Message | Reference | ProgramAction) = bucket[messageId];
                                    if (rec instanceof Message)
                                        cleanMessages.push(rec);
                                    else if (rec instanceof ProgramAction)
                                        cleanProgramActions.push(rec);
                                }
                                if (cleanMessages.length > 0) {
                                    cleanMessages.sort();
                                    self.pebl.storage.saveMessages(userProfile, cleanMessages);

                                    self.pebl.emitEvent(thread, cleanMessages);
                                }
                                if (cleanProgramActions.length > 0) {
                                    cleanProgramActions.sort();
                                    self.pebl.storage.saveActivityEvent(userProfile, cleanProgramActions);

                                    self.pebl.emitEvent(self.pebl.events.incomingActivityEvents, cleanProgramActions);
                                }
                            }

                            self.pebl.storage.saveUserProfile(userProfile);

                            if (arrays.length > 0) {
                                chunkIterator(arrays);
                            } else {
                                if (self.running)
                                    self.threadPoll = setTimeout(self.threadPollingCallback.bind(self), THREAD_POLL_INTERVAL);
                            }
                        }
                    });
                });
        }

        chunkIterator(arrayChunks);
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
                "$match": {
                    "$or": [
                        teacherPack,
                        {
                            "statement.object.id": "pebl://" + book,
                            "statement.stored": {
                                "$gt": lastSynced.toISOString()
                            },
                            "statement.verb.id": {
                                "$in": [
                                    "http://adlnet.gov/expapi/verbs/shared",
                                    "http://www.peblproject.com/definitions.html#moduleRating",
                                    "http://www.peblproject.com/definitions.html#moduleFeedback",
                                    "http://www.peblproject.com/definitions.html#moduleExample",
                                    "http://www.peblproject.com/definitions.html#moduleExampleRating",
                                    "http://www.peblproject.com/definitions.html#moduleExampleFeedback"
                                ]
                            }
                        }
                    ]
                }
            },
            {
                "$project": {
                    "statement": 1,
                    "_id": 0,
                    "voided": 1
                }
            },
            {
                "$sort": {
                    "stored": -1,
                    "_id": 1
                }
            },
            {
                "$limit": 1500
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
                        let moduleEvents: { [key: string]: (ModuleRating | ModuleFeedback | ModuleExample | ModuleExampleRating | ModuleExampleFeedback) } = {};
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
                            } else if (ModuleRating.is(xapi)) {
                                let mr = new ModuleRating(xapi);
                                moduleEvents[mr.id] = mr;
                            } else if (ModuleFeedback.is(xapi)) {
                                let mf = new ModuleFeedback(xapi);
                                moduleEvents[mf.id] = mf;
                            } else if (ModuleExample.is(xapi)) {
                                let me = new ModuleExample(xapi);
                                moduleEvents[me.id] = me;
                            } else if (ModuleExampleRating.is(xapi)) {
                                let mer = new ModuleExampleRating(xapi);
                                moduleEvents[mer.id] = mer;
                            } else if (ModuleExampleFeedback.is(xapi)) {
                                let mef = new ModuleExampleFeedback(xapi);
                                moduleEvents[mef.id] = mef;
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

                        if (cleanSharedAnnotations.length > 0) {
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

                        let cleanModuleEvents = [];
                        for (let id of Object.keys(moduleEvents))
                            cleanModuleEvents.push(moduleEvents[id]);

                        if (cleanModuleEvents.length > 0) {
                            cleanModuleEvents.sort();
                            self.pebl.storage.saveModuleEvent(userProfile, cleanModuleEvents);
                            self.pebl.emitEvent(self.pebl.events.incomingModuleEvents, cleanModuleEvents);
                        }

                        self.pebl.storage.saveUserProfile(userProfile);
                        if (self.running)
                            self.bookPoll = setTimeout(self.bookPollingCallback.bind(self), BOOK_POLL_INTERVAL);
                    });
            }
        });
    }

    pull(): void {
        this.running = true;

        this.clearTimeouts();

        this.bookPollingCallback();
        this.threadPollingCallback();

        // this.startActivityPull("presence", PRESENCE_POLL_INTERVAL);
        // this.startActivityPull("learnlet", LEARNLET_POLL_INTERVAL);
        this.startActivityPull("program", PROGRAM_POLL_INTERVAL);
        this.startActivityPull("institution", INSTITUTION_POLL_INTERVAL);
        this.startActivityPull("system", SYSTEM_POLL_INTERVAL);
    }

    private pullActivitiesFromMemberships(activityType: string, memberships: Membership[]): void {
        let self = this;
        let queuedMembership: Membership[] = [];
        if (memberships) {
            for (let membership of memberships) {
                if (membership.activityType == activityType)
                    queuedMembership.push(membership);
            }
        }

        let callbackProcessor = function(): void {
            if (queuedMembership.length > 0) {
                let member = queuedMembership.pop();
                if (member) {
                    self.pullActivity(activityType, member.membershipId, callbackProcessor);
                }
            }
        };

        callbackProcessor();
    }

    private startActivityPull(activityType: string, interval: number): void {
        let self = this;

        let groupGetter = function(): void {
            self.pebl.utils.getGroupMemberships(function(memberships) {
                let queuedMembership: Membership[] = [];
                if (memberships) {
                    for (let membership of memberships) {
                        if (membership.activityType == activityType)
                            queuedMembership.push(membership);
                    }
                }

                let callbackProcessor = function(): void {
                    if (queuedMembership.length == 0) {
                        if (self.running)
                            self.activityPolls[activityType] = setTimeout(groupGetter.bind(self), interval);
                    } else {
                        let member = queuedMembership.pop();
                        if (member) {
                            self.pullActivity(activityType, member.membershipId, callbackProcessor);
                        }
                    }
                };

                callbackProcessor();
            })
        }

        groupGetter();
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

    pushActivity(outgoing: Activity[], callback: () => void): void {
        let self = this;
        let xhr = new XMLHttpRequest();

        this.pebl.user.getUser(function(userProfile) {
            let activity: (Activity | undefined) = outgoing.pop();
            if (userProfile && activity) {
                if (activity.delete && activity.delete === true) {
                    self.deleteActivity(activity,
                        function(success: boolean, oldActivity?: Activity, newActivity?: Activity): void {
                            if (success) {
                                if (activity) {
                                    self.pebl.storage.removeOutgoingActivity(userProfile, activity);
                                    self.pebl.storage.removeActivity(userProfile, activity.id, activity.type);
                                    if (Program.is(activity)) {
                                        let program = new Program(activity);
                                        Program.iterateMembers(program, function(key, membership) {
                                            if (!TempMembership.is(membership)) {
                                                self.pebl.emitEvent(self.pebl.events.modifiedMembership, {
                                                    oldMembership: membership,
                                                    newMembership: null
                                                });
                                            }
                                        });
                                        self.pebl.emitEvent(self.pebl.events.removedProgram, program);
                                        self.pebl.emitEvent(self.pebl.events.eventProgramDeleted, {
                                            programId: program.id,
                                            action: 'deleted',
                                            previousValue: null,
                                            newValue: null
                                        });
                                    } else if (Institution.is(activity)) {
                                        let institution = new Institution(activity);
                                        Institution.iterateMembers(institution, function(key, membership) {
                                            if (!TempMembership.is(membership)) {
                                                self.pebl.emitEvent(self.pebl.events.modifiedMembership, {
                                                    oldMembership: membership,
                                                    newMembership: null
                                                });
                                            }
                                        });
                                        self.pebl.emitEvent(self.pebl.events.removedInstitution, institution);
                                        self.pebl.emitEvent(self.pebl.events.eventInstitutionDeleted, {
                                            institutionId: institution.id,
                                            action: 'deleted',
                                            previousvalue: null,
                                            newValue: null
                                        });
                                    } else if (System.is(activity)) {
                                        let system = new System(activity);
                                        System.iterateMembers(system, function(key, membership) {
                                            if (!TempMembership.is(membership)) {
                                                self.pebl.emitEvent(self.pebl.events.modifiedMembership, {
                                                    oldMembership: membership,
                                                    newMembership: null
                                                });
                                            }
                                        });
                                        self.pebl.emitEvent(self.pebl.events.removedSystem, system);
                                        self.pebl.emitEvent(self.pebl.events.eventSystemDeleted, {
                                            institutionId: system.id,
                                            action: 'deleted',
                                            previousvalue: null,
                                            newValue: null
                                        });
                                    }
                                } //typechecker


                                if (outgoing.length == 0)
                                    callback();
                                else {
                                    self.pushActivity(outgoing, callback);
                                }
                            } else {
                                if (activity) //typechecker
                                    self.pebl.storage.removeOutgoingActivity(userProfile, activity);

                                if (oldActivity && newActivity) {
                                    let mergedActivity = Activity.merge(oldActivity, newActivity) as Activity;
                                    outgoing.push(mergedActivity);
                                }

                                if (outgoing.length == 0)
                                    callback();
                                else {
                                    self.pebl.emitEvent(self.pebl.events.incomingErrors, {
                                        error: xhr.status,
                                        obj: activity
                                    });
                                    self.pushActivity(outgoing, callback);
                                }
                            }
                        });
                } else {
                    self.postActivity(activity,
                        function(success: boolean, oldActivity?: Activity, newActivity?: Activity): void {
                            if (success) {
                                if (activity) { //typechecker
                                    self.pebl.storage.removeOutgoingActivity(userProfile, activity);
                                    self.pebl.emitEvent(self.pebl.events.eventProgramModified, {
                                        programId: activity.id,
                                        action: 'modified',
                                        previousValue: null,
                                        newValue: null
                                    });
                                }

                                if (outgoing.length == 0)
                                    callback();
                                else {
                                    self.pushActivity(outgoing, callback);
                                }
                            } else {
                                if (activity) //typechecker
                                    self.pebl.storage.removeOutgoingActivity(userProfile, activity);

                                if (oldActivity && newActivity) {
                                    let mergedActivity = Activity.merge(oldActivity, newActivity) as Activity;
                                    outgoing.push(mergedActivity);
                                }

                                if (outgoing.length == 0)
                                    callback();
                                else {
                                    self.pebl.emitEvent(self.pebl.events.incomingErrors, {
                                        error: xhr.status,
                                        obj: activity
                                    });
                                    self.pushActivity(outgoing, callback);
                                }
                            }
                        });
                }
            } else
                callback();
        });
    }

    terminate(): void {
        this.running = false;

        //FIXME presence
        // this.unregisterPresence();

        this.clearTimeouts();
    }


}
