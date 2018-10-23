class UserProfile {
    readonly identity: string;
    readonly name: string;
    readonly homePage: string;
    readonly preferredName: string;
    readonly lrsUrls: { [key: string]: Endpoint };

    constructor(raw: { [key: string]: any }) {
        this.identity = raw.identity;
        this.name = raw.name;
        this.homePage = raw.homePage;
        this.preferredName = raw.preferredName;
        this.lrsUrls = raw.lrsUrls;

        if (this.homePage == null)
            this.homePage = "acct:keycloak-server";
    }

    toObject(): { [key: string]: any } {
        let urls: { [key: string]: any } = {};
        for (let key of Object.keys(this.lrsUrls)) {
            let e = this.lrsUrls[key];
            urls[e.url] = e.toObject();
        }
        return {
            "identity": this.identity,
            "name": this.name,
            "homePage": this.homePage,
            "preferredName": this.preferredName,
            "lrsUrls": urls
        };
    }

}

class Endpoint {
    readonly url: string;
    readonly username: string;
    readonly password: string;
    readonly token: string;
    readonly lastSyncedThreads: { [key: string]: Date }
    readonly lastSyncedBooksMine: { [key: string]: Date }
    readonly lastSyncedBooksShared: { [key: string]: Date }

    constructor(raw: { [key: string]: any }) {
        this.url = raw.url;
        this.username = raw.username;
        this.password = raw.password;
        this.token = raw.token;

        this.lastSyncedBooksMine = {};
        this.lastSyncedBooksShared = {};
        this.lastSyncedThreads = {};
    }

    toObject(urlPrefix: string = ""): { [key: string]: any } {
        return {
            url: urlPrefix + this.url,
            username: this.username,
            password: this.password,
            token: this.token,
            lastSyncedThreads: this.lastSyncedThreads,
            lastSyncedBooksMine: this.lastSyncedBooksMine,
            lastSyncedBooksShared: this.lastSyncedBooksMine
        };
    }
}
