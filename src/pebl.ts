class PEBL {

    // private static onReadyCallbacks: (() => void)[];

    private subscribedEventHandlers: { [eventName: string]: EventListener[] } = {};

    readonly teacher: boolean;
    readonly enableDirectMessages: boolean;

    readonly storage: StorageAdapter;
    readonly user: UserAdapter;
    readonly activity: ActivityAdapter;
    readonly network: NetworkAdapter;
    readonly messager: MessageAdapter;
    // readonly launcher: LauncherAdapter;
    readonly xapiGenerator: XApiGenerator;

    constructor(config: { [key: string]: any }, callback: (pebl: PEBL) => void) {

        this.subscribedEventHandlers = {};

        this.teacher = config.teacher;
        this.enableDirectMessages = config.enableDirectMessages;

        this.user = new User(this);
        this.activity = new Activity(this);
        this.network = new Network(this);
        this.messager = new Messenger(this);
        this.xapiGenerator = new XApiGenerator();

        let self = this;
        if (config.useIndexedDB) {
            this.storage = new IndexedDBStorageAdapter(function() {
                callback(self);
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

            callback(this);
        }
    }

    unsubscribeAllEvents(): void {
        for (let key of Object.keys(this.subscribedEventHandlers)) {
            for (let handler of this.subscribedEventHandlers[key])
                document.removeEventListener(key, handler);
        }
    }

    unsubscribeAllThreads(): void {
        for (let key of Object.keys(this.subscribedEventHandlers)) {
            for (let handler of this.subscribedEventHandlers[key])
                document.removeEventListener(key, handler);
        }
    }

    subscribeEvent(eventName: string, once: boolean, callback: EventListener): void {
        if (once)
            document.addEventListener(eventName, callback, <any>{ once: once });
        else {
            document.addEventListener(eventName, callback);
        }
    }

    subscribeThread(thread: string, callback: (stmts: XApiStatement[]) => void): void {
        this.messager.subscribe(thread, callback);
    }

    emitEvent(eventName: string, data: any): void {
        let e = document.createEvent("CustomEvent");
        e.initEvent(eventName, true, true);
        document.dispatchEvent(e);
    }
}

