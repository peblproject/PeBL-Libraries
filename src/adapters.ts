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

import { XApiStatement, Reference, Message, Annotation, SharedAnnotation, Membership, ProgramAction, ModuleEvent } from "./xapi";
import { UserProfile } from "./models";
import { Activity } from "./activity";

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
}

// -------------------------------

export interface SyncProcess {
    push(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void;

    pushActivity(outgoing: { [key: string]: any }[], callback: (success: boolean) => void): void;

    activate(callback?: (() => void)): void;
    disable(callback?: (() => void)): void;
}

// -------------------------------

export interface NetworkAdapter {
    activate(callback?: (() => void)): void;
    disable(callback?: (() => void)): void;

    queueReference(ref: Reference): void;

    retrievePresence(): void;

    push(finished: (() => void)): void;

    uploadAsset(file: File, activityId: string): Promise<string>;
    fetchAsset(assetId: string): Promise<File>;
}

// -------------------------------

export interface StorageAdapter {

    getAnnotations(userProfile: UserProfile, book: string, callback: (stmts: Annotation[]) => void): void;

    saveAnnotations(userProfile: UserProfile, stmts: (Annotation | Annotation[]), callback?: (() => void)): void;

    saveSharedAnnotations(userProfile: UserProfile, stmts: (SharedAnnotation | SharedAnnotation[]), callback?: (() => void)): void;

    getSharedAnnotations(userProfile: UserProfile, book: string, callback: (stmts: SharedAnnotation[]) => void): void;

    removeAnnotation(userProfile: UserProfile, id: string, callback?: (() => void)): void;

    removeSharedAnnotation(userProfile: UserProfile, id: string, callback?: (() => void)): void;


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

    saveCurrentBookTitle(book: string, callback?: (() => void)): void;

    getCurrentBookTitle(callback: (book?: string) => void): void;

    saveCurrentBookId(book: string, callback?: (() => void)): void;

    getCurrentBookId(callback: (book?: string) => void): void;

    saveCurrentBookType(book: string, callback?: (() => void)): void;

    getCurrentBookType(callback: (book?: string) => void): void;


    saveEvent(userProfile: UserProfile, event: (XApiStatement | XApiStatement[]), callback?: (() => void)): void;

    getEvents(userProfile: UserProfile, book: string, callback: (stmts: XApiStatement[]) => void): void;


    getCompetencies(userProfile: UserProfile, callback: (competencies: { [key: string]: any }) => void): void;

    saveCompetencies(userProfile: UserProfile, competencies: { [key: string]: any }, callback?: (() => void)): void;


    saveOutgoingActivity(userProfile: UserProfile, stmt: { [key: string]: any }, callback?: (() => void)): void;

    getOutgoingActivity(userProfile: UserProfile, callback: (stmts: { [key: string]: any }[]) => void): void;

    removeOutgoingActivity(userProfile: UserProfile, toClear: { [key: string]: any }, callback?: (() => void)): void;


    saveOutgoingXApi(userProfile: UserProfile, stmt: { [key: string]: any }, callback?: (() => void)): void;

    getOutgoingXApi(userProfile: UserProfile, callback: (stmts: { [key: string]: any }[]) => void): void;

    removeOutgoingXApi(userProfile: UserProfile, toClear: { [key: string]: any }[], callback?: (() => void)): void;


    saveMessages(userProfile: UserProfile, stmts: (Message | Message[]), callback?: (() => void)): void;

    getMessages(userProfile: UserProfile, thread: string, callback: (stmts: Message[]) => void): void;

    removeMessage(userProfile: UserProfile, id: string, callback?: () => void): void;


    saveAsset(assetId: string, data: { [key: string]: any }, callback?: (() => void)): void;

    getAsset(assetId: string): Promise<File>;

    saveVariable(id: string, data: any, callback?: (() => void)): void;

    getVariable(id: string): Promise<any>;


    saveQueuedReference(userProfile: UserProfile, ref: Reference, callback?: (() => void)): void;

    getQueuedReference(userProfile: UserProfile, currentBook: string, callback: (ref?: Reference) => void): void;

    removeQueuedReference(userProfile: UserProfile, refId: string, callback?: (() => void)): void;


    saveNotification(userProfile: UserProfile, notification: XApiStatement, callback?: (() => void)): void;

    getNotifications(userProfile: UserProfile, callback: ((stmts: XApiStatement[]) => void)): void;

    getNotification(userProfile: UserProfile, notificationId: string, callback: ((stmts?: XApiStatement) => void)): void;

    removeNotification(userProfile: UserProfile, notificationId: string, callback?: (() => void)): void;


    saveToc(userProfile: UserProfile, book: string, tocEntry: { [key: string]: any }, callback?: (() => void)): void;

    getToc(userProfile: UserProfile, book: string, callback: (tocEntries: { [key: string]: any }[]) => void): void;

    removeToc(userProfile: UserProfile, book: string, section: string, id: string, callback?: (() => void)): void;


    saveGroupMembership(userProfile: UserProfile, stmts: (Membership | Membership[]), callback?: (() => void)): void;

    getGroupMembership(userProfile: UserProfile, callback: (groups: Membership[]) => void): void;

    removeGroupMembership(userProfile: UserProfile, groupId: string, callback?: (() => void)): void;


    saveActivityEvent(userProfile: UserProfile, stmts: (ProgramAction | ProgramAction[]), callback?: (() => void)): void;

    getActivityEvent(programId: string, callback: (events: ProgramAction[]) => void): void;


    saveModuleEvent(userProfile: UserProfile, stmts: (ModuleEvent | ModuleEvent[]), callback?: (() => void)): void;

    getModuleEvent(idref: string, callback: (events: ModuleEvent[]) => void): void;

    removeModuleEvent(idref: string, id: string, callback?: (() => void)): void;


    saveSyncTimestamps(identity: string, key: string, data: number, callback: (worked: boolean) => void): void;

    getSyncTimestamps(identity: string, key: string, callback: (timestamp: number) => void): void;

    saveCompoundSyncTimestamps(identity: string, key: string,
        data: { [thread: string]: number } | { [group: string]: { [thread: string]: number } },
        callback: (worked: boolean) => void): void;

    getCompoundSyncTimestamps(identity: string, key: string,
        callback: (timestamps: { [thread: string]: any }) => void): void;



    saveActivity(userProfile: UserProfile, stmts: (Activity | Activity[]), callback?: (() => void)): void;

    getActivity(userProfile: UserProfile, activityType: string, callback: (groups: Activity[]) => void): void;

    removeActivity(userProfile: UserProfile, xId: string, activityType: string, callback?: (() => void)): void;

    getActivityById(userProfile: UserProfile, activityType: string, activityId: string, callback: (activity?: Activity) => void): void;
}
// -------------------------------

export interface PEBLHandler extends EventListener {
    (stmts: (XApiStatement[] | Activity[])): void;
}

// -------------------------------
