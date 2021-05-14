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

const USER_PREFIX = "_user-";
const GROUP_PREFIX = "_group-";

import { IndexedDBStorageAdapter } from "./storage";
// import { Activity } from "./activity";
import { User } from "./user";
import { Network } from "./network";
// import { Messenger } from "./messenger";
import { EventSet } from "./eventSet";
import { Utils } from "./utils";
import { StorageAdapter, UserAdapter, NetworkAdapter, PEBLHandler } from "./adapters";
import { PEBLEventHandlers } from "./eventHandlers"

export class PEBL {

    private firedEvents: Event[] = [];

    readonly subscribedEventHandlers: { [eventName: string]: { once: boolean, fn: PEBLHandler, modifiedFn: EventListener }[] } = {};

    readonly subscribedSingularEventHandlers: { [eventName: string]: { [id: string]: { once: boolean, fn: PEBLHandler, modifiedFn: EventListener } } } = {};

    readonly subscribedThreadHandlers: { [thread: string]: { once: boolean, fn: PEBLHandler, modifiedFn: EventListener }[] } = {};

    readonly teacher: boolean;
    readonly enableDirectMessages: boolean;
    readonly useIndexedDB: boolean;

    readonly extension: { [key: string]: any };
    private loaded: boolean = false;

    readonly events: EventSet;
    readonly eventHandlers: PEBLEventHandlers;
    readonly storage: StorageAdapter;
    readonly user: UserAdapter;
    readonly network: NetworkAdapter;
    readonly utils: Utils;
    readonly config?: { [key: string]: any };

    // readonly launcher: LauncherAdapter;

    constructor(config?: { [key: string]: any }, callback?: (pebl: PEBL) => void) {
        this.extension = {};
        // this.extension.shared = {};
        this.config = config;

        if (config) {
            this.teacher = config.teacher;
            this.enableDirectMessages = config.enableDirectMessages;
            this.useIndexedDB = config.useIndexedDB;
        } else {
            this.teacher = false;
            this.enableDirectMessages = true;
            this.useIndexedDB = true;
        }

        this.utils = new Utils(this);
        this.eventHandlers = new PEBLEventHandlers(this);
        this.events = new EventSet();
        this.user = new User(this);
        this.network = new Network(this);

        let self = this;
        // if (this.useIndexedDB) {
        this.storage = new IndexedDBStorageAdapter(this, function() {
            self.loaded = true;
            self.addSystemEventListeners();
            if (callback)
                callback(self);
            self.processQueuedEvents();
        });
        // } else {
        //     this.storage = new IndexedDBStorageAdapter(function() { });
        //     // if (localStorage != null) {
        //     //     this.storage;
        //     // } else if (sessionStorage != null) {
        //     //     this.storage;
        //     // } else {
        //     //     this.storage;
        //     // }

        //     this.loaded = true;
        //     this.addSystemEventListeners();
        //     if (callback)
        //         callback(this);
        //     self.processQueuedEvents();
        // }
    }

    private addListener(event: string, callback: (event: Event) => void): void {
        document.removeEventListener(event, callback);
        document.addEventListener(event, callback);
    }

    private addSystemEventListeners(): void {
        let events = Object.keys(this.events);
        for (let event of events) {
            let listener = this.eventHandlers[event];
            if (listener) {
                let call = listener.bind(this.eventHandlers)
                this.addListener(event, call);
            }
        }
    }

    private processQueuedEvents(): void {
        for (let e of this.firedEvents) {
            document.dispatchEvent(e);
        }
        this.firedEvents = [];
    }

    unsubscribeAllEvents(): void {
        for (let key of Object.keys(this.subscribedEventHandlers)) {
            for (let pack of this.subscribedEventHandlers[key])
                document.removeEventListener(key, pack.modifiedFn);
            delete this.subscribedEventHandlers[key];
        }

        for (let key of Object.keys(this.subscribedSingularEventHandlers)) {
            for (let pack of Object.keys(this.subscribedSingularEventHandlers[key])) {
                document.removeEventListener(key, this.subscribedSingularEventHandlers[key][pack].modifiedFn);
            }

            delete this.subscribedSingularEventHandlers[key];
        }
    }

