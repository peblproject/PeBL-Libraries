import { PEBL } from "./pebl";
import { LLSyncAction } from "./syncing";
import { NetworkAdapter, SyncProcess } from "./adapters";
import { Endpoint } from "./models";
import { Reference } from "./xapi";


export class Network implements NetworkAdapter {

    private running: boolean;
    private pushTimeout?: number = undefined;

    private pullAssetTimeout?: number = undefined;

    private pebl: PEBL;
    private syncingProcess: SyncProcess[];

    constructor(pebl: PEBL) {
        this.pebl = pebl;
        this.running = false;
        this.syncingProcess = [];
    }

    activate(callback?: (() => void)): void {
        let self = this;

        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let endpoints: Endpoint[] = userProfile.endpoints;

                if (!self.running) {
                    self.syncingProcess = [];
                    for (let e of endpoints)
                        self.syncingProcess.push(new LLSyncAction(self.pebl, e));

                    self.push();
                    self.pullAsset();
                    self.running = true;
                }
                if (callback)
                    callback();
            }
        })
    }

    queueReference(ref: Reference): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile)
                self.pebl.storage.saveQueuedReference(userProfile, ref);
        });
    }

    retrievePresence(): void {
        for (let sync of this.syncingProcess)
            sync.retrievePresence();
    }

    private pullAsset(): void {
        let self = this;
        self.pebl.user.getUser(function(userProfile) {

            if (userProfile && userProfile.registryEndpoint) {
                self.pebl.storage.getQueuedReference(userProfile, function(ref) {

                    if (ref) {
                        let xhr = new XMLHttpRequest();

                        xhr.addEventListener("load", function() {
                            self.pebl.storage.saveNotification(userProfile, ref);
                            let tocEntry: { [key: string]: any } = {
                                "url": ref.url,
                                "documentName": ref.name,
                                "section": ref.location,
                                "pageKey": ref.id,
                                "docType": ref.docType,
                                "card": ref.card,
                                "externalURL": ref.externalURL
                            };

                            self.pebl.storage.saveToc(userProfile, ref.book, tocEntry);

                            self.pebl.emitEvent(self.pebl.events.incomingNotification, ref);

                            self.pebl.storage.removeQueuedReference(userProfile, ref.id);

                            if (self.running)
                                self.pullAssetTimeout = setTimeout(self.pullAsset.bind(self), 5000);
                        });

                        xhr.addEventListener("error", function() {
                            self.pebl.storage.saveNotification(userProfile, ref);

                            self.pebl.emitEvent(self.pebl.events.incomingNotification, ref);

                            self.pebl.storage.removeQueuedReference(userProfile, ref.id);

                            if (self.running)
                                self.pullAssetTimeout = setTimeout(self.pullAsset.bind(self), 5000);
                        });

                        let url = userProfile.registryEndpoint && userProfile.registryEndpoint.url;

                        if (url) {
                            xhr.open("GET", url + ref.url);
                            xhr.send();
                        } else if (self.running)
                            self.pullAssetTimeout = setTimeout(self.pullAsset.bind(self), 5000);
                    } else {
                        if (self.running)
                            self.pullAssetTimeout = setTimeout(self.pullAsset.bind(self), 5000);
                    }
                });
            } else if (self.running)
                self.pullAssetTimeout = setTimeout(self.pullAsset.bind(self), 5000);
        });
    }

    disable(callback?: (() => void)): void {
        this.running = false;

        if (this.pushTimeout)
            clearTimeout(this.pushTimeout);
        this.pushTimeout = undefined;

        if (this.pullAssetTimeout)
            clearTimeout(this.pullAssetTimeout);
        this.pullAssetTimeout = undefined;

        if (callback)
            callback();
    }

    push(finished?: (() => void)): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile)
                self.pebl.storage.getOutgoing(userProfile,
                    function(stmts): void {
                        if (self.syncingProcess.length == 1) {
                            if (stmts.length > 0) {
                                self.syncingProcess[0].push(stmts,
                                    function(success) {
                                        if (success)
                                            self.pebl.storage.removeOutgoing(userProfile, stmts);
                                        if (self.running)
                                            self.pushTimeout = setTimeout(self.push.bind(self), 5000);

                                        if (finished)
                                            finished();
                                    });
                            } else {
                                if (self.running)
                                    self.pushTimeout = setTimeout(self.push.bind(self), 5000);

                                if (finished)
                                    finished();
                            }
                        }
                    });
            else {
                if (self.running)
                    self.pushTimeout = setTimeout(self.push.bind(self), 5000);

                if (finished)
                    finished();
            }
        });
    }
}
