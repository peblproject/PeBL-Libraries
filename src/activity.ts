// import { PEBL } from "./pebl";
import { XApiStatement } from "./xapi";
import { Membership } from "./xapi";
import { TempMembership } from "./models";

export class Activity {

    readonly id: string;
    readonly type: string;
    timestamp: Date;
    etag?: string;
    identity?: string;
    readonly isNew: boolean = false;
    dirtyEdits: { [key: string]: boolean };
    delete?: boolean;

    constructor(raw: { [key: string]: any }) {
        this.dirtyEdits = {};
        if (!raw.id) {
            /*!
              Excerpt from: Math.uuid.js (v1.4)
              http://www.broofa.com
              mailto:robert@broofa.com
              Copyright (c) 2010 Robert Kieffer
              Dual licensed under the MIT and GPL licenses.
            */
            this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            this.isNew = true;
        } else {
            this.id = raw.id;
            this.isNew = false;
        }
        this.timestamp = (typeof (raw.timestamp) === "string") ? new Date(Date.parse(raw.timestamp)) : new Date();
        this.etag = raw.etag;
        this.type = raw.type;
        this.delete = raw.delete;
    }

    static is(raw: { [key: string]: any }): boolean {
        return (raw.id && raw.type) != null;
    }

    clearDirtyEdits(): void {
        this.dirtyEdits = {};
    }

    toTransportFormat(): { [key: string]: any } {
        return {
            type: this.type,
            timestamp: this.timestamp ? this.timestamp.toISOString() : (new Date()).toISOString(),
            id: this.id
        }
    };

    static merge(oldActivity: any, newActivity: any): Activity {
        let mergedActivity = {} as any;
        let oldKeys = Object.keys(oldActivity);
        let newKeys = Object.keys(newActivity);

        for (let key of oldKeys) {
            mergedActivity[key] = oldActivity[key];
        }

        for (let key of newKeys) {
            // Null properties were set for a reason and should not be changed.
            if (mergedActivity[key] == null) {
                // Leave it
            } else {
                mergedActivity[key] = newActivity[key];
            }
        }

        // If either is flagged for deletion, that should not be changed.
        if ((oldActivity.delete && oldActivity.delete == true) || (newActivity.delete && newActivity.delete == true)) {
            mergedActivity.delete = true;
        }

        // If either is flagged as completed, that should not be changed.
        if ((oldActivity.completed && oldActivity.completed == true) || (newActivity.completed && newActivity.completed == true)) {
            mergedActivity.completed = true;
        }

        return mergedActivity as Activity;
    }
}

export class Learnlet extends Activity {
    programTitle: string;
    _description: string;
    _level: number;
    _cfi: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "learnlet";
        super(raw);

        this._cfi = raw.cfi;
        this._level = raw.level;
        this.programTitle = raw.name;
        this._description = raw.description;
    }

    get name(): string { return this.programTitle; }
    get description(): string { return this._description; }
    get level(): number { return this._level; }
    get cfi(): string { return this._cfi; }

    set name(arg: string) {
        this.dirtyEdits["name"] = true;
        this.programTitle = arg;
    }

    set description(arg: string) {
        this.dirtyEdits["description"] = true;
        this._description = arg;
    }

    set level(arg: number) {
        this.dirtyEdits["level"] = true;
        this._level = arg;
    }

    set cfi(arg: string) {
        this.dirtyEdits["cfi"] = true;
        this._cfi = arg;
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "learnlet";
    }

    toTransportFormat(): { [key: string]: any } {
        let sObj = super.toTransportFormat();
        let obj: { [key: string]: any } = {};

        if (this.dirtyEdits["name"] || this.isNew)
            sObj.name = this.programTitle;
        if (this.dirtyEdits["description"] || this.isNew)
            sObj.description = this._description;
        if (this.dirtyEdits["description"] || this.isNew)
            sObj.description = this._description;
        if (this.dirtyEdits["cfi"] || this.isNew)
            sObj.cfi = this._cfi;
        if (this.dirtyEdits["level"] || this.isNew)
            sObj.level = this._level;

        obj[this.id] = sObj;
        return obj;
    }
}

// -------------------------------

