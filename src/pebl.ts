import { IndexedDBStorageAdapter } from "./storage";
import { Activity } from "./activity";
import { User } from "./user";
import { Network } from "./network";
// import { Messenger } from "./messenger";
import { EventSet } from "./eventSet";
import { StorageAdapter, UserAdapter, ActivityAdapter, NetworkAdapter, PEBLHandler } from "./adapters";
import { PEBLEventHandlers } from "./eventHandlers"

export class PEBL {

    private firedEvents: Event[] = [];

    readonly subscribedEventHandlers: { [eventName: string]: PEBLHandler[] } = {};

    readonly subscribedThreadHandlers: { [thread: string]: PEBLHandler[] } = {};

    readonly teacher: boolean;
    readonly enableDirectMessages: boolean;
    readonly useIndexedDB: boolean;
    private loaded: boolean = false;

    readonly events: EventSet;
    readonly eventHandlers: PEBLEventHandlers;
    readonly storage: StorageAdapter;
    readonly user: UserAdapter;
    readonly activity: ActivityAdapter;
    readonly network: NetworkAdapter;
    // readonly launcher: LauncherAdapter;

    constructor(config?: { [key: string]: any }, callback?: (pebl: PEBL) => void) {

        if (config) {
            this.teacher = config.teacher;
            this.enableDirectMessages = config.enableDirectMessages;
            this.useIndexedDB = config.useIndexedDB;
        } else {
            this.teacher = false;
            this.enableDirectMessages = true;
            this.useIndexedDB = true;
        }

        this.eventHandlers = new PEBLEventHandlers(this);
        this.events = new EventSet();
        this.user = new User(this);
        this.activity = new Activity(this);
        this.network = new Network(this);

        let self = this;
        if (this.useIndexedDB) {
            this.storage = new IndexedDBStorageAdapter(function() {
                self.loaded = true;
                self.addSystemEventListeners();
                if (callback)
                    callback(self);
                self.processQueuedEvents();
            });
        } else {
            this.storage = new IndexedDBStorageAdapter(function() { });
            // if (localStorage != null) {
            //     this.storage;
            // } else if (sessionStorage != null) {
            //     this.storage;
            // } else {
            //     this.storage;
            // }

            this.loaded = true;
            this.addSystemEventListeners();
            if (callback)
                callback(this);
            self.processQueuedEvents();
        }
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
            for (let handler of this.subscribedEventHandlers[key])
                document.removeEventListener(key, handler);
            delete this.subscribedEventHandlers[key];
        }
    }

    unsubscribeAllThreads(): void {
        for (let key of Object.keys(this.subscribedEventHandlers)) {
            for (let handler of this.subscribedEventHandlers[key])
                document.removeEventListener(key, handler);
            delete this.subscribedEventHandlers[key];
        }
    }

    unsubscribeEvent(eventName: string, once: boolean, callback: EventListener): void {
        new Error("Method not implemented");
    }

    unsubscribeThread(thread: string, once: boolean, callback: EventListener): void {
        new Error("Method not implemented");
    }

    subscribeEvent(eventName: string, once: boolean, callback: PEBLHandler): void {
        if (!this.subscribedEventHandlers[eventName])
            this.subscribedEventHandlers[eventName] = [];
        this.subscribedEventHandlers[eventName].push(callback);

        if (once) {
            let self = this;
            document.addEventListener(eventName,
                function(e) {
                    self.subscribedEventHandlers[eventName] = self.subscribedEventHandlers[eventName].filter(function(x) {
                        return (x != callback);
                    });
                    callback(e);
                },
                <any>{ once: once });
        } else {
            document.addEventListener(eventName, callback);
        }
    }

    subscribeThread(thread: string, callback: PEBLHandler): void {
        let threadCallbacks = this.subscribedThreadHandlers[thread];
        if (threadCallbacks) {
            threadCallbacks = [];
            this.subscribedThreadHandlers[thread] = threadCallbacks;
        }

        threadCallbacks.push(callback);

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
