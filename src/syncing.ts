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
import { Voided, Annotation, SharedAnnotation, Message, Notification } from "./xapi";

export class LLSyncAction implements SyncProcess {

    private websocket?: WebSocket;

    private pebl: PEBL;

    private messageHandlers: { [key: string]: ((userProfile: UserProfile, payload: { [key: string]: any }) => void) }

    readonly DEFAULT_RECONNECTION_BACKOFF = 1000;

    private annotationSyncTimestamp: number;
    private sharedAnnotationSyncTimestamp: number;
    private notificationSyncTimestamp: number;
    private threadSyncTimestamps: { [thread: string]: number };
    private privateThreadSyncTimestamps: { [thread: string]: number };
    private groupThreadSyncTimestamps: { [group: string]: { [thread: string]: number } };
    private reconnectionTimeoutHandler?: number;
    private reconnectionBackoffResetHandler?: number;
    private reconnectionBackoff: number;
    private active: boolean;

    constructor(pebl: PEBL) {
        var self = this;

        this.pebl = pebl;
        this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;

        this.annotationSyncTimestamp = 0;
        this.sharedAnnotationSyncTimestamp = 0;
        this.notificationSyncTimestamp = 0;
        this.threadSyncTimestamps = {};
        this.privateThreadSyncTimestamps = {};
        this.groupThreadSyncTimestamps = {};
        this.active = false;

        console.log(this.pebl.config && this.pebl.config.PeBLServicesWSURL);
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
                    let isPrivate = payload.additionalData.private;

                    if (groupId) {
                        if (stored > self.groupThreadSyncTimestamps[groupId][thread])
                            self.groupThreadSyncTimestamps[groupId][thread] = stored;
                    } else if (isPrivate) {
                        if (stored > self.privateThreadSyncTimestamps[thread])
                            self.privateThreadSyncTimestamps[thread] = stored;
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
                    } else if (m.isPrivate) {
                        if (stored > self.privateThreadSyncTimestamps[m.thread])
                            self.privateThreadSyncTimestamps[m.thread] = stored;
                    } else {
                        if (stored > self.threadSyncTimestamps[m.thread])
                            self.threadSyncTimestamps[m.thread] = stored;
                    }

                    return m;
                }
            });
            let thread = payload.additionalData.thread;
            if (payload.additionalData.groupId)
                thread = thread + GROUP_PREFIX + payload.additionalData.groupId;
            else if (payload.additionalData.isPrivate)
                thread = thread + USER_PREFIX + userProfile.identity;
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
            let isPrivate = payload.additionalData.isPrivate;
            let thread = payload.additionalData.thread;

            if (groupId) {
                if (stored > self.groupThreadSyncTimestamps[groupId][thread])
                    self.groupThreadSyncTimestamps[groupId][thread] = stored;
                self.pebl.emitEvent(thread + GROUP_PREFIX + groupId, [m]);
            } else if (isPrivate) {
                if (stored > self.privateThreadSyncTimestamps[thread])
                    self.privateThreadSyncTimestamps[thread] = stored;
                self.pebl.emitEvent(thread + USER_PREFIX + userProfile.identity, [m]);
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

        this.messageHandlers.loggedOut = (userProfile, payload) => {
            self.pebl.emitEvent(self.pebl.events.eventRefreshLogin, null);
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
                        this.pullThreadedMessages();
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
                                    this.messageHandlers[parsedMessage.requestType](userProfile, parsedMessage.payload);
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
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
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
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
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
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                for (let thread in this.pebl.subscribedThreads) {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getThreadedMessages",
                        thread: thread,
                        timestamp: this.threadSyncTimestamps[thread]
                    }
                    this.websocket.send(JSON.stringify(message));
                }
                for (let thread in this.pebl.subscribedPrivateThreads) {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getThreadedMessages",
                        thread: thread,
                        isPrivate: true,
                        timestamp: this.privateThreadSyncTimestamps[thread]
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
        });
    }
}
