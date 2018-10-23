interface ActivityAdapter {

    readonly book: string;
    readonly previousBook: string;
    readonly sameBook: boolean;
    readonly parentActivity: string;

    openBook(containerPath: string, callback: (sameBook: boolean) => void): void;

    initializeToc(toc: object): void;
    getToc(callback: object): void;

    clearParentActivity(): void;
    startParentActivity(activity: string): void;
}

interface MessageAdapter {
    setDirectMessageHandler(callback: (messages: XApiStatement[]) => void): void;

    getThreads(callback: (threads: object[]) => void): void;

    unsubscribeAll(): void;
    subscribe(thread: string, callback: (stmts: XApiStatement[]) => void): void;

    setAssetNotificationHandler(callback: (stmt: XApiStatement) => void): void;

    queueReference(ref: Reference): void;
}

interface LauncherAdapter {
    connect(): void;
    close(): void;
    setLaunchHandler(callback: (payload: object) => void): void;
}

interface UserAdapter {
    readonly user: UserProfile;
    readonly loggedIn: boolean;
    readonly isSameUser: boolean;

    login(): void;
    loginAs(username: string, password: string, callback: () => void): void;

    logout(): void;
}

interface SyncProcess {
    pull(): void;

    push(outgoing: XApiStatement[], callback: (target: Endpoint, result: boolean) => void): void;

    terminate(): void;
}

interface NetworkAdapter {
    activate(teacher: boolean): void;
    disable(): void;

    push(): void;
}

interface StorageAdapter {

    getAnnotations(userProfile: UserProfile, book: string, callback: (stmts: Annotation[]) => void): void;

    saveAnnotations(userProfile: UserProfile, book: string, stmts: (Annotation | Annotation[])): void;

    saveGeneralAnnotations(userProfile: UserProfile, book: string, stmts: (GeneralAnnotation | GeneralAnnotation[])): void;

    getGeneralAnnotations(userProfile: UserProfile, book: string, callback: (stmts: GeneralAnnotation[]) => void): void;

    removeAnnotation(userProfile: UserProfile, id: string, book: string): void;

    removeGeneralAnnotation(userProfile: UserProfile, id: string, book: string): void;


    saveCurrentUser(userProfile: UserProfile, callback: () => void): void;

    getCurrentUser(callback: (userIdentity: (string | null)) => void): void;

    getUserProfile(userIdentity: string, callback: (userProfile: (UserProfile | null)) => void): void;

    saveUserProfile(userProfile: UserProfile): void;


    saveCurrentBook(book: string): void;

    getCurrentBook(callback: (book: (string | null)) => void): void;


    saveEvent(userProfile: UserProfile, book: string, event: (XApiStatement | XApiStatement[])): void;

    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void;


    getCompetencies(userProfile: UserProfile, callback: (competencies: object) => void): void;

    saveCompetencies(userProfile: UserProfile, competencies: object): void;


    saveOutgoing(userProfile: UserProfile, stmt: XApiStatement): void;

    getOutgoing(userProfile: UserProfile, callback: (stmts: XApiStatement[]) => void): void;

    clearOutgoing(userProfile: UserProfile, toClear: XApiStatement[]): void;


    saveMessage(userProfile: UserProfile, stmts: (XApiStatement | XApiStatement[])): void;

    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: XApiStatement[]) => void): void;


    saveAsset(assetId: string, data: object): void;

    getAsset(assetId: string, callback: (data: object) => void): void;


    saveQueuedReference(userProfile: UserProfile, ref: Reference): void;

    getQueuedReference(userProfile: UserProfile, callback: (ref: (Reference | null)) => void): void;

    removeQueuedReference(userProfile: UserProfile, refId: string): void;


    saveToc(userProfile: UserProfile, book: string, data: object): void;

    getToc(userProfile: UserProfile, book: string, callback: (data: object) => void): void;

    removeToc(userProfile: UserProfile, book: string, section: string, id: string): void;
}

interface PeblHandler {

}