    unsubscribeAllThreads(): void {
        for (let key of Object.keys(this.subscribedEventHandlers)) {
            for (let pack of this.subscribedEventHandlers[key])
                document.removeEventListener(key, pack.modifiedFn);
            delete this.subscribedEventHandlers[key];
        }
    }

    unsubscribeEvent(eventName: string, once: boolean, callback: PEBLHandler): void {
        let i = 0;
        if (this.subscribedEventHandlers[eventName]) {
            for (let pack of this.subscribedEventHandlers[eventName]) {
                if ((pack.once == once) && (pack.fn == callback)) {
                    document.removeEventListener(eventName, pack.modifiedFn);
                    this.subscribedEventHandlers[eventName].splice(i, 1);
                    return;
                }
                i++;
            }
        }
    }

    unsubscribeSingularEvent(eventName: string, id: string): void {
        if (this.subscribedSingularEventHandlers[eventName] && this.subscribedSingularEventHandlers[eventName][id]) {
            document.removeEventListener(eventName, this.subscribedSingularEventHandlers[eventName][id].modifiedFn);
            delete this.subscribedSingularEventHandlers[eventName][id];
        }
    }

    unsubscribeThread(baseThread: string, once: boolean, callback: PEBLHandler, options?: { [key: string]: any }): void {
        this.user.getUser((userProfile) => {
            if (userProfile) {
                let thread = baseThread;
                if (options && options.groupId) {
                    thread = baseThread + GROUP_PREFIX + options.groupId;
                } else if (options && options.isPrivate) {
                    thread = baseThread + USER_PREFIX + userProfile.identity;
                }

                let message = {
                    id: this.utils.getUuid(),
                    identity: userProfile.identity,
                    requestType: "unsubscribeThread",
                    thread: baseThread,
                    options: options
                }
                this.storage.saveOutgoingXApi(userProfile, message);


                let i = 0;
                if (this.subscribedThreadHandlers[thread]) {
                    for (let pack of this.subscribedThreadHandlers[thread]) {
                        if ((pack.once == once) && (pack.fn == callback)) {
                            document.removeEventListener(thread, pack.modifiedFn);
                            this.subscribedThreadHandlers[thread].splice(i, 1);
                            return;
                        }
                        i++;
                    }
                }
            }
        });
    }

    subscribeEvent(eventName: string, once: boolean, callback: PEBLHandler): void {
        if (!this.subscribedEventHandlers[eventName])
            this.subscribedEventHandlers[eventName] = [];

        let self = this;
        //fix once for return of annotations
        if (once) {
            var modifiedHandler = <PEBLHandler>function(e: CustomEvent) {
                self.unsubscribeEvent(eventName, once, callback);
                callback(e.detail);
            }
            document.addEventListener(eventName, modifiedHandler, <any>{ once: once });
            this.subscribedEventHandlers[eventName].push({ once: once, fn: callback, modifiedFn: modifiedHandler });
        } else {
            var modifiedHandler = <PEBLHandler>function(e: CustomEvent) { callback(e.detail); };
            document.addEventListener(eventName, modifiedHandler);
            this.subscribedEventHandlers[eventName].push({ once: once, fn: callback, modifiedFn: modifiedHandler });
        }

        if (eventName == self.events.incomingAnnotations) {
            self.utils.getAnnotations(function(annotations) {
                callback(annotations);
            });
        } else if (eventName == self.events.incomingSharedAnnotations) {
            self.utils.getSharedAnnotations(function(annotations) {
                callback(annotations);
            });
        } else if (eventName == self.events.incomingPresence) {
            self.network.retrievePresence();
        } else if (eventName == self.events.incomingProgram) {
            self.utils.getPrograms(function(programs) {
                callback(programs);
            });
        } else if (eventName == self.events.incomingMembership) {
            self.utils.getGroupMemberships(function(groups) {
                callback(groups);
            });
        }
    }

