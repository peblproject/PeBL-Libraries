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
    // readonly launcher: LauncherAdapter;

    constructor(config?: { [key: string]: any }, callback?: (pebl: PEBL) => void) {
        this.extension = {};

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
        this.storage = new IndexedDBStorageAdapter(function() {
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
        for (let pack of this.subscribedEventHandlers[eventName]) {
            if ((pack.once == once) && (pack.fn == callback)) {
                document.removeEventListener(eventName, pack.modifiedFn);
                this.subscribedEventHandlers[eventName].splice(i, 1);
                return;
            }
            i++;
        }
    }

    unsubscribeThread(thread: string, once: boolean, callback: PEBLHandler): void {
        let i = 0;
        for (let pack of this.subscribedThreadHandlers[thread]) {
            if ((pack.once == once) && (pack.fn == callback)) {
                document.removeEventListener(thread, pack.modifiedFn);
                this.subscribedThreadHandlers[thread].splice(i, 1);
                return;
            }
            i++;
        }
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
        }
    }

    //fix once for return of getMessages
    subscribeThread(thread: string, once: boolean, callback: PEBLHandler): void {
        let threadCallbacks = this.subscribedThreadHandlers[thread];
        if (!threadCallbacks) {
            threadCallbacks = [];
            this.subscribedThreadHandlers[thread] = threadCallbacks;
        }

        if (once) {
            var modifiedHandler = <PEBLHandler>function(e: CustomEvent) {
                self.unsubscribeEvent(thread, once, callback);
                callback(e.detail);
            }
            document.addEventListener(thread, modifiedHandler, <any>{ once: once });
            threadCallbacks.push({ once: once, fn: callback, modifiedFn: modifiedHandler });
        } else {
            var modifiedHandler = <PEBLHandler>function(e: CustomEvent) { callback(e.detail); };
            document.addEventListener(thread, modifiedHandler);
            threadCallbacks.push({ once: once, fn: callback, modifiedFn: modifiedHandler });
        }

        let self = this;
        this.user.getUser(function(userProfile) {
            if (userProfile)
                self.storage.getMessages(userProfile, thread, callback);
            else
                callback([]);
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
