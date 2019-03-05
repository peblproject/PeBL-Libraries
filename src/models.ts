// -------------------------------

export class UserProfile {
    readonly identity: string;
    readonly name: string;
    readonly homePage: string;
    readonly preferredName: string;
    readonly metadata?: { [key: string]: any };
    readonly endpoints: Endpoint[];
    readonly registryEndpoint?: Endpoint;
    readonly currentTeam?: string | null;
    readonly currentClass?: string | null;

    constructor(raw: { [key: string]: any }) {
        this.identity = raw.identity;
        this.name = raw.name;
        this.homePage = raw.homePage;
        this.preferredName = raw.preferredName;
        if (raw.registryEndpoint)
            this.registryEndpoint = new Endpoint(raw.registryEndpoint);
        if (raw.currentTeam)
            this.currentTeam = raw.currentTeam;
        if (raw.currentClass)
            this.currentClass = raw.currentClass;
        this.endpoints = [];

        this.metadata = raw.metadata;

        if (raw.endpoints)
            for (let endpointObj of raw.endpoints)
                this.endpoints.push(new Endpoint(endpointObj));

        if (this.homePage == null)
            this.homePage = "acct:keycloak-server";
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
            "currentClass": this.currentClass
        };
        if (this.metadata) {
            obj.metadata = this.metadata;
        }
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
            lastSyncedActivityEvents: this.lastSyncedActivityEvents
        };
    }
}

// -------------------------------
