import { XApiStatement, Reference, Message, Annotation, GeneralAnnotation } from "./xapi";
import { UserProfile } from "./models";


export interface ActivityAdapter {
    getBook(callback: (book?: string) => void): void;

    openBook(book: string, callback: (sameBook: boolean) => void): void;

    initializeToc(toc: { [key: string]: any }): void;
    getToc(callback: { [key: string]: any }): void;

    clearParentActivity(): void;
    getParentActivity(callback: (parentActivity: string) => void): void;
    startParentActivity(activity: string): void;
}

// -------------------------------

export interface MessageAdapter {


    setDirectMessageHandler(callback: (messages: XApiStatement[]) => void): void;

    getThreads(callback: (threads: { [key: string]: ((stmts: XApiStatement[]) => void) }) => void): void;

    unsubscribeAll(): void;
    subscribe(thread: string, callback: (stmts: XApiStatement[]) => void): void;

    setAssetNotificationHandler(callback: (stmt: XApiStatement) => void): void;

    queueReference(ref: Reference): void;
}

// -------------------------------

export interface LauncherAdapter {
    connect(): void;
    close(): void;
    setLaunchHandler(callback: (payload: { [key: string]: any }) => void): void;
}

// -------------------------------

export interface UserAdapter {
    getUser(callback: (userProfile?: UserProfile) => void): void;

    isLoggedIn(callback: (loggedIn: boolean) => void): void;

    login(userProfile: UserProfile, callback?: (() => void)): void;

    logout(callback?: (() => void)): void;
}

// -------------------------------

export interface SyncProcess {
    pull(): void;

    push(outgoing: XApiStatement[], callback: (result: boolean) => void): void;

    terminate(): void;
}

// -------------------------------

export interface NetworkAdapter {
    activate(): void;
    disable(): void;

    push(finished: (() => void)): void;
}

// -------------------------------

export interface StorageAdapter {

    getAnnotations(userProfile: UserProfile, book: string, callback: (stmts: Annotation[]) => void): void;

    saveAnnotations(userProfile: UserProfile, stmts: (Annotation | Annotation[]), callback?: (() => void)): void;

    saveGeneralAnnotations(userProfile: UserProfile, stmts: (GeneralAnnotation | GeneralAnnotation[]), callback?: (() => void)): void;

    getGeneralAnnotations(userProfile: UserProfile, book: string, callback: (stmts: GeneralAnnotation[]) => void): void;

    removeAnnotation(userProfile: UserProfile, id: string, callback?: (() => void)): void;

    removeGeneralAnnotation(userProfile: UserProfile, id: string, callback?: (() => void)): void;


    saveCurrentUser(userProfile: UserProfile, callback?: (() => void)): void;

    getCurrentUser(callback: (userIdentity?: string) => void): void;

    removeCurrentUser(callback?: (() => void)): void;

    getUserProfile(userIdentity: string, callback: (userProfile?: UserProfile) => void): void;

    saveUserProfile(userProfile: UserProfile, callback?: (() => void)): void;


    saveCurrentActivity(activity: string, callback?: (() => void)): void;

    getCurrentActivity(callback: ((activity?: string) => void)): void;

    removeCurrentActivity(callback?: (() => void)): void;


    saveCurrentBook(book: string, callback?: (() => void)): void;

    getCurrentBook(callback: (book?: string) => void): void;


    saveEvent(userProfile: UserProfile, event: (XApiStatement | XApiStatement[]), callback?: (() => void)): void;

    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void;

    getCompetencies(userProfile: UserProfile, callback: (competencies: { [key: string]: any }) => void): void;

    saveCompetencies(userProfile: UserProfile, competencies: { [key: string]: any }, callback?: (() => void)): void;


    saveOutgoing(userProfile: UserProfile, stmt: XApiStatement, callback?: (() => void)): void;

    getOutgoing(userProfile: UserProfile, callback: (stmts: XApiStatement[]) => void): void;

    removeOutgoing(userProfile: UserProfile, toClear: XApiStatement[], callback?: (() => void)): void;


    saveMessages(userProfile: UserProfile, stmts: (Message | Message[]), callback?: (() => void)): void;

    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: Message[]) => void): void;

    removeMessage(userProfile: UserProfile, id: string, callback?: () => void): void;


    saveAsset(assetId: string, data: { [key: string]: any }, callback?: (() => void)): void;

    getAsset(assetId: string, callback: (data: { [key: string]: any }) => void): void;


    saveQueuedReference(userProfile: UserProfile, ref: Reference, callback?: (() => void)): void;

    getQueuedReference(userProfile: UserProfile, callback: (ref?: Reference) => void): void;

    removeQueuedReference(userProfile: UserProfile, refId: string, callback?: (() => void)): void;


    saveToc(userProfile: UserProfile, book: string, data: { [key: string]: any }, callback?: (() => void)): void;

    getToc(userProfile: UserProfile, book: string, callback: (data: { [key: string]: any }) => void): void;

    removeToc(userProfile: UserProfile, book: string, section: string, id: string, callback?: (() => void)): void;
}

// -------------------------------

export interface PEBLHandler extends EventListener {
    (stmts: XApiStatement[]): void;
}
