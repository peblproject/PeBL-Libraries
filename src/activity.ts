// import { PEBL } from "./pebl";
import { Membership } from "./xapi";

export class Activity {

    readonly id: string;
    readonly type: string;
    timestamp: Date;
    etag?: string;
    identity?: string;
    readonly isNew: boolean = false;
    dirtyEdits: { [key: string]: boolean };

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
    programTitle: string;
    programShortDescription: string;
    programLongDescription: string;
    programLevel: (string | number);
    programIssues: string[];
    programCommunities: string[];
    programInstitutions: string[];
    programLevels: { [key: string]: any }[];
    programLevelStepsComplete: number;
    members: Membership[];
    programAvatar?: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "program";
        super(raw);

        this.programLevelStepsComplete = raw.programLevelStepsComplete || 0;
        this.programLevels = raw.programLevels || [];
        this.programTitle = raw.programTitle || "Program Name";
        this.programShortDescription = raw.programShortDescription || "Program Short Description";
        this.programLongDescription = raw.programLongDescription || "Program Long Description";
        this.programLevel = raw.programLevel || 0;
        this.programIssues = raw.programIssues ? raw.programIssues : [];
        this.programCommunities = raw.programCommunities ? raw.programCommunities : [];
        this.programInstitutions = raw.programInstitutions ? raw.programInstitutions : [];
        this.programAvatar = raw.programAvatar;
        this.members = typeof (raw.members) === "string" ? JSON.parse(decodeURIComponent(raw.members)) : (raw.members) ? raw.members : [];
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "program";
    }

    toTransportFormat(): { [key: string]: any } {
        let obj = super.toTransportFormat();

        obj.programLevelStepsComplete = this.programLevelStepsComplete;
        obj.programLevels = this.programLevels;
        obj.programTitle = this.programTitle;
        obj.programShortDescription = this.programShortDescription;
        obj.programLongDescription = this.programLongDescription;
        obj.programLevel = this.programLevel;
        obj.programIssues = this.programIssues;
        obj.programAvatar = this.programAvatar;
        obj.programCommunities = this.programCommunities;
        obj.programInstitutions = this.programInstitutions;
        obj.members = encodeURIComponent(JSON.stringify(this.members));
        return obj;
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