export class Program extends Activity {
    [key: string]: (Membership | TempMembership | any);
    programTitle: string;
    programShortDescription: string;
    programLongDescription: string;
    programLevel: (string | number);
    programIssues: string[];
    programCommunities: string[];
    programInstitutions: string[];
    programLevels: { [key: string]: any }[];
    programLevelStepsComplete: number;
    programAvatar?: string;
    programTeamName?: string;
    programFocus?: string;
    completed?: Date; // Timestamp of when it was completed
    created?: Date; // Timestamp of when it was created
    members?: Membership[];


    constructor(raw: { [key: string]: any }) {
        raw.type = "program";
        super(raw);

        let self = this;

        // Translate legacy member format to new format
        let members = [];
        if (raw.members)
            members = typeof (raw.members) === "string" ? JSON.parse(decodeURIComponent(raw.members)) : (raw.members ? raw.members : []);

        if (members.length > 0) {
            for (let member of members) {
                self.addMember(member);
            }
        }

        let rawKeys = Object.keys(raw);

        for (let key of rawKeys) {
            if (key.indexOf('member-') !== -1) {
                let member = typeof (raw[key]) === "string" ? JSON.parse(decodeURIComponent(raw[key])) : (raw[key] ? raw[key] : null);
                if (member == null || (XApiStatement.is(member) && Membership.is(member as XApiStatement)) || TempMembership.is(member)) {
                    self[key] = member;
                }
            }
        }

        this.programLevelStepsComplete = raw.programLevelStepsComplete || 0;
        this.programLevels = raw.programLevels || [];
        this.programTitle = raw.programTitle || "";
        this.programShortDescription = raw.programShortDescription || "";
        this.programLongDescription = raw.programLongDescription || "";
        this.programLevel = raw.programLevel || 0;
        this.programIssues = raw.programIssues ? raw.programIssues : [];
        this.programCommunities = raw.programCommunities ? raw.programCommunities : [];
        this.programInstitutions = raw.programInstitutions ? raw.programInstitutions : [];
        this.programAvatar = raw.programAvatar;
        this.programTeamName = raw.programTeamName;
        this.programFocus = raw.programFocus;
        this.completed = raw.completed ? new Date(raw.completed) : undefined;
        this.created = raw.created ? new Date(raw.created) : undefined;
        // Estimate created time to backfill older programs, find oldest member and use their timestamp
        if (!this.created) {
            if (this.isNew) {
                this.created = new Date();
            } else {
                let oldestMember = null as Membership | null;
                let keys = Object.keys(this);
                for (let key of keys) {
                    if (key.indexOf('member-') !== -1) {
                        let member = typeof (this[key]) === "string" ? JSON.parse(decodeURIComponent(this[key])) : (this[key] ? this[key] : null);
                        if (member && XApiStatement.is(member) && Membership.is(member as XApiStatement)) {
                            if (!oldestMember || (new Date(member.timestamp) < new Date(oldestMember.timestamp)))
                                oldestMember = member;
                        }
                    }
                }

                if (oldestMember)
                    this.created = new Date(oldestMember.timestamp);
            }
        }
        this.members = typeof (raw.members) === "string" ? JSON.parse(decodeURIComponent(raw.members)) : (raw.members ? raw.members : []);
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "program";
    }

    toTransportFormat(): { [key: string]: any } {
        let obj = super.toTransportFormat();
        let self = this;

        let keys = Object.keys(this);

        for (let key of keys) {
            if(key.indexOf('member-') !== -1) {
                if (self[key] == null) {
                    obj[key] = self[key];
                } else if ((XApiStatement.is(self[key]) && Membership.is(self[key] as XApiStatement)) || TempMembership.is(self[key])) {
                    obj[key] = encodeURIComponent(JSON.stringify(self[key]));
                }
            }
        }

        obj.programLevelStepsComplete = this.programLevelStepsComplete;
        obj.programLevels = this.programLevels;
        obj.programTitle = this.programTitle;
        obj.programShortDescription = this.programShortDescription;
        obj.programLongDescription = this.programLongDescription;
        obj.programLevel = this.programLevel;
        obj.programIssues = this.programIssues;
        obj.programAvatar = this.programAvatar;
        obj.programTeamName = this.programTeamName;
        obj.programFocus = this.programFocus;
        obj.programCommunities = this.programCommunities;
        obj.programInstitutions = this.programInstitutions;
        obj.completed = this.completed ? this.completed.toISOString() : undefined,
        obj.created = this.created ? this.created.toISOString() : undefined,
        obj.members = encodeURIComponent(JSON.stringify(this.members));
        return obj;
    }

