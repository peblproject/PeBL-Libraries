// const USER_PREFIX = "user-";
// const GROUP_PREFIX = "group-";
// const PEBL_THREAD_PREFIX = "peblThread://";
// const PEBL_THREAD_REGISTRY = "peblThread://registry";
// const PEBL_THREAD_USER_PREFIX = "peblThread://" + USER_PREFIX;
// const PEBL_THREAD_GROUP_PREFIX = "peblThread://" + GROUP_PREFIX;
// const THREAD_POLL_INTERVAL = 4000;
// const BOOK_POLL_INTERVAL = 6000;
// const MODULE_POLL_INTERVAL = 6000;
// const PRESENCE_POLL_INTERVAL = 120000;
// const LEARNLET_POLL_INTERVAL = 60000;
// const PROGRAM_POLL_INTERVAL = 60000;
// const INSTITUTION_POLL_INTERVAL = 60000;
// const SYSTEM_POLL_INTERVAL = 60000;

import { SyncProcess } from "./adapters";
import { Endpoint } from "./models";
import { PEBL } from "./pebl";
import { UserProfile } from "./models";
import { Voided, Annotation, SharedAnnotation, Message, Notification } from "./xapi";

export class LLSyncAction implements SyncProcess {

    private endpoint: Endpoint;
    private websocket: any;

    private pebl: PEBL;

    private messageHandlers: { [key: string]: ((userProfile: UserProfile, payload: { [key: string]: any }) => void) }

    private annotationSyncTimestamp: number;
    private sharedAnnotationSyncTimestamp: number;
    private notificationSyncTimestamp: number;
    private threadSyncTimestamps: { [thread: string]: number };
    private groupThreadSyncTimestamps: { [group: string]: { [thread: string]: number } };