    subscribeSingularEvent(eventName: string, id: string, once: boolean, callback: PEBLHandler): void {
        this.unsubscribeSingularEvent(eventName, id);

        if (!this.subscribedSingularEventHandlers[eventName])
            this.subscribedSingularEventHandlers[eventName] = {};

        let self = this;

        if (once) {
            var modifiedHandler = <PEBLHandler>function(e: CustomEvent) {
                self.unsubscribeSingularEvent(eventName, id);
                callback(e.detail);
            }
            document.addEventListener(eventName, modifiedHandler, <any>{ once: once });
            this.subscribedSingularEventHandlers[eventName][id] = { once: once, fn: callback, modifiedFn: modifiedHandler };
        } else {
            var modifiedHandler = <PEBLHandler>function(e: CustomEvent) { callback(e.detail); };
            document.addEventListener(eventName, modifiedHandler);
            this.subscribedSingularEventHandlers[eventName][id] = { once: once, fn: callback, modifiedFn: modifiedHandler };
        }

        if (eventName == self.events.incomingAnnotations) {
            self.utils.getAnnotations(function(annotations) {
                callback(annotations);
            });
        } else if (eventName == self.events.incomingSharedAnnotations) {
            self.utils.getSharedAnnotations(function(annotations) {
                callback(annotations);
            });
        } else if (eventName == self.events.incomingPresence) {
            self.network.retrievePresence();
        } else if (eventName == self.events.incomingProgram) {
            self.utils.getPrograms(function(programs) {
                callback(programs);
            });
        } else if (eventName == self.events.incomingMembership) {
            self.utils.getGroupMemberships(function(groups) {
                callback(groups);
            });
        }
    }

    //fix once for return of getMessages
    subscribeThread(baseThread: string, once: boolean, callback: PEBLHandler, options?: { [key: string]: any }): void {
        this.user.getUser((userProfile) => {
            if (userProfile) {
                let thread = baseThread;
                if (options && options.groupId) {
                    thread = thread + GROUP_PREFIX + options.groupId;
                } else if (options && options.isPrivate) {
                    thread = thread + USER_PREFIX + userProfile.identity;
                }

                let firstRegistration = true;
                let threadCallbacks = this.subscribedThreadHandlers[thread];
                if (!threadCallbacks) {
                    threadCallbacks = [];
                    this.subscribedThreadHandlers[thread] = threadCallbacks;
                } else {
                    firstRegistration = false;
                }

                if (once) {
                    var modifiedHandler = <PEBLHandler>((e: CustomEvent) => {
                        this.unsubscribeEvent(thread, once, callback);
                        callback(e.detail);
                    });
                    document.addEventListener(thread, modifiedHandler, <any>{ once: once });
                    threadCallbacks.push({ once: once, fn: callback, modifiedFn: modifiedHandler });
                } else {
                    var modifiedHandler = <PEBLHandler>((e: CustomEvent) => { callback(e.detail); });
                    document.addEventListener(thread, modifiedHandler);
                    threadCallbacks.push({ once: once, fn: callback, modifiedFn: modifiedHandler });
                }

                if (firstRegistration) {
                    this.storage.saveOutgoingXApi(userProfile, {
                        id: this.utils.getUuid(),
                        identity: userProfile.identity,
                        requestType: "getThreadedMessages",
                        requests: [{
                            thread: baseThread,
                            options: options || {},
                            timestamp: 1
                        }]
                    });

                    this.storage.saveOutgoingXApi(userProfile, {
                        id: this.utils.getUuid(),
                        identity: userProfile.identity,
                        requestType: "subscribeThread",
                        thread: baseThread,
                        options: options || {}
                    });
                }
                this.storage.getMessages(userProfile, thread, callback);
            } else {
                callback([]);
            }
        });
    }

    emitEvent(eventName: string, data: any): void {
        let e: CustomEvent = document.createEvent("CustomEvent");
        e.initCustomEvent(eventName, true, true, data);
        if (this.loaded)
            document.dispatchEvent(e);
        else
            this.firedEvents.push(e);
    }
}