    addMember(membership: (Membership | TempMembership)): void {
        this['member-' + membership.id] = membership;
    }

    static iterateMembers(program: Program, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        let keys = Object.keys(program);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && program[key]) {
                if (XApiStatement.is(program[key]) && Membership.is(program[key] as XApiStatement)) {
                    callback(key, program[key] as Membership);
                } else if (TempMembership.is(program[key])) {
                    callback(key, program[key] as TempMembership);
                }
            }
        }
    }

    static getMembers(program: Program): Array<Membership> {
        let members = [] as Array<Membership>;
        let keys = Object.keys(program);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && program[key]) {
                if (XApiStatement.is(program[key]) && Membership.is(program[key] as XApiStatement)) {
                    members.push(program[key]);
                }
            }
        }
        return members;
    }

    static isMember(program: Program, userIdentity: string): boolean {
        let isMember = false;
        let keys = Object.keys(program);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && program[key]) {
                if (program[key].identity === userIdentity) {
                    isMember = true;
                }
            }
        }
        return isMember;
    }

    static isNew(program: Program): boolean {
        let isNew = true;
        let keys = Object.keys(program);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1) {
                isNew = false;
            }
        }
        return isNew;
    }
}

export class Institution extends Activity {
    [key: string]: (Membership | TempMembership | Program | any);
    institutionName: string;
    institutionDescription: string;
    institutionAvatar?: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "institution";
        super(raw);

        let self = this;

        let rawKeys = Object.keys(raw);
        for (let key of rawKeys) {
            if (key.indexOf('member-') !== -1) {
                let member = typeof (raw[key]) === "string" ? JSON.parse(decodeURIComponent(raw[key])) : (raw[key] ? raw[key] : null);
                if (member == null || (XApiStatement.is(member) && Membership.is(member as XApiStatement)) || TempMembership.is(member)) {
                    self[key] = member;
                }
            } else if (key.indexOf('program-') !== -1) {
                let program = typeof (raw[key]) === "string" ? JSON.parse(decodeURIComponent(raw[key])) : (raw[key] ?  raw[key] : null);
                if (program == null || (Program.is(program))) {
                    self[key] = program;
                }
            }
        }

        this.institutionName = raw.institutionName || "";
        this.institutionDescription = raw.institutionDescription || "";
        this.institutionAvatar = raw.institutionAvatar;
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "institution";
    }

    toTransportFormat(): { [key: string]: any } {
        let obj = super.toTransportFormat();
        let self = this;

        let keys = Object.keys(this);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1) {
                if (self[key] == null) {
                    obj[key] = self[key];
                } else if ((XApiStatement.is(self[key]) && Membership.is(self[key] as XApiStatement)) || TempMembership.is(self[key])) {
                    obj[key] = encodeURIComponent(JSON.stringify(self[key]));
                }
            } else if (key.indexOf('member-') !== -1) {
                if (self[key] == null) {
                    obj[key] = self[key];
                } else if (Program.is(self[key])) {
                    obj[key] = encodeURIComponent(JSON.stringify(self[key]));
                }
            }
        }

        obj.institutionName = this.institutionName;
        obj.institutionDescription = this.institutionDescription;
        obj.institutionAvatar = this.institutionAvatar;
        return obj;
    }

    addMember(membership: (Membership | TempMembership)): void {
        this['member-' + membership.id] = membership;
    }

    addProgram(program: Program): void {
        this['program-' + program.id] = program;
    }

    static iterateMembers(institution: Institution, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        let keys = Object.keys(institution);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && institution[key]) {
                if (XApiStatement.is(institution[key]) && Membership.is(institution[key] as XApiStatement)) {
                    callback(key, institution[key] as Membership);
                } else if (TempMembership.is(institution[key])) {
                    callback(key, institution[key] as TempMembership);
                }
            }
        }
    }

    static isMember(institution: Institution, userIdentity: string): boolean {
        let isMember = false;
        let keys = Object.keys(institution);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && institution[key]) {
                if (institution[key].identity === userIdentity) {
                    isMember = true;
                }
            }
        }
        return isMember;
    }

    static iteratePrograms(institution: Institution, callback: (key: string, program: Program) => void): void {
        let keys = Object.keys(institution);
        for (let key of keys) {
            if (key.indexOf('program-') !== -1 && institution[key]) {
                if (Program.is(institution[key])) {
                    callback(key, institution[key] as Program);
                }
            }
        }
    }

    static isProgram(institution: Institution, programId: string): boolean {
        let isProgram = false;
        let keys = Object.keys(institution);
        for (let key of keys) {
            if (key.indexOf('program-') !== -1 && institution[key]) {
                if (institution[key].id === programId) {
                    isProgram = true;
                }
            }
        }
        return isProgram;
    }

    static isNew(institution: Institution): boolean {
        let isNew = true;
        let keys = Object.keys(institution);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1) {
                isNew = false;
            }
        }
        return isNew;
    }
}