    constructor(pebl: PEBL, endpoint: Endpoint) {
        var self = this;

        this.pebl = pebl;
        this.endpoint = endpoint;

        this.annotationSyncTimestamp = 0;
        this.sharedAnnotationSyncTimestamp = 0;
        this.notificationSyncTimestamp = 0;
        this.threadSyncTimestamps = {};
        this.groupThreadSyncTimestamps = {};

        console.log(this.endpoint);
        this.messageHandlers = {};
        this.messageHandlers.getNotifications = function(userProfile, payload) {
            let stmts = payload.data.map((stmt: any) => {
                if (Voided.is(stmt)) {
                    let voided = new Voided(stmt);
                    self.pebl.storage.removeNotification(userProfile, voided.target);
                    let stored = new Date(voided.stored).getTime();
                    if (stored > self.notificationSyncTimestamp)
                        self.notificationSyncTimestamp = stored;
                    return voided;
                } else {
                    let n = new Notification(stmt);
                    self.pebl.storage.saveNotification(userProfile, n);
                    let stored = new Date(n.stored).getTime();
                    if (stored > self.notificationSyncTimestamp)
                        self.notificationSyncTimestamp = stored;
                    return n;
                }
            });
            self.pebl.emitEvent(self.pebl.events.incomingNotifications, stmts);
        }

        this.messageHandlers.newNotification = function(userProfile, payload) {
            let n;
            if (Voided.is(payload.data)) {
                n = new Voided(payload.data);
                self.pebl.storage.removeNotification(userProfile, n.target);
            } else {
                n = new Notification(payload.data);
                self.pebl.storage.saveNotification(userProfile, n);
            }
            self.pebl.emitEvent(self.pebl.events.incomingNotifications, [n]);
            let stored = new Date(n.stored).getTime();
            if (stored > self.notificationSyncTimestamp)
                self.notificationSyncTimestamp = stored;
        }

        this.messageHandlers.getThreadedMessages = function(userProfile, payload) {
            let stmts = payload.data.map((stmt: any) => {
                if (Voided.is(stmt)) {
                    let voided = new Voided(stmt);
                    self.pebl.storage.removeMessage(userProfile, voided.target);

                    let stored = new Date(voided.stored).getTime();
                    let thread = payload.additionalData.thread;
                    let groupId = payload.additionalData.groupId;

                    if (groupId) {
                        if (stored > self.groupThreadSyncTimestamps[groupId][thread])
                            self.groupThreadSyncTimestamps[groupId][thread] = stored;
                    } else {
                        if (stored > self.threadSyncTimestamps[thread])
                            self.threadSyncTimestamps[thread] = stored;
                    }
                    
                    return voided;
                } else {
                    let m = new Message(stmt);
                    self.pebl.storage.saveMessages(userProfile, [m]);

                    let stored = new Date(m.stored).getTime();
                    if (m.groupId) {
                        if (stored > self.groupThreadSyncTimestamps[m.groupId][m.thread])
                            self.groupThreadSyncTimestamps[m.groupId][m.thread] = stored;
                    } else {
                        if (stored > self.threadSyncTimestamps[m.thread])
                            self.threadSyncTimestamps[m.thread] = stored;
                    }

                    return m;
                }
            });
            let thread = payload.additionalData.thread;
            if (payload.additionalData.groupId)
                thread = thread + '_group:' + groupId;
            self.pebl.emitEvent(thread, stmts);
        }

        this.messageHandlers.newThreadedMessage = function(userProfile, payload) {
            let m;
            if (Voided.is(payload.data)) {
                m = new Voided(payload.data);
                self.pebl.storage.removeMessage(userProfile, m.target);
            } else {
                m = new Message(payload.data);
                self.pebl.storage.saveMessages(userProfile, [m]);
            }

            let stored = new Date(m.stored).getTime();
            let groupId = payload.additionalData.groupId;
            let thread = payload.additionalData.thread;

            if (groupId) {
                if (stored > self.groupThreadSyncTimestamps[groupId][thread])
                    self.groupThreadSyncTimestamps[groupId][thread] = stored;
                self.pebl.emitEvent(thread + '_group:' + groupId, [m]);
            } else {
                if (stored > self.threadSyncTimestamps[thread])
                    self.threadSyncTimestamps[thread] = stored;
                self.pebl.emitEvent(thread, [m]);
            }
        }

        this.messageHandlers.getAnnotations = function(userProfile, payload) {
            let stmts = payload.data.map((stmt: any) => {
                if (Voided.is(stmt)) {
                    let voided = new Voided(stmt);
                    self.pebl.storage.removeAnnotation(userProfile, voided.target);
                    let stored = new Date(voided.stored).getTime();
                    if (stored > self.annotationSyncTimestamp)
                        self.annotationSyncTimestamp = stored;
                    return voided;
                } else {
                    let a = new Annotation(stmt);
                    self.pebl.storage.saveAnnotations(userProfile, [a]);
                    let stored = new Date(a.stored).getTime();
                    if (stored > self.annotationSyncTimestamp)
                        self.annotationSyncTimestamp = stored;
                    return a;
                }
            });
            self.pebl.emitEvent(self.pebl.events.incomingAnnotations, stmts);
        }

        this.messageHandlers.getSharedAnnotations = function(userProfile, payload) {
            let stmts = payload.data.map((stmt: any) => {
                if (Voided.is(stmt)) {
                    let voided = new Voided(stmt);
                    self.pebl.storage.removeSharedAnnotation(userProfile, voided.target);
                    let stored = new Date(voided.stored).getTime();
                    if (stored > self.sharedAnnotationSyncTimestamp)
                        self.sharedAnnotationSyncTimestamp = stored;
                    return voided;
                } else {
                    let sa = new SharedAnnotation(stmt);
                    self.pebl.storage.saveSharedAnnotations(userProfile, [sa]);
                    let stored = new Date(sa.stored).getTime();
                    if (stored > self.sharedAnnotationSyncTimestamp)
                        self.sharedAnnotationSyncTimestamp = stored;
                    return sa;
                }
            });
            self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, stmts);
        }

