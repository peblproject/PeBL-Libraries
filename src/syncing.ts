const USER_PREFIX = "_user-";
const GROUP_PREFIX = "_group-";

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
import { PEBL } from "./pebl";
import { UserProfile } from "./models";
import { Voided, Annotation, SharedAnnotation, Message, Notification, Reference } from "./xapi";
import { SYNC_REFERENCES, SYNC_NOTIFICATIONS, SYNC_SHARED_ANNOTATIONS, SYNC_ANNOTATIONS } from "./constants";

export class LLSyncAction implements SyncProcess {

    private websocket?: WebSocket;

    private pebl: PEBL;

    private messageHandlers: { [key: string]: ((userProfile: UserProfile, payload: { [key: string]: any }) => void) }

    readonly DEFAULT_RECONNECTION_BACKOFF = 1000;

    private reconnectionTimeoutHandler?: number;
    private reconnectionBackoffResetHandler?: number;
    private reconnectionBackoff: number;
    private active: boolean;

    constructor(pebl: PEBL) {
        var self = this;

        this.pebl = pebl;
        this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;

        this.active = false;

        console.log(this.pebl.config && this.pebl.config.PeBLServicesWSURL);
        this.messageHandlers = {};

        this.messageHandlers.getReferences = (userProfile, payload) => {
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_REFERENCES, (timestamp: number) => {
                for (let stmt of payload.data) {
                    if (Voided.is(stmt)) {
                        //TODO
                        console.log('TODO');
                    } else {
                        let ref = new Reference(stmt);
                        self.pebl.storage.saveQueuedReference(userProfile, ref);
                        let stored = new Date(ref.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                    }
                }
                this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_REFERENCES, timestamp, () => { });
            });
        }

