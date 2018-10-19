interface ActivityAdapter {

    readonly book: string;
    readonly previousBook: string;
    readonly sameBook: boolean;
    readonly parentActivity: string;

    openBook: (containerPath: string, callback: (sameBook: boolean) => void) => void;

    initializeToc: (toc: object) => void;
    getToc: (callback: object) => void;

    clearParentActivity: () => void;
    startParentActivity: (activity: string) => void;
}

interface MessageAdapter {
    setDirectMessageHandler: (callback: (messages: XApiStatements[]) => void) => void;

    getThreads: (callback: (threads: object[]) => void) => void;

    unsubscribeAll: () => void;
    subscribe: (thread: string, callback: (stmts: XApiStatements[]) => void) => void;

    setAssetNotificationHandler: (callback: (stmt: XApiStatements) => void) => void;

    queueReference: (ref: Reference) => void;
}

interface LauncherAdapter {
    connect: () => void;
    close: () => void;
    setLaunchHandler: (callback: (payload: object) => void) => void;
}

interface UserAdapter {
    readonly user: UserProfile;
    readonly loggedIn: boolean;
    readonly isSameUser: boolean;

    login: () => void;
    loginAs: (username: string, password: string, callback: () => void) => void;

    logout: () => void;
}

interface SyncProcess {
    pull: () => void;

    push: (outgoing: XApiStatements[], callback: (target: Endpoint, result: boolean) => void) => void;

    terminate: () => void;
}

interface NetworkAdapter {
    activate: (teacher: boolean) => void;
    disable: () => void;

    push: () => void;
}

interface StorageAdapter {

}
