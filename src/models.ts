// -------------------------------

export class UserProfile {
    readonly identity: string;
    readonly name: string;
    readonly homePage: string;
    readonly preferredName: string;
    readonly metadata?: { [key: string]: any };
    readonly endpoints: Endpoint[];
    readonly registryEndpoint?: Endpoint;
    currentTeam?: string;
    currentTeamName?: string;
    currentClass?: string;
    currentClassName?: string;
    memberships?: { [key: string]: string };
    role?: string;
    groups?: string[];
    readonly firstName?: string;
    readonly lastName?: string;
    readonly avatar?: string;
    readonly email?: string;
    readonly phoneNumber?: string;
    readonly streetAddress?: string;
    readonly city?: string;
    readonly state?: string;
    readonly zipCode?: string;
    readonly country?: string;

    constructor(raw: { [key: string]: any }) {
        this.identity = raw.identity;
        this.name = raw.name;
        this.homePage = raw.homePage;
        this.preferredName = raw.preferredName;
        if (raw.registryEndpoint)
            this.registryEndpoint = new Endpoint(raw.registryEndpoint);

        this.currentTeam = raw.currentTeam;
        this.currentTeamName = raw.currentTeamName;
        this.currentClass = raw.currentClass;
        this.currentClassName = raw.currentClassName;
        this.memberships = raw.memberships;
        this.role = raw.role;
        this.groups = raw.groups;

        this.endpoints = [];

        this.metadata = raw.metadata;

        if (raw.endpoints)
            for (let endpointObj of raw.endpoints)
                this.endpoints.push(new Endpoint(endpointObj));

        if (this.homePage == null)
            this.homePage = "acct:keycloak-server";

        if (raw.firstName)
            this.firstName = raw.firstName;
        if (raw.lastName)
            this.lastName = raw.lastName;
        if (raw.avatar)
            this.avatar = raw.avatar;
        if (raw.email)
            this.email = raw.email;
        if (raw.phoneNumber)
            this.phoneNumber = raw.phoneNumber;
        if (raw.streetAddress)
            this.streetAddress = raw.streetAddress;
        if (raw.city)
            this.city = raw.city;
        if (raw.state)
            this.state = raw.state;
        if (raw.zipCode)
            this.zipCode = raw.zipCode;
        if (raw.country)
            this.country = raw.country;
    }

    toObject(): { [key: string]: any } {
        let urls: { [key: string]: any } = {};
        for (let e of this.endpoints)
            urls[e.url] = e.toObject();
        let obj = {
            "identity": this.identity,
            "name": this.name,
            "homePage": this.homePage,
            "preferredName": this.preferredName,
            "lrsUrls": urls,
            "metadata": {},
            "registryEndpoint": this.registryEndpoint,
            "currentTeam": this.currentTeam,
            "currentTeamName": this.currentTeamName,
            "currentClass": this.currentClass,
            "currentClassName": this.currentClassName,
            "memberships": this.memberships,
            "firstName": this.firstName,
            "lastName": this.lastName,
            "avatar": this.avatar,
            "email": this.email,
            "phoneNumber": this.phoneNumber,
            "streetAddress": this.streetAddress,
            "city": this.city,
            "state": this.state,
            "zipCode": this.zipCode,
            "country": this.country
        };
        if (this.metadata)
            obj.metadata = this.metadata;

        return obj;
    }

}

// -------------------------------

export class Endpoint {
    readonly url: string;
    readonly username: string;
    readonly password: string;
    readonly token: string;
    readonly lastSyncedThreads: { [key: string]: Date }
    readonly lastSyncedBooksMine: { [key: string]: Date }
    readonly lastSyncedBooksShared: { [key: string]: Date }
    readonly lastSyncedActivityEvents: { [key: string]: Date }
    readonly lastSyncedModules: { [key: string]: Date }

    constructor(raw: { [key: string]: any }) {
        this.url = raw.url;
        this.username = raw.username;
        this.password = raw.password;
        this.token = raw.token;

        if (!this.token) {
            this.token = btoa(this.username + ":" + this.password);
        }

        this.lastSyncedBooksMine = {};
        this.lastSyncedBooksShared = {};
        this.lastSyncedThreads = {};
        this.lastSyncedActivityEvents = {};
        this.lastSyncedModules = {};
    }

    toObject(urlPrefix: string = ""): { [key: string]: any } {
        return {
            url: urlPrefix + this.url,
            username: this.username,
            password: this.password,
            token: this.token,
            lastSyncedThreads: this.lastSyncedThreads,
            lastSyncedBooksMine: this.lastSyncedBooksMine,
            lastSyncedBooksShared: this.lastSyncedBooksMine,
            lastSyncedActivityEvents: this.lastSyncedActivityEvents,
            lastSyncedModules: this.lastSyncedModules
        };
    }
}

// -------------------------------

export class TempMembership {
    id: string;
    identity: string;
    actor: {
        name: string;
    };
    inviteId: string;
    inviteLink: string;
    status: string;
    role: string;
    inviteRole: string;

    constructor(raw: { [key: string]: any }) {
        this.id = raw.id;
        this.identity = raw.identity;
        this.actor = raw.actor;
        this.inviteId = raw.inviteId;
        this.inviteLink = raw.inviteLink;
        this.status = raw.status;
        this.role = raw.role;
        this.inviteRole = raw.inviteRole;
    }

    static is(x: any): boolean {
        if (x.id && x.identity && x.actor && x.actor.name && x.inviteLink && x.status && x.role && x.inviteRole)
            return true;
        else
            return false;
    }
}
