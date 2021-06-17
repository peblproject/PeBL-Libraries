/*

Copyright 2021 Eduworks Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

declare var window: any;

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
import { Voided, Annotation, SharedAnnotation, Message, Reference } from "./xapi";
import { generateGroupSharedAnnotationsSyncTimestampsKey, SYNC_REFERENCES, SYNC_ANNOTATIONS } from "./constants";
import { consoleLog } from "./build";

export class LLSyncAction implements SyncProcess {

    private websocket?: WebSocket;

    private pebl: PEBL;

    private messageHandlers: { [key: string]: ((userProfile: UserProfile, payload: { [key: string]: any }) => void) };

    readonly DEFAULT_RECONNECTION_BACKOFF = 1000;

    private reconnectionTimeoutHandler?: number;
    private reconnectionBackoffResetHandler?: number;
    private reconnectionBackoff: number;
    private active: boolean;
    private serverReady: boolean;
    private notificationTimestamps: { [key: string]: number } = {};
    private clearedNotifications: { [key: string]: boolean } = {};

    constructor(pebl: PEBL) {
        var self = this;

        this.serverReady = false;

        this.pebl = pebl;
        this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;

        this.active = false;

        consoleLog(this.pebl.config && this.pebl.config.PeBLServicesWSURL);
        this.messageHandlers = {};

        this.messageHandlers.serverReady = (userProfile, payload) => {
            this.serverReady = true;
            // this.pullNotifications();
            this.pullAnnotations();
            this.pullSharedAnnotations();
            this.pullReferences();
            this.pullSubscribedThreads();
            this.pullVariables();
        };

        this.messageHandlers.setLastNotifiedDates = (userProfile, payload) => {
            for (let k in payload.clearedTimestamps) {
                this.notificationTimestamps[k] = parseInt(payload.clearedTimestamps[k]);
            }
            for (let key of payload.clearedNotifications) {
                this.clearedNotifications[key] = true;
            }
        };

        this.messageHandlers.removeClearedNotifications = (userProfile, payload) => {
            for (let k of payload.clearedTimestamps) {
                this.notificationTimestamps[k] = payload.clearedTimestamps[k];
            }
            for (let key of payload.clearedNotifications) {
                delete this.clearedNotifications[key];
            }
        };

        this.messageHandlers.getReferences = (userProfile, payload) => {
            this.pebl.storage.getSyncTimestamps(userProfile.identity,
                SYNC_REFERENCES,
                (timestamp: number) => {
                    for (let stmt of payload.data) {
                        if (Voided.is(stmt)) {
                            //TODO
                            consoleLog('TODO');
                        } else {
                            let ref = new Reference(stmt);
                            self.pebl.storage.saveQueuedReference(userProfile, ref);
                            let stored = new Date(ref.stored).getTime();
                            if ((!this.clearedNotifications[ref.id]) &&
                                (stored >= (this.notificationTimestamps["r" + ref.book] || 0))) {

                                self.pebl.storage.saveNotification(userProfile,
                                    ref,
                                    () => { });
                                this.pebl.emitEvent(this.pebl.events.incomingNotifications, [ref]);
                            }
                            if (stored > timestamp)
                                timestamp = stored;
                        }
                    }
                    this.pebl.storage.saveSyncTimestamps(userProfile.identity,
                        SYNC_REFERENCES,
                        timestamp,
                        () => { });
                });
        }

        this.messageHandlers.newReference = (userProfile, payload) => {
            this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_REFERENCES, (timestamp: number) => {
                if (Voided.is(payload.data)) {
                    //TODO
                    consoleLog('TODO');
                } else {
                    let ref = new Reference(payload.data);
                    self.pebl.storage.saveQueuedReference(userProfile, ref);
                    let stored = new Date(ref.stored).getTime();
                    if ((!this.clearedNotifications[ref.id]) &&
                        (stored >= (this.notificationTimestamps["r" + ref.book] || 0))) {

                        self.pebl.storage.saveNotification(userProfile,
                            ref,
                            () => { });
                        this.pebl.emitEvent(this.pebl.events.incomingNotifications, [ref]);
                    }
                    if (stored > timestamp)
                        timestamp = stored;
                    this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_REFERENCES, timestamp, () => { });
                }
            });
        }

        // this.messageHandlers.getNotifications = (userProfile, payload) => {
        //     this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_NOTIFICATIONS, (timestamp: number) => {
        //         let stmts = payload.data.map((stmt: any) => {
        //             if (Voided.is(stmt)) {
        //                 let voided = new Voided(stmt);
        //                 self.pebl.storage.removeNotification(userProfile, voided.target);
        //                 let stored = new Date(voided.stored).getTime();
        //                 if (stored > timestamp)
        //                     timestamp = stored;
        //                 return voided;
        //             } else {
        //                 let n;
        //                 if (Reference.is(stmt))
        //                     n = new Reference(stmt);
        //                 else if (Message.is(stmt))
        //                     n = new Message(stmt);
        //                 else if (SharedAnnotation.is(stmt))
        //                     n = new SharedAnnotation(stmt);
        //                 else
        //                     n = new Notification(stmt);
        //                 self.pebl.storage.saveNotification(userProfile, n);
        //                 let stored = new Date(n.stored).getTime();
        //                 if (stored > timestamp)
        //                     timestamp = stored;
        //                 return n;
        //             }
        //         });
        //         this.pebl.storage.saveSyncTimestamps(userProfile.identity, SYNC_NOTIFICATIONS, timestamp, () => {
        //             this.pebl.emitEvent(self.pebl.events.incomingNotifications, stmts);
        //         });
        //     });
        // }

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
                                this.handleGroupMessage(userProfile, stmt, thread, groupId, groupThreadSyncTimestamps);
                            } else if (isPrivate) {
                                this.handlePrivateMessage(userProfile, stmt, thread, privateThreadSyncTimestamps);
                            } else {
                                this.handleMessage(userProfile, stmt, thread, threadSyncTimestamps);
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
                                options: {},
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
            for (let stmt of payload.data) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity,
                    generateGroupSharedAnnotationsSyncTimestampsKey(stmt.groupId),
                    (timestamp: number) => {
                        let annotation: Voided | SharedAnnotation;
                        if (Voided.is(stmt)) {
                            annotation = new Voided(stmt);
                            self.pebl.storage.removeSharedAnnotation(userProfile, annotation.target);
                            self.pebl.storage.removeNotification(userProfile, annotation.target);
                            this.pebl.emitEvent(this.pebl.events.incomingNotifications, [annotation]);
                            let stored = new Date(annotation.stored).getTime();
                            if (stored > timestamp)
                                timestamp = stored;
                        } else {
                            annotation = new SharedAnnotation(stmt);
                            self.pebl.storage.saveSharedAnnotations(userProfile, [annotation]);
                            let stored = new Date(annotation.stored).getTime();
                            if ((stored >= (this.notificationTimestamps["sa" + annotation.book] || 0)) &&
                                (!this.clearedNotifications[annotation.id])) {
                                if (userProfile.identity !== annotation.getActorId()) {
                                    this.pebl.storage.saveNotification(userProfile, annotation);
                                    this.pebl.emitEvent(this.pebl.events.incomingNotifications, [annotation]);
                                } else {
                                    this.pebl.storage.saveOutgoingXApi(userProfile, {
                                        id: annotation.id,
                                        identity: userProfile.identity,
                                        requestType: "deleteNotification",
                                        records: [{
                                            id: annotation.id,
                                            type: "sharedAnnotation",
                                            location: annotation.book,
                                            stored: annotation.stored
                                        }]
                                    });
                                }
                            }
                            if (stored > timestamp)
                                timestamp = stored;
                        }

                        this.pebl.storage.saveSyncTimestamps(userProfile.identity, generateGroupSharedAnnotationsSyncTimestampsKey(stmt.groupId), timestamp, () => {
                            self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [annotation]);
                        });
                    });
            }
        }

        this.messageHandlers.getVariables = (userProfile, payload) => {
            console.log(payload);
            this.pebl.storage.getSyncTimestamps(userProfile.identity,
                'variables',
                (timestamp: number) => {
                    for (let id in payload.data) {
                        let variable = payload.data[id];
                        if (variable.timestamp > timestamp)
                            timestamp = variable.timestamp;
                        
                        this.pebl.storage.saveVariable(id, variable.value, () => {
                            this.pebl.emitEvent(this.pebl.events.newVariable, {
                                id: id,
                                value: variable.value
                            })
                        })
                    }
                    this.pebl.storage.saveSyncTimestamps(userProfile.identity, 'variables', timestamp, () => {});
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

            for (let sa of allSharedAnnotations) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity, generateGroupSharedAnnotationsSyncTimestampsKey(sa.groupId), (timestamp: number) => {
                    if (Voided.is(sa)) {
                        sa = new Voided(sa);
                        this.pebl.storage.removeSharedAnnotation(userProfile, sa.target);
                        this.pebl.storage.removeNotification(userProfile, sa.target);
                        this.pebl.emitEvent(this.pebl.events.incomingNotifications, [sa]);
                    } else {
                        sa = new SharedAnnotation(sa);
                        this.pebl.storage.saveSharedAnnotations(userProfile, [sa]);
                    }
                    let stored = new Date(sa.stored).getTime();
                    if ((sa instanceof SharedAnnotation) &&
                        (stored >= (this.notificationTimestamps["sa" + sa.book] || 0)) &&
                        (!this.clearedNotifications[sa.id])) {

                        if (userProfile.identity !== sa.getActorId()) {
                            this.pebl.storage.saveNotification(userProfile, sa);
                            this.pebl.emitEvent(this.pebl.events.incomingNotifications, [sa]);
                        } else {
                            this.pebl.storage.saveOutgoingXApi(userProfile, {
                                id: sa.id,
                                identity: userProfile.identity,
                                requestType: "deleteNotification",
                                records: [{
                                    id: sa.id,
                                    type: "sharedAnnotation",
                                    location: sa.book,
                                    stored: sa.stored
                                }]
                            });
                        }
                    }
                    if (stored > timestamp)
                        timestamp = stored;

                    this.pebl.storage.saveSyncTimestamps(userProfile.identity, generateGroupSharedAnnotationsSyncTimestampsKey(sa.groupId), timestamp, () => {
                        this.pebl.emitEvent(this.pebl.events.incomingSharedAnnotations, [sa]);
                    });
                });
            }
        }

        this.messageHandlers.loggedOut = (userProfile, payload) => {
            if (window.PeBLConfig && window.PeBLConfig.guestLogin) {
                if (userProfile.identity === 'guest')
                    return;
            }

            self.pebl.storage.removeCurrentUser(() => {
                this.notificationTimestamps = {};
                this.clearedNotifications = {};
                self.pebl.emitEvent(self.pebl.events.eventRefreshLogin, null);
            });
        }

        // this.messageHandlers.requestUpload = (userProfile, payload) => {
        //     this.pebl.network.uploadAsset(payload.filename, payload.activityId);
        // }

        this.messageHandlers.error = (userProfile, payload) => {
            consoleLog("Message failed", payload);
        }

        this.messageHandlers.getChapterCompletionPercentages = (userProfile, payload) => {
            this.pebl.emitEvent(this.pebl.events.getChapterCompletionPercentages, payload.data);
        }

        this.messageHandlers.getMostAnsweredQuestions = (userProfile, payload) => {
            this.pebl.emitEvent(this.pebl.events.getMostAnsweredQuestions, payload.data);
        }

        this.messageHandlers.getLeastAnsweredQuestions = (userProfile, payload) => {
            this.pebl.emitEvent(this.pebl.events.getLeastAnsweredQuestions, payload.data);
        }

        this.messageHandlers.getQuizAttempts = (userProfile, payload) => {
            this.pebl.emitEvent(this.pebl.events.getQuizAttempts, payload.data);
        }

        this.messageHandlers.getReportedThreadedMessages = (userProfile, payload) => {
            this.pebl.emitEvent(this.pebl.events.getReportedThreadedMessages, payload.data);
        }
    }

    activate(callback?: (() => void)): void {
        if (!this.active) {
            this.active = true;
            this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;
            let makeWebSocketConnection = () => {
                if (this.pebl.config && this.pebl.config.PeBLServicesWSURL) {
                    if (this.websocket) {
                        this.websocket.close();
                        this.websocket = undefined;
                    }
                    this.websocket = new WebSocket(this.pebl.config.PeBLServicesWSURL);
                    this.websocket.onopen = () => {
                        consoleLog('websocket opened');
                        this.reconnectionBackoffResetHandler = setTimeout(
                            () => {
                                this.reconnectionBackoff = this.DEFAULT_RECONNECTION_BACKOFF;
                            },
                            this.DEFAULT_RECONNECTION_BACKOFF
                        );
                    }

                    this.websocket.onclose = () => {
                        consoleLog("Web socket closed retrying in " + this.reconnectionBackoff, event);
                        this.serverReady = false;
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
                        consoleLog("Web socket error retrying in " + this.reconnectionBackoff, event);
                        this.serverReady = false;
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
                                consoleLog('message recieved');
                                var parsedMessage = JSON.parse(message.data);

                                if (this.messageHandlers[parsedMessage.requestType]) {
                                    this.messageHandlers[parsedMessage.requestType](userProfile, parsedMessage);
                                } else {
                                    consoleLog("Unknown request type", parsedMessage.requestType, parsedMessage);
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
            } else {
                if (callback)
                    callback();
            }
        } else {
            if (callback) {
                callback();
            }
        }
    }

    private mergeRequests(outgoing: { [key: string]: any }[]): { [key: string]: any }[] {
        let compressedOutgoing: { [key: string]: any }[] = [];
        let userRequestTypes: { [key: string]: { [key: string]: any } } = {};

        for (let i = 0; i < outgoing.length; i++) {
            let packet = outgoing[i];
            let requestTypes = userRequestTypes[packet.identity];
            if (!requestTypes) {
                requestTypes = {};
                userRequestTypes[packet.identity] = requestTypes;
            }
            if (!requestTypes[packet.requestType]) {
                requestTypes[packet.requestType] = [];
            }
            requestTypes[packet.requestType].push(packet);
        }

        for (let user in userRequestTypes) {
            let requestTypes = userRequestTypes[user];
            for (let requestType in requestTypes) {
                let objs: { [key: string]: any }[] = requestTypes[requestType];
                let mergedRequestType: { [key: string]: any } = {
                    requestType: requestType,
                    identity: user
                };
                for (let obj of objs) {
                    for (let key of Object.keys(obj)) {
                        if ((key !== "id") && (key !== "requestType") && (key !== "identity")) {
                            let val = obj[key];
                            if (!mergedRequestType[key])
                                mergedRequestType[key] = []
                            if (val instanceof Array) {
                                mergedRequestType[key].push(...val);
                            } else if ((typeof val === "string") || (typeof val === "number") || (val instanceof Object)) {
                                mergedRequestType[key].push(val);
                            } else {
                                throw new Error("unknown merge type");
                            }
                        }
                    }
                }
                compressedOutgoing.push(mergedRequestType);
            }
        }

        return compressedOutgoing;
    }

    push(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.serverReady && this.websocket && this.websocket.readyState === 1) {
                this.websocket.send(JSON.stringify({
                    requestType: "bulkPush",
                    identity: userProfile.identity,
                    data: this.mergeRequests(outgoing)
                }));
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    pushActivity(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.serverReady && this.websocket && this.websocket.readyState === 1) {
                for (let message of outgoing) {
                    consoleLog(message);
                    this.websocket.send(JSON.stringify(message));
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    // pullNotifications(): void {
    //     this.pebl.user.getUser((userProfile) => {
    //         if (userProfile && this.websocket && this.websocket.readyState === 1) {
    //             this.pebl.storage.getSyncTimestamps(userProfile.identity, SYNC_NOTIFICATIONS, (timestamp: number) => {
    //                 let message = {
    //                     identity: userProfile.identity,
    //                     requestType: "getNotifications",
    //                     timestamp: timestamp + 1
    //                 }
    //                 if (this.websocket) {
    //                     this.websocket.send(JSON.stringify(message));
    //                 }
    //             });
    //         }
    //     });
    // }

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
                if (userProfile.groups) {
                    for (let groupId of userProfile.groups) {
                        ((groupId) => {
                            this.pebl.storage.getSyncTimestamps(userProfile.identity, generateGroupSharedAnnotationsSyncTimestampsKey(groupId), (timestamp: number) => {
                                let message = {
                                    identity: userProfile.identity,
                                    requestType: "getSharedAnnotations",
                                    timestamp: timestamp + 1,
                                    groupId: groupId
                                }
                                if (this.websocket) {
                                    this.websocket.send(JSON.stringify(message));
                                }
                            })

                            this.pebl.storage.saveOutgoingXApi(userProfile, {
                                id: this.pebl.utils.getUuid(),
                                identity: userProfile.identity,
                                requestType: "subscribeSharedAnnotations",
                                groupId: groupId
                            });
                        })(groupId)
                    }
                }
            }
        });
    }

    pullVariables(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && this.websocket && this.websocket.readyState === 1) {
                this.pebl.storage.getSyncTimestamps(userProfile.identity, 'variables', (timestamp: number) => {
                    let message = {
                        identity: userProfile.identity,
                        requestType: "getVariables",
                        timestamp: timestamp + 1
                    }
                    if (this.websocket) {
                        this.websocket.send(JSON.stringify(message));
                    }
                })
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

    private handlePrivateMessage(userProfile: UserProfile,
        message: any,
        thread: string,
        privateThreadSyncTimestamps: { [key: string]: any }): void {

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

    private handleGroupMessage(userProfile: UserProfile,
        message: any,
        thread: string,
        groupId: string,
        groupThreadSyncTimestamps: { [key: string]: any }): void {

        let m;
        if (Voided.is(message)) {
            m = new Voided(message);
            this.pebl.storage.removeMessage(userProfile, m.target);
            this.pebl.storage.removeNotification(userProfile, m.target);
            this.pebl.emitEvent(this.pebl.events.incomingNotifications, [m]);
        } else {
            m = new Message(message);
            this.pebl.storage.saveMessages(userProfile, [m]);
        }
        let stored = new Date(m.stored).getTime();
        if ((m instanceof Message) &&
            (stored >= (this.notificationTimestamps[m.thread] || 0)) &&
            (!this.clearedNotifications[m.id])) {

            if (userProfile.identity !== m.getActorId()) {
                this.pebl.storage.saveNotification(userProfile, m);
                this.pebl.emitEvent(this.pebl.events.incomingNotifications, [m]);
            } else {
                this.pebl.storage.saveOutgoingXApi(userProfile, {
                    id: m.id,
                    identity: userProfile.identity,
                    requestType: "deleteNotification",
                    records: [{
                        id: m.id,
                        type: "message",
                        location: m.thread,
                        stored: m.stored
                    }]
                });
            }
        }

        if (!groupThreadSyncTimestamps[groupId])
            groupThreadSyncTimestamps[groupId] = {};

        if (!groupThreadSyncTimestamps[groupId][thread])
            groupThreadSyncTimestamps[groupId][thread] = 1;

        if (stored > groupThreadSyncTimestamps[groupId][thread])
            groupThreadSyncTimestamps[groupId][thread] = stored;
        this.pebl.emitEvent(thread + GROUP_PREFIX + groupId, [m]);
    }

    private handleMessage(userProfile: UserProfile,
        message: any,
        thread: string,
        threadSyncTimestamps: { [key: string]: any }): void {

        let m;
        if (Voided.is(message)) {
            m = new Voided(message);
            this.pebl.storage.removeMessage(userProfile, m.target);
            this.pebl.storage.removeNotification(userProfile, m.target);
        } else {
            m = new Message(message);
            this.pebl.storage.saveMessages(userProfile, [m]);
        }

        let stored = new Date(m.stored).getTime();
        //No notifications for general messages
        // if ((m instanceof Message) &&
        //     (stored >= (this.notificationTimestamps[m.thread] || 0)) &&
        //     (!this.clearedNotifications[m.id])) {

        //     if (userProfile.identity !== m.getActorId()) {
        //         this.pebl.storage.saveNotification(userProfile, m);
        //         this.pebl.emitEvent(this.pebl.events.incomingNotifications, [m]);
        //     } else {
        //         this.pebl.storage.saveOutgoingXApi(userProfile, {
        //             id: m.id,
        //             identity: userProfile.identity,
        //             requestType: "deleteNotification",
        //             records: [{
        //                 id: m.id,
        //                 type: "message",
        //                 location: m.thread,
        //                 stored: m.stored
        //             }]
        //         });
        //     }
        // }

        if (!threadSyncTimestamps[thread])
            threadSyncTimestamps[thread] = 1;

        if (stored > threadSyncTimestamps[thread])
            threadSyncTimestamps[thread] = stored;
        this.pebl.emitEvent(thread, [m]);
    }
}