        this.messageHandlers.newReference = (userProfile, payload) => {
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_REFERENCES, (timestamp: number) => {
                if (Voided.is(payload.data)) {
                    //TODO
                    console.log('TODO');
                } else {
                    let ref = new Reference(payload.data);
                    self.pebl.storage.saveQueuedReference(userProfile, ref);
                    let stored = new Date(ref.stored).getTime();
                    if (stored > timestamp)
                        timestamp = stored;
                    this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_REFERENCES, timestamp, () => { });
                }
            });
        }

        this.messageHandlers.getNotifications = (userProfile, payload) => {
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_NOTIFICATIONS, (timestamp: number) => {
                let stmts = payload.data.map((stmt: any) => {
                    if (Voided.is(stmt)) {
                        let voided = new Voided(stmt);
                        self.pebl.storage.removeNotification(userProfile, voided.target);
                        let stored = new Date(voided.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                        return voided;
                    } else {
                        let n;
                        if (Reference.is(stmt))
                            n = new Reference(stmt);
                        else if (Message.is(stmt))
                            n = new Message(stmt);
                        else if (SharedAnnotation.is(stmt))
                            n = new SharedAnnotation(stmt);
                        else
                            n = new Notification(stmt);
                        self.pebl.storage.saveNotification(userProfile, n);
                        let stored = new Date(n.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                        return n;
                    }
                });
                this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_NOTIFICATIONS, timestamp, () => {
                    this.pebl.emitEvent(self.pebl.events.incomingNotifications, stmts);
                });
            });
        }

        this.messageHandlers.getThreadedMessages = (userProfile, payload) => {
            let threads: any[];
            if (payload.data instanceof Array) {
                threads = payload.data;
            } else {
                threads = [payload.data];
            }

            this.pebl.utils.getThreadTimestamps(userProfile.identity,
                (threadSyncTimestamps: { [key: string]: any },
                    privateThreadSyncTimestamps: { [key: string]: any },
                    groupThreadSyncTimestamps: { [key: string]: any }) => {

                    threads.forEach((payload) => {
                        let groupId = payload.options && payload.options.groupId;
                        let isPrivate = payload.options && payload.options.isPrivate;
                        let thread = payload.thread;
                        for (let stmt of payload.data) {
                            if (groupId) {
                                self.handleGroupMessage(userProfile, stmt, thread, groupId, groupThreadSyncTimestamps);
                            } else if (isPrivate) {
                                self.handlePrivateMessage(userProfile, stmt, thread, privateThreadSyncTimestamps);
                            } else {
                                self.handleMessage(userProfile, stmt, thread, threadSyncTimestamps);
                            }
                        }
                    });

                    this.pebl.utils.saveThreadTimestamps(userProfile.identity,
                        threadSyncTimestamps,
                        privateThreadSyncTimestamps,
                        groupThreadSyncTimestamps,
                        () => { });
                });
        }

        this.messageHandlers.newThreadedMessage = (userProfile, payload) => {
            let groupId = payload.options && payload.options.groupId;
            let isPrivate = payload.options && payload.options.isPrivate;
            let thread = payload.thread;
            this.pebl.utils.getThreadTimestamps(userProfile.identity,
                (threadSyncTimestamps: { [key: string]: any },
                    privateThreadSyncTimestamps: { [key: string]: any },
                    groupThreadSyncTimestamps: { [key: string]: any }) => {

                    if (groupId) {
                        this.handleGroupMessage(userProfile, payload.data, thread, groupId, groupThreadSyncTimestamps);
                    } else if (isPrivate) {
                        this.handlePrivateMessage(userProfile, payload.data, thread, privateThreadSyncTimestamps);
                    } else {
                        this.handleMessage(userProfile, payload.data, thread, threadSyncTimestamps);
                    }

                    this.pebl.utils.saveThreadTimestamps(userProfile.identity,
                        threadSyncTimestamps,
                        privateThreadSyncTimestamps,
                        groupThreadSyncTimestamps,
                        () => { });
                });
        }

        this.messageHandlers.getSubscribedThreads = (userProfile, payload) => {
            if (self.websocket && self.websocket.readyState === 1) {
                this.pebl.utils.getThreadTimestamps(userProfile.identity,
                    (threadSyncTimestamps: { [key: string]: any },
                        privateThreadSyncTimestamps: { [key: string]: any },
                        groupThreadSyncTimestamps: { [key: string]: any }) => {

                        let messageSet = [];
                        for (let thread of payload.data.threads) {
                            let message = {
                                thread: thread,
                                timestamp: threadSyncTimestamps[thread] ? threadSyncTimestamps[thread] : 1
                            }
                            messageSet.push(message);
                        }
                        for (let thread of payload.data.privateThreads) {
                            let message = {
                                thread: thread,
                                options: { isPrivate: true },
                                timestamp: privateThreadSyncTimestamps[thread] ? privateThreadSyncTimestamps[thread] : 1
                            }
                            messageSet.push(message);
                        }
                        for (let groupId in payload.data.groupThreads) {
                            for (let thread of payload.data.groupThreads[groupId]) {
                                let groupTime: number;
                                if (groupThreadSyncTimestamps[groupId]) {
                                    groupTime = groupThreadSyncTimestamps[groupId][thread]
                                } else {
                                    groupTime = 1;
                                }

                                let message = {
                                    thread: thread,
                                    options: { groupId: groupId },
                                    timestamp: groupTime
                                }
                                messageSet.push(message);
                            }
                        }
                        if (this.websocket) {
                            this.websocket.send(JSON.stringify({
                                requestType: "getThreadedMessages",
                                identity: userProfile.identity,
                                requests: messageSet
                            }));
                        }
                    });
            }
        }

        this.messageHandlers.getAnnotations = (userProfile, payload) => {
            console.log(payload);
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_ANNOTATIONS, (timestamp: number) => {
                let stmts = payload.data.map((stmt: any) => {
                    if (Voided.is(stmt)) {
                        let voided = new Voided(stmt);
                        this.pebl.storage.removeAnnotation(userProfile, voided.target);
                        let stored = new Date(voided.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                        return voided;
                    } else {
                        let a = new Annotation(stmt);
                        this.pebl.storage.saveAnnotations(userProfile, [a]);
                        let stored = new Date(a.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                        return a;
                    }
                });
                this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_ANNOTATIONS, timestamp, () => {
                    this.pebl.emitEvent(this.pebl.events.incomingAnnotations, stmts);
                });
            });
        }

        this.messageHandlers.getSharedAnnotations = (userProfile, payload) => {
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_SHARED_ANNOTATIONS, (timestamp: number) => {
                let stmts = payload.data.map((stmt: any) => {
                    if (Voided.is(stmt)) {
                        let voided = new Voided(stmt);
                        self.pebl.storage.removeSharedAnnotation(userProfile, voided.target);
                        let stored = new Date(voided.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                        return voided;
                    } else {
                        let sa = new SharedAnnotation(stmt);
                        self.pebl.storage.saveSharedAnnotations(userProfile, [sa]);
                        let stored = new Date(sa.stored).getTime();
                        if (stored > timestamp)
                            timestamp = stored;
                        return sa;
                    }
                });
                this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_SHARED_ANNOTATIONS, timestamp, () => {
                    self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, stmts);
                });
            });
        }

        this.messageHandlers.newAnnotation = (userProfile, payload) => {
            let allAnnotations: any[];
            if (payload.data instanceof Array) {
                allAnnotations = payload.data;
            } else {
                allAnnotations = [payload.data];
            }
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_ANNOTATIONS, (timestamp: number) => {
                let stmts = allAnnotations.map((a) => {
                    if (Voided.is(a)) {
                        a = new Voided(a);
                        self.pebl.storage.removeAnnotation(userProfile, a.target);
                    } else {
                        a = new Annotation(a);
                        self.pebl.storage.saveAnnotations(userProfile, [a]);
                    }
                    let stored = new Date(a.stored).getTime();
                    if (stored > timestamp)
                        timestamp = stored;
                    return a;
                });

                this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_ANNOTATIONS, timestamp, () => {
                    self.pebl.emitEvent(self.pebl.events.incomingAnnotations, stmts);
                });
            });
        }

        this.messageHandlers.newSharedAnnotation = (userProfile, payload) => {
            let allSharedAnnotations: any[];
            if (payload.data instanceof Array) {
                allSharedAnnotations = payload.data;
            } else {
                allSharedAnnotations = [payload.data];
            }
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_SHARED_ANNOTATIONS, (timestamp: number) => {
                let stmts = allSharedAnnotations.map((sa) => {
                    if (Voided.is(sa)) {
                        sa = new Voided(sa);
                        self.pebl.storage.removeSharedAnnotation(userProfile, sa.target);
                    } else {
                        sa = new SharedAnnotation(sa);
                        self.pebl.storage.saveSharedAnnotations(userProfile, [sa]);
                    }
                    let stored = new Date(sa.stored).getTime();
                    if (stored > timestamp)
                        timestamp = stored;
                    return sa;
                });
                this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_SHARED_ANNOTATIONS, timestamp, () => {
                    self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, stmts);
                });
            });
        }

        this.messageHandlers.loggedOut = (userProfile, payload) => {
            self.pebl.storage.removeCurrentUser(() => {
                self.pebl.emitEvent(self.pebl.events.eventRefreshLogin, null);
            });
        }

        this.messageHandlers.error = (userProfile, payload) => {
            console.log("Message failed", payload);
        }
    }

    activate(callback?: (() => void)): void {
        if (!this.active) {
            this.active = true;
            this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;
            let makeWebSocketConnection = () => {
                if (this.pebl.config && this.pebl.config.PeBLServicesWSURL) {
                    this.websocket = new WebSocket(this.pebl.config.PeBLServicesWSURL);
                    this.websocket.onopen = () => {
                        console.log('websocket opened');
                        this.pullNotifications();
                        this.pullAnnotations();
                        this.pullSharedAnnotations();
                        this.pullReferences();
                        this.pullSubscribedThreads();
                        this.reconnectionBackoffResetHandler = setTimeout(
                            () => {
                                this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;
                            },
                            this.DEFAULT_RECONNECTION_BACKOFF
                        );
                    }

                    this.websocket.onclose = () => {
                        console.log("Web socket closed retrying in " + this.reconnectionBackoff, event);
                        if (this.active) {
                            if (this.reconnectionBackoffResetHandler) {
                                clearTimeout(this.reconnectionBackoffResetHandler);
                                this.reconnectionBackoffResetHandler = undefined;
                            }
                            if (this.reconnectionTimeoutHandler) {
                                clearTimeout(this.reconnectionTimeoutHandler);
                            }
                            this.reconnectionTimeoutHandler = setTimeout(
                                () => {
                                    makeWebSocketConnection();
                                    this.reconnectionBackoff *= 2;
                                    if (this.reconnectionBackoff > 60000) {
                                        this.reconnectionBackoff = 60000;
                                    }
                                },
                                this.reconnectionBackoff
                            );
                        }
                    };

                    this.websocket.onerror = (event: Event) => {
                        console.log("Web socket error retrying in " + this.reconnectionBackoff, event);
                        if (this.active) {
                            if (this.reconnectionBackoffResetHandler) {
                                clearTimeout(this.reconnectionBackoffResetHandler);
                                this.reconnectionBackoffResetHandler = undefined;
                            }
                            if (this.reconnectionTimeoutHandler) {
                                clearTimeout(this.reconnectionTimeoutHandler);
                            }
                            this.reconnectionTimeoutHandler = setTimeout(
                                () => {
                                    makeWebSocketConnection();
                                    this.reconnectionBackoff *= 2;
                                    if (this.reconnectionBackoff > 60000) {
                                        this.reconnectionBackoff = 60000;
                                    }
                                },
                                this.reconnectionBackoff
                            );
                        }
                    };

                    this.websocket.onmessage = (message: any) => {
                        this.pebl.user.getUser((userProfile) => {
                            if (userProfile) {
                                console.log('message recieved');
                                var parsedMessage = JSON.parse(message.data);

                                if (this.messageHandlers[parsedMessage.requestType]) {
                                    this.messageHandlers[parsedMessage.requestType](userProfile, parsedMessage);
                                } else {
                                    console.log("Unknown request type", parsedMessage.requestType, parsedMessage);
                                }
                            }
                        });
                    };
                }
            }
            makeWebSocketConnection();
        }
        if (callback) {
            callback();
        }
    }

    disable(callback?: (() => void)): void {
        if (this.active) {
            this.active = false;
            if (this.reconnectionTimeoutHandler) {
                clearTimeout(this.reconnectionTimeoutHandler);
                this.reconnectionTimeoutHandler = undefined;
            }
            if (this.websocket) {
                let processDisable = () => {
                    if (this.websocket) {
                        if (this.websocket.bufferedAmount > 0) {
                            setTimeout(processDisable,
                                50);
                        } else {
                            this.websocket.close();
                            if (callback) {
                                callback();
                            }
                        }
                    }
                };
                processDisable();
            }
        } else {
            if (callback) {
                callback();
            }
        }
    }

    push(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                this.websocket.send(JSON.stringify({
                    requestType: "bulkPush",
                    identity: userProfile.identity,
                    data: outgoing
                }));
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    pushActivity(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                for (let message of outgoing) {
                    console.log(message);
                    this.websocket.send(JSON.stringify(message));
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    pullNotifications(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_NOTIFICATIONS, (timestamp: number) => {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getNotifications",
                        timestamp: timestamp + 1
                    }
                    if (this.websocket) {
                        this.websocket.send(JSON.stringify(message));
                    }
                });
            }
        });
    }

    pullAnnotations(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_ANNOTATIONS, (timestamp: number) => {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getAnnotations",
                        timestamp: timestamp + 1
                    }
                    if (this.websocket) {
                        this.websocket.send(JSON.stringify(message));
                    }
                });
            }
        });
    }

    pullSharedAnnotations(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_SHARED_ANNOTATIONS, (timestamp: number) => {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getSharedAnnotations",
                        timestamp: timestamp + 1
                    }
                    if (this.websocket) {
                        this.websocket.send(JSON.stringify(message));
                    }
                });
            }
        });
    }

    pullReferences(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_REFERENCES, (timestamp: number) => {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getReferences",
                        timestamp: timestamp + 1
                    }
                    if (this.websocket) {
                        this.websocket.send(JSON.stringify(message));
                    }
                });
            }
        });
    }

    pullSubscribedThreads(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                let message = {
                    identity: userProfile.identity,
                    requestType: "getSubscribedThreads"
                }
                this.websocket.send(JSON.stringify(message));
            }
        });
    }

    handlePrivateMessage(userProfile: UserProfile, message: any, thread: string, privateThreadSyncTimestamps: { [key: string]: any }): void {
        let m;
        if (Voided.is(message)) {
            m = new Voided(message);
            this.pebl.storage.removeMessage(userProfile, m.target);
        } else {
            m = new Message(message);
            this.pebl.storage.saveMessages(userProfile, [m]);
        }

        let stored = new Date(m.stored).getTime();

        if (!privateThreadSyncTimestamps[thread])
            privateThreadSyncTimestamps[thread] = 1;

        if (stored > privateThreadSyncTimestamps[thread])
            privateThreadSyncTimestamps[thread] = stored;
        this.pebl.emitEvent(thread + USER_PREFIX + userProfile.identity, [m]);
    }

    handleGroupMessage(userProfile: UserProfile, message: any, thread: string, groupId: string, groupThreadSyncTimestamps: { [key: string]: any }): void {
        let m;
        if (Voided.is(message)) {
            m = new Voided(message);
            this.pebl.storage.removeMessage(userProfile, m.target);
        } else {
            m = new Message(message);
            this.pebl.storage.saveMessages(userProfile, [m]);
        }

        let stored = new Date(m.stored).getTime();

        if (!groupThreadSyncTimestamps[groupId])
            groupThreadSyncTimestamps[groupId] = {};

        if (!groupThreadSyncTimestamps[groupId][thread])
            groupThreadSyncTimestamps[groupId][thread] = 1;

        if (stored > groupThreadSyncTimestamps[groupId][thread])
            groupThreadSyncTimestamps[groupId][thread] = stored;
        this.pebl.emitEvent(thread + GROUP_PREFIX + groupId, [m]);
    }

    handleMessage(userProfile: UserProfile, message: any, thread: string, threadSyncTimestamps: { [key: string]: any }): void {
        let m;
        if (Voided.is(message)) {
            m = new Voided(message);
            this.pebl.storage.removeMessage(userProfile, m.target);
        } else {
            m = new Message(message);
            this.pebl.storage.saveMessages(userProfile, [m]);
        }

        let stored = new Date(m.stored).getTime();

        if (!threadSyncTimestamps[thread])
            threadSyncTimestamps[thread] = 1;

        if (stored > threadSyncTimestamps[thread])
            threadSyncTimestamps[thread] = stored;
        this.pebl.emitEvent(thread, [m]);
    }
}
