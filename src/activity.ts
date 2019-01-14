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
    _name: string;
    _description: string;
    _level: number;
    _cfi: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "learnlet";
        super(raw);

        this._cfi = raw.cfi;
        this._level = raw.level;
        this._name = raw.name;
        this._description = raw.description;
    }

    get name(): string { return this._name; }
    get description(): string { return this._description; }
    get level(): number { return this._level; }
    get cfi(): string { return this._cfi; }

    set name(arg: string) {
        this.dirtyEdits["name"] = true;
        this._name = arg;
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
            sObj.name = this._name;
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
    _name: string;
    _shortDescription: string;
    _longDescription: string;
    _progressLevel: string;
    _issues: string[];
    _targetCommunities: string[];
    _associatedOrganizations: string[];
    _members: Membership[];
    _programAvatar: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "program";
        super(raw);

        this._name = raw.programTitle || "Program Name";
        this._shortDescription = raw.programShortDescription || "Program Short Description";
        this._longDescription = raw.programLongDescription || "Program Long Description";
        this._progressLevel = raw.programLevel || "0";
        this._issues = raw.issues ? raw.programIssues : [];
        this._targetCommunities = raw.programCommunities ? raw.programCommunities : [];
        this._associatedOrganizations = raw.programInstitutions ? raw.programInstitutions : [];
        this._members = raw.members ? raw.members : [];
        this._programAvatar = raw.programAvatar || "'./../assets/rainbow.jpg'";
    }

    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "program";
    }

    get programTitle(): string { return this._name; }
    get programShortDescription(): string { return this._shortDescription; }
    get programLongDescription(): string { return this._longDescription; }
    get programLevel(): string { return this._progressLevel; }
    get programIssues(): string[] { return this._issues; }
    get programCommunities(): string[] { return this._targetCommunities; }
    get programInstitutions(): string[] { return this._associatedOrganizations; }
    get members(): Membership[] { return this._members; }
    get programAvatar(): string { return this._programAvatar; }

    set programAvatar(avatar: string) {
        if (avatar != this._programAvatar) {
            this.dirtyEdits["programAvatar"] = true;
            this._programAvatar = avatar;
        }
    }

    set programTitle(arg: string) {
        if (arg != this._name) {
            this.dirtyEdits["name"] = true;
            this._name = arg;
        }
    }

    set programShortDescription(arg: string) {
        if (arg != this._shortDescription) {
            this.dirtyEdits["shortDescription"] = true;
            this._shortDescription = arg;
        }
    }

    set programLongDescription(arg: string) {
        if (arg != this._longDescription) {
            this.dirtyEdits["longDescription"] = true;
            this._longDescription = arg;
        }
    }

    set programLevel(arg: string) {
        if (arg != this._progressLevel) {
            this.dirtyEdits["progressLevel"] = true;
            this._progressLevel = arg;
        }
    }

    set programIssues(arg: string[]) {
        if (arg != this._issues) {
            this.dirtyEdits["issues"] = true;
            this._issues = arg;
        }
    }

    set programCommunities(arg: string[]) {
        if (arg != this._targetCommunities) {
            this.dirtyEdits["targetCommunities"] = true;
            this._targetCommunities = arg;
        }
    }

    set programInstitutions(arg: string[]) {
        if (arg != this._associatedOrganizations) {
            this.dirtyEdits["associatedOrganizations"] = true;
            this._associatedOrganizations = arg;
        }
    }

    addTargetCommunity(target: string): void {
        this.dirtyEdits["targetCommunities"] = true;
        this._targetCommunities.push(target);
    }

    removeTargetCommunity(target: string): void {
        this.dirtyEdits["targetCommunities"] = true;
        for (let i = this._targetCommunities.length - 1; i > -1; i--)
            if (this._targetCommunities[i] == target)
                this._targetCommunities.splice(i, 1);
    }

    addIssues(target: string): void {
        this.dirtyEdits["issues"] = true;
        this._issues.push(target);
    }

    removeIssues(target: string): void {
        this.dirtyEdits["issues"] = true;
        for (let i = this._issues.length - 1; i > -1; i--)
            if (this._issues[i] == target)
                this._issues.splice(i, 1);
    }

    addAssociatedOrganization(target: string): void {
        this.dirtyEdits["associatedOrganizations"] = true;
        this._associatedOrganizations.push(target);
    }

    removeAssociatedOrganization(target: string): void {
        this.dirtyEdits["associatedOrganizations"] = true;
        for (let i = this._associatedOrganizations.length - 1; i > -1; i--)
            if (this._associatedOrganizations[i] == target)
                this._associatedOrganizations.splice(i, 1);
    }

    addMembership(target: Membership) {
        this.dirtyEdits["members"] = true;
        this._members.push(target);
    }

    removeMembership(target: Membership) {
        this.dirtyEdits["members"] = true;
        for (let i = this._members.length - 1; i > -1; i--)
            if (this._members[i] == target)
                this._members.splice(i, 1);
    }

    toTransportFormat(): { [key: string]: any } {
        let obj = super.toTransportFormat();

        if (this.dirtyEdits["name"] || this.isNew)
            obj.name = this._name;
        if (this.dirtyEdits["shortDescription"] || this.isNew)
            obj.shortDescription = this._shortDescription;
        if (this.dirtyEdits["longDescription"] || this.isNew)
            obj.longDescription = this._longDescription;
        if (this.dirtyEdits["progressLevel"] || this.isNew)
            obj.progressLevel = this._progressLevel;
        if (this.dirtyEdits["issues"] || this.isNew)
            obj.issues = this._issues;
        if (this.dirtyEdits["members"] || this.isNew)
            obj.members = this._members;
        if (this.dirtyEdits["targetCommunities"] || this.isNew)
            obj.targetCommunities = this._targetCommunities;
        if (this.dirtyEdits["associatedOrganizations"] || this.isNew)
            obj.associatedOrganizations = this._associatedOrganizations;
        if (this.dirtyEdits["programAvatar"] || this.isNew)
            obj.programAvatar = this._programAvatar;
        return obj;
    }
}

// -------------------------------

export class Presence extends Activity {



    static is(raw: { [key: string]: any }): boolean {
        return raw.type == "presence";
    }
}
