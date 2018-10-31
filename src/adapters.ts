interface ActivityAdapter {
    getBook(callback: (book: (string | null)) => void): void;

    openBook(book: string, callback: (sameBook: boolean) => void): void;

    initializeToc(toc: object): void;
    getToc(callback: object): void;

    clearParentActivity(): void;
    getParentActivity(callback: (parentActivity: string) => void): void;
    startParentActivity(activity: string): void;
}

interface MessageAdapter {


    setDirectMessageHandler(callback: (messages: XApiStatement[]) => void): void;

    getThreads(callback: (threads: { [key: string]: ((stmts: XApiStatement[]) => void) }) => void): void;

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
    getUser(callback: (userProfile: (UserProfile | null)) => void): void;

    isLoggedIn(callback: (loggedIn: boolean) => void): void;

    login(userProfile: UserProfile, callback?: (() => void)): void;

    logout(callback?: (() => void)): void;
}

interface SyncProcess {
    pull(): void;

    push(outgoing: XApiStatement[], callback: (target: Endpoint, result: boolean) => void): void;

    terminate(): void;
}

interface NetworkAdapter {
    activate(): void;
    disable(): void;

    push(finished: (() => void)): void;
}

interface StorageAdapter {

    getAnnotations(userProfile: UserProfile, book: string, callback: (stmts: Annotation[]) => void): void;

    saveAnnotations(userProfile: UserProfile, book: string, stmts: (Annotation | Annotation[]), callback?: (() => void)): void;

    saveGeneralAnnotations(userProfile: UserProfile, book: string, stmts: (GeneralAnnotation | GeneralAnnotation[]), callback?: (() => void)): void;

    getGeneralAnnotations(userProfile: UserProfile, book: string, callback: (stmts: GeneralAnnotation[]) => void): void;

    removeAnnotation(userProfile: UserProfile, id: string, book: string, callback?: (() => void)): void;

    removeGeneralAnnotation(userProfile: UserProfile, id: string, book: string, callback?: (() => void)): void;


    saveCurrentUser(userProfile: UserProfile, callback?: (() => void)): void;

    getCurrentUser(callback: (userIdentity: (string | null)) => void): void;

    removeCurrentUser(callback?: (() => void)): void;

    getUserProfile(userIdentity: string, callback: (userProfile: (UserProfile | null)) => void): void;

    saveUserProfile(userProfile: UserProfile, callback?: (() => void)): void;


    saveCurrentBook(book: string, callback?: (() => void)): void;

    getCurrentBook(callback: (book: (string | null)) => void): void;


    saveEvent(userProfile: UserProfile, book: string, event: (XApiStatement | XApiStatement[]), callback?: (() => void)): void;

    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void;

    getCompetencies(userProfile: UserProfile, callback: (competencies: object) => void): void;

    saveCompetencies(userProfile: UserProfile, competencies: object, callback?: (() => void)): void;


    saveOutgoing(userProfile: UserProfile, stmt: XApiStatement, callback?: (() => void)): void;

    getOutgoing(userProfile: UserProfile, callback: (stmts: XApiStatement[]) => void): void;

    removeOutgoing(userProfile: UserProfile, toClear: XApiStatement[], callback?: (() => void)): void;


    saveMessages(userProfile: UserProfile, stmts: (Message | Message[]), callback?: (() => void)): void;

    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: Message[]) => void): void;

    removeMessage(userProfile: UserProfile, id: string, callback?: () => void): void;


    saveAsset(assetId: string, data: object, callback?: (() => void)): void;

    getAsset(assetId: string, callback: (data: object) => void): void;


    saveQueuedReference(userProfile: UserProfile, ref: Reference, callback?: (() => void)): void;

    getQueuedReference(userProfile: UserProfile, callback: (ref: (Reference | null)) => void): void;

    removeQueuedReference(userProfile: UserProfile, refId: string, callback?: (() => void)): void;


    saveToc(userProfile: UserProfile, book: string, data: object, callback?: (() => void)): void;

    getToc(userProfile: UserProfile, book: string, callback: (data: object) => void): void;

    removeToc(userProfile: UserProfile, book: string, section: string, id: string, callback?: (() => void)): void;
}
