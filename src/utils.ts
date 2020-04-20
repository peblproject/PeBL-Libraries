import { PEBL } from "./pebl";
import { XApiStatement, Membership, ProgramAction, Message, ModuleEvent } from "./xapi";
import { Program, Activity, Institution, System } from "./activity";
import { TempMembership } from "./models";
import { SYNC_THREAD, SYNC_PRIVATE_THREAD, SYNC_GROUP_THREAD } from "./constants";

export class Utils {

    private pebl: PEBL;

    constructor(pebl: PEBL) {
        this.pebl = pebl;
    }

    getAnnotations(callback: (stmts: XApiStatement[]) => void) {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.getAnnotations(userProfile, book, callback);
                    else
                        callback([]);
                });
            } else
                callback([]);
        });
    }

    getSharedAnnotations(callback: (stmts: XApiStatement[]) => void) {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.getSharedAnnotations(userProfile, book, callback);
                    else
                        callback([]);
                });
            } else
                callback([]);
        });
    }

    initializeToc(data: { [key: string]: any }): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book) {
                        self.pebl.storage.getToc(userProfile, book,
                            function(toc: { [key: string]: any }[]): void {
                                if (toc.length == 0) {
                                    for (let section in data) {
                                        let pages = data[section];
                                        for (let pageKey in pages) {
                                            let pageMetadata = pages[pageKey];
                                            if (pageKey == "DynamicContent") {
                                                let documents = pageMetadata["documents"];
                                                for (let dynamicPageKey in documents) {
                                                    let documentMetadata = documents[dynamicPageKey];
                                                    documentMetadata["pageKey"] = dynamicPageKey;
                                                    self.pebl.storage.saveToc(userProfile, book, documentMetadata);
                                                }
                                            } else {
                                                pageMetadata["pageKey"] = pageKey;
                                                pageMetadata["section"] = section;
                                                self.pebl.storage.saveToc(userProfile, book, pageMetadata);
                                            }
                                        }
                                    }
                                }
                            });
                    }
                });
            }
        });
    }

    getToc(callback: (toc: { [key: string]: any }) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.getToc(userProfile, book,
                            function(entries: { [key: string]: any }[]): void {
                                let toc: { [key: string]: any } = {};
                                for (let i = 0; i < entries.length; i++) {
                                    let entry = entries[i];
                                    let sectionKey = entry["section"];
                                    if (toc[sectionKey] == null) {
                                        toc[sectionKey] = {};
                                    }
                                    let section = toc[sectionKey];
                                    if (sectionKey == "DynamicContent") {
                                        if (section["documents"] == null) {
                                            section["location"] = entry["location"];
                                            section["documents"] = {};
                                        }
                                        let dynamicSection = section["documents"];
                                        dynamicSection[entry["pageKey"]] = entry;
                                    } else
                                        section[entry["pageKey"]] = entry;
                                }
                                callback(toc);
                            });
                    else
                        callback({});
                });
            } else
                callback({});
        });
    }

    removeToc(id: string, section: string): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile)
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.pebl.storage.removeToc(userProfile, book, section, id);
                });
        })
    }

    pullProgram(programId: string, callback: (activity?: Activity) => void): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let network = (self.pebl as any).network;
                if (network && network.syncingProcess && network.syncingProcess.length > 0) {
                    network.syncingProcess[0].pullActivity('program', programId, function(activity?: Activity) {
                        if (activity) {
                            callback(<Program>activity);
                        } else {
                            callback();
                        }
                    });
                }
            }
        });
    }

    mergePrograms(oldProgram: Program, newProgram: Program): Program {
        let mergedProgram = Program.merge(oldProgram, newProgram) as Program;
        return mergedProgram;
    }

    mergeInstitutions(oldInstitution: Institution, newInstitution: Institution): Institution {
        let mergedInstitution = Institution.merge(oldInstitution, newInstitution) as Institution;
        return mergedInstitution;
    }

    mergeSystems(oldSystem: System, newSystem: System): System {
        let mergedSystem = System.merge(oldSystem, newSystem) as System;
        return mergedSystem;
    }

    getProgram(programId: string, callback: (program?: Program) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getActivityById(userProfile, "program", programId, function(activity?: Activity) {
                    if (activity)
                        callback(<Program>activity);
                    else
                        callback();
                });
            }
        });
    }

    getInstitution(institutionId: string, callback: (institution?: Institution) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getActivityById(userProfile, "institution", institutionId, function(activity?: Activity) {
                    if (activity)
                        callback(<Institution>activity);
                    else
                        callback();
                });
            }
        });
    }

    getSystem(systemId: string, callback: (system?: System) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getActivityById(userProfile, "system", systemId, function(activity?: Activity) {
                    if (activity)
                        callback(<System>activity);
                    else
                        callback();
                });
            }
        });
    }

    isProgramMember(program: Program, userIdentity: string): boolean {
        return Program.isMember(program, userIdentity);
    }

    isInstitutionMember(institution: Institution, userIdentity: string): boolean {
        return Institution.isMember(institution, userIdentity);
    }

    isProgramMemberOfInstitution(institution: Institution, programId: string): boolean {
        return Institution.isProgram(institution, programId);
    }

    isSystemMember(system: System, userIdentity: string): boolean {
        return System.isMember(system, userIdentity);
    }

    removeProgram(programId: string, callback: () => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.removeActivity(userProfile, programId, 'program', callback);
            }
        });
    }

    removeInstitution(institutionId: string, callback: () => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.removeActivity(userProfile, institutionId, 'institution', callback);
            }
        });
    }

    newEmptyProgram(callback: (program?: Program) => void): void {
        callback(new Program({}));
    }

    newEmptyInstitution(callback: (institution?: Institution) => void): void {
        callback(new Institution({}));
    }

    newEmptySystem(callback: (system?: System) => void): void {
        callback(new System({}));
    }

    getGroupMemberships(callback: (memberships: Membership[]) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getGroupMembership(userProfile, callback);
            } else
                callback([]);
        });
    }

    getSpecificGroupMembership(groupId: string, callback: (membership: Membership | null) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getGroupMembership(userProfile, function(memberships) {
                    let result = null;
                    for (let membership of memberships) {
                        if (membership.membershipId === groupId)
                            result = membership
                    }
                    callback(result);
                });
            } else
                callback(null);
        });
    }

    removeGroupMembership(groupId: string, callback: () => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.removeGroupMembership(userProfile, groupId, callback);
            }
        });
    }

    getPrograms(callback: (programs: Program[]) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getActivity(userProfile, "program", function(activities) {
                    callback(<Program[]>activities);
                });
            } else
                callback([]);
        });
    }

    getInstitutions(callback: (institutions: Institution[]) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getActivity(userProfile, "institution", function(activities) {
                    callback(<Institution[]>activities);
                });
            } else
                callback([]);
        });
    }

    getSystems(callback: (systems: System[]) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getActivity(userProfile, "system", function(activities) {
                    callback(<System[]>activities);
                });
            } else
                callback([]);
        });
    }

    getUuid(): string {
        /*!
          Excerpt from: Math.uuid.js (v1.4)
          http://www.broofa.com
          mailto:robert@broofa.com
          Copyright (c) 2010 Robert Kieffer
          Dual licensed under the MIT and GPL licenses.
        */
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return uuid;
    }

    getInviteToken(token: string, callback: (stmts: XApiStatement[]) => void): void {
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let xhr = new XMLHttpRequest();
                //TODO: multiple endpoints?
                var endpoint = userProfile.endpoints[0];

                var pipeline = [{
                    "$match": {
                        "$and": [{
                            "statement.verb.id": {
                                "$in": [
                                    "http://www.peblproject.com/definitions.html#invited"
                                ]
                            }
                        },
                        {
                            "statement.object.definition.name.en-US": {
                                "$in": [
                                    token
                                ]
                            }
                        }]
                    }
                }];

                xhr.addEventListener("load", function() {
                    let result = JSON.parse(xhr.responseText);
                    for (let i = 0; i < result.length; i++) {
                        let rec = result[i]
                        if (!rec.voided)
                            result[i] = rec.statement;
                        else
                            result.splice(i, 1);
                    }
                    if (callback != null) {
                        callback(result);
                    }
                });

                xhr.addEventListener("error", function() {
                    callback([]);
                });

                xhr.open("GET", endpoint.url + "api/statements/aggregate?pipeline=" + encodeURIComponent(JSON.stringify(pipeline)), true);

                xhr.setRequestHeader("Authorization", "Basic " + endpoint.token);
                xhr.setRequestHeader("Content-Type", "application/json");

                xhr.send();
            }
        });
    }

    getProgramActivityEvents(programId: string, callback: (events: ProgramAction[]) => void): void {
        let self = this;
        this.pebl.storage.getActivityEvent(programId, function(events) {
            callback(<ProgramAction[]>events.sort(self.sortByTimestamp));
        });
    }

    sortByTimestamp(a: XApiStatement, b: XApiStatement) {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }

    iterateProgramMembers(program: Program, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        Program.iterateMembers(program, callback);
    }

    getProgramMembers(program: Program): Array<Membership> {
        return Program.getMembers(program);
    }

    iterateInstitutionMembers(institution: Institution, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        Institution.iterateMembers(institution, callback);
    }

    iterateInstitutionPrograms(institution: Institution, callback: (key: string, program: Program) => void): void {
        Institution.iteratePrograms(institution, callback);
    }

    iterateSystemMembers(system: System, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        System.iterateMembers(system, callback);
    }

    newTempMember(obj: { [key: string]: any }, callback: (tempMember: TempMembership) => void): void {
        let tm = new TempMembership(obj);
        callback(tm);
    }

    getNotifications(callback: (notifications: XApiStatement[]) => void): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getNotifications(userProfile, function(notifications) {
                    callback(notifications);
                });
            } else {
                callback([]);
            }
        });
    }

    removeNotification(notificationId: string): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.removeNotification(userProfile, notificationId);
                self.pebl.storage.saveOutgoingXApi(userProfile, {
                    id: self.pebl.utils.getUuid(),
                    identity: userProfile.identity,
                    requestType: "deleteNotification",
                    xId: notificationId
                });
            }
        });
    }

    getMessages(thread: string, callback: (messages: Message[]) => void): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getMessages(userProfile, thread, function(messages) {
                    callback(messages);
                });
            } else {
                callback([]);
            }
        });
    }

    getModuleEvents(idref: string, callback: (events: ModuleEvent[]) => void, type?: string): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getModuleEvent(idref, function(moduleEvents) {
                    if (type) {
                        callback(moduleEvents.filter(event => event.verb.display['en-US'] === type));
                    } else {
                        callback(moduleEvents);
                    }
                });
            } else {
                callback([]);
            }
        });
    }

    removeModuleEvent(idref: string, id: string): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.removeModuleEvent(idref, id);
            }
        });
    }

    getEvents(callback: (events: XApiStatement[]) => void): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book) {
                        self.pebl.storage.getEvents(userProfile, book, callback);
                    } else {
                        callback([]);
                    }
                });
            } else {
                callback([]);
            }
        });
    }

    getThreadTimestamps(callback: (thread: { [key: string]: any },
        privateThreads: { [key: string]: any },
        groupThreads: { [key: string]: any }) => void): void {

        this.pebl.storage.getCompoundSyncTimestamps(SYNC_THREAD,
            (threadSyncTimestamps: { [thread: string]: any }) => {
                this.pebl.storage.getCompoundSyncTimestamps(SYNC_PRIVATE_THREAD,
                    (privateThreadSyncTimestamps: { [thread: string]: any }) => {
                        this.pebl.storage.getCompoundSyncTimestamps(SYNC_GROUP_THREAD,
                            (groupThreadSyncTimestamps: { [thread: string]: any }) => {
                                callback(threadSyncTimestamps,
                                    privateThreadSyncTimestamps,
                                    groupThreadSyncTimestamps);
                            });
                    });
            });
    }

    saveThreadTimestamps(threads: { [key: string]: any },
        privateThreads: { [key: string]: any },
        groupThreads: { [key: string]: any },
        callback: () => void): void {

        this.pebl.storage.saveCompoundSyncTimestamps(SYNC_THREAD,
            threads,
            () => {
                this.pebl.storage.saveCompoundSyncTimestamps(SYNC_PRIVATE_THREAD,
                    privateThreads,
                    () => {
                        this.pebl.storage.saveCompoundSyncTimestamps(SYNC_GROUP_THREAD,
                            groupThreads,
                            () => {
                                callback();
                            });
                    });
            });
    }

}