        this.messageHandlers.newAnnotation = function(userProfile, payload) {
            let a;
            if (Voided.is(payload.data)) {
                a = new Voided(payload.data);
                self.pebl.storage.removeAnnotation(userProfile, a.target);
            } else {
                a = new Annotation(payload.data);
                self.pebl.storage.saveAnnotations(userProfile, [a]);
            }
            let stored = new Date(a.stored).getTime();
            if (stored > self.annotationSyncTimestamp)
                self.annotationSyncTimestamp = stored;
            self.pebl.emitEvent(self.pebl.events.incomingAnnotations, [a]);
        }

        this.messageHandlers.newSharedAnnotation = function(userProfile, payload) {
            let sa;
            if (Voided.is(payload.data)) {
                sa = new Voided(payload.data);
                self.pebl.storage.removeSharedAnnotation(userProfile, sa.target);
            } else {
                sa = new SharedAnnotation(payload.data);
                self.pebl.storage.saveSharedAnnotations(userProfile, [sa]);
            }
            let stored = new Date(sa.stored).getTime();
            if (stored > self.annotationSyncTimestamp)
                self.sharedAnnotationSyncTimestamp = stored;
            self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [sa]);
        }

        this.websocket = new WebSocket("ws://localhost:8081/message");
        this.websocket.onopen = function() {
            console.log('websocket opened');
            self.pullNotifications();
            self.pullAnnotations();
            self.pullSharedAnnotations();
            self.pullThreadedMessages();
        }

        this.websocket.onmessage = function(message: any) {
            self.pebl.user.getUser(function(userProfile) {
                if (userProfile) {
                    console.log('message recieved');
                    var parsedMessage = JSON.parse(message.data);

                    if (self.messageHandlers[parsedMessage.payload.requestType])
                        self.messageHandlers[parsedMessage.payload.requestType](userProfile, parsedMessage.payload);
                }
            });
        }
    }

    push(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile && self.websocket.readyState === 1) {
                for (let message of outgoing) {
                    console.log(message);
                    self.websocket.send(JSON.stringify(message));
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    pushActivity(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile && self.websocket.readyState === 1) {
                for (let message of outgoing) {
                    console.log(message);
                    self.websocket.send(JSON.stringify(message));
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    pullNotifications(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket.readyState === 1) {
                let message = {
                    identity: userProfile.identity,
                    requestType: "getNotifications",
                    timestamp: this.notificationSyncTimestamp + 1
                }
                this.websocket.send(JSON.stringify(message));
            }
        });
    }

    pullAnnotations(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket.readyState === 1) {
                let message = {
                    identity: userProfile.identity,
                    requestType: "getAnnotations",
                    timestamp: this.annotationSyncTimestamp + 1
                }
                this.websocket.send(JSON.stringify(message));
            }
        });
    }

    pullSharedAnnotations(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket.readyState === 1) {
                let message = {
                    identity: userProfile.identity,
                    requestType: "getSharedAnnotations",
                    timestamp: this.sharedAnnotationSyncTimestamp + 1
                }
                this.websocket.send(JSON.stringify(message));
            }
        });
    }

    pullThreadedMessages(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket.readyState === 1) {
                for (let thread in this.pebl.subscribedThreads) {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getThreadedMessages",
                        thread: thread,
                        timestamp: this.threadSyncTimestamps[thread]
                    }
                    this.websocket.send(JSON.stringify(message));
                }
                for (let group in this.pebl.subscribedGroupThreads) {
                    for (let thread in this.pebl.subscribedGroupThreads[group]) {
                        let message = {
                            identity: userProfile.identity,
                            requestType: "getThreadedMessages",
                            thread: thread,
                            groupId: group,
                            timestamp: this.groupThreadSyncTimestamps[group][thread]
                        }
                        this.websocket.send(JSON.stringify(message));
                    }
                }
            }
        })
    }
}