export class System extends Activity {
    [key: string]: (Membership | TempMembership | any);
    systemName: string;
    systemDescription: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "system";
        super(raw);

        let self = this;

        let rawKeys = Object.keys(raw);
        for (let key of rawKeys) {
            if (key.indexOf('member-') !== -1) {
                let member = typeof (raw[key]) === "string" ? JSON.parse(decodeURIComponent(raw[key])) : (raw[key] ? raw[key] : null);
                if (member == null || (XApiStatement.is(member) && Membership.is(member as XApiStatement)) || TempMembership.is(member)) {
                    self[key] = member;
                }
            }
        }

        this.systemName = raw.systemName || "";
        this.systemDescription = raw.systemDescription || "";
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "system";
    }

    toTransportFormat(): { [key: string]: any } {
        let obj = super.toTransportFormat();
        let self = this;

        let keys = Object.keys(this);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1) {
                if (self[key] == null) {
                    obj[key] = self[key];
                } else if ((XApiStatement.is(self[key]) && Membership.is(self[key] as XApiStatement)) || TempMembership.is(self[key])) {
                    obj[key] = encodeURIComponent(JSON.stringify(self[key]));
                }
            }
        }

        obj.systemName = this.systemName;
        obj.systemDescription = this.systemDescription;
        return obj;
    }

    addMember(membership: (Membership | TempMembership)): void {
        this['member-' + membership.id] = membership;
    }

    static iterateMembers(system: System, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        let keys = Object.keys(system);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && system[key]) {
                if (XApiStatement.is(system[key]) && Membership.is(system[key] as XApiStatement)) {
                    callback(key, system[key] as Membership);
                } else if (TempMembership.is(system[key])) {
                    callback(key, system[key] as TempMembership);
                }
            }
        }
    }

    static isMember(system: System, userIdentity: string): boolean {
        let isMember = false;
        let keys = Object.keys(system);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1 && system[key]) {
                if (system[key].identity === userIdentity) {
                    isMember = true;
                }
            }
        }
        return isMember;
    }

    static isNew(system: System): boolean {
        let isNew = true;
        let keys = Object.keys(system);
        for (let key of keys) {
            if (key.indexOf('member-') !== -1) {
                isNew = false;
            }
        }
        return isNew;
    }
}

// -------------------------------

export class Presence extends Activity {



    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "presence";
    }
}

// -------------------------------

export function toActivity(obj: { [key: string]: any }): (Activity | null) {
    let act: (Activity | null) = null;
    if (Program.is(obj)) {
        act = new Program(obj);
    } else if (Learnlet.is(obj)) {
        act = new Learnlet(obj);
    } else if (Learnlet.is(obj)) {
        act = new Presence(obj);
    } else if (Institution.is(obj)) {
        act = new Institution(obj);
    } else if (System.is(obj)) {
        act = new System(obj);
    } else
        new Error("Unknown activity type");

    return act;
}
