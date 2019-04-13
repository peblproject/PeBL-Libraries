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
        Object.keys(oldActivity).forEach(function(key) {
            mergedActivity[key] = oldActivity[key];
        });
        Object.keys(newActivity).forEach(function(key) {
            // Null properties were set for a reason and should not be changed.
            if (mergedActivity[key] == null) {
                // Leave it
            } else {
                mergedActivity[key] = newActivity[key];
            }
        });

        // If either is flagged for deletion, that should not be changed.
        if ((oldActivity.delete && oldActivity.delete == true) || (newActivity.delete && newActivity.delete == true)) {
            mergedActivity.delete = true;
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
    members?: Membership[];


    constructor(raw: { [key: string]: any }) {
        raw.type = "program";
        super(raw);

        let self = this;

        // Translate legacy member format to new format
        let members = [];
        if (raw.members)
            members = typeof (raw.members) === "string" ? JSON.parse(decodeURIComponent(raw.members)) : (raw.members) ? raw.members : [];

        if (members.length > 0) {
            for (let member of members) {
                self.addMember(member);
            }
        }

        Object.keys(raw).forEach(function(key) {
            if(key.indexOf('member-') !== -1) {
                let member = typeof (raw[key]) === "string" ? JSON.parse(decodeURIComponent(raw[key])) : (raw[key]) ? raw[key] : null;
                if (member == null || (XApiStatement.is(member) && Membership.is(member as XApiStatement)) || TempMembership.is(member)) {
                    self[key] = member;
                }
            }
        });

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
        this.members = typeof (raw.members) === "string" ? JSON.parse(decodeURIComponent(raw.members)) : (raw.members) ? raw.members : [];
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "program";
    }

    toTransportFormat(): { [key: string]: any } {
        let obj = super.toTransportFormat();
        let self = this;

        Object.keys(this).forEach(function(key) {
            if(key.indexOf('member-') !== -1) {
                if (self[key] == null) {
                    obj[key] = self[key];
                } else if ((XApiStatement.is(self[key]) && Membership.is(self[key] as XApiStatement)) || TempMembership.is(self[key])) {
                    obj[key] = encodeURIComponent(JSON.stringify(self[key]));
                }
            }
        });

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
        obj.members = encodeURIComponent(JSON.stringify(this.members));
        return obj;
    }

    addMember(membership: (Membership | TempMembership)): void {
        this['member-' + membership.id] = membership;
    }

    static iterateMembers(program: Program, callback: (key: string, membership: (Membership | TempMembership)) => void): void {
        Object.keys(program).forEach(function(key) {
            if (key.indexOf('member-') !== -1 && program[key]) {
                if (XApiStatement.is(program[key]) && Membership.is(program[key] as XApiStatement)) {
                    callback(key, program[key] as Membership);
                } else if (TempMembership.is(program[key])) {
                    callback(key, program[key] as TempMembership);
                }
            }
        });
    }

    static isMember(program: Program, userIdentity: string): boolean {
        let isMember = false;
        Object.keys(program).forEach(function(key) {
            if (key.indexOf('member-') !== -1 && program[key]) {
                if (program[key].identity === userIdentity) {
                    isMember = true;
                }
            }
        });
        return isMember;
    }

    static isNew(program: Program): boolean {
        let isNew = true;
        Object.keys(program).forEach(function(key) {
            if (key.indexOf('member-') !== -1) {
                isNew = false;
            }
        });
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
    } else
        new Error("Unknown activity type");

    return act;
}
