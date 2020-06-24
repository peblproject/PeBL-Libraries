import { PEBL } from "./pebl";
import { LLSyncAction } from "./syncing";
import { NetworkAdapter, SyncProcess } from "./adapters";
import { Reference } from "./xapi";
// import { Activity } from "./activity";


export class Network implements NetworkAdapter {

    private running: boolean;
    private pushTimeout?: number = undefined;
    private pushActivityTimeout?: number = undefined;

    private pullAssetTimeout?: number = undefined;

    private pebl: PEBL;
    private syncingProcess: SyncProcess;

    constructor(pebl: PEBL) {
        this.pebl = pebl;
        this.running = false;
        this.syncingProcess = new LLSyncAction(pebl);
    }

    activate(callback?: (() => void)): void {
        if (!this.running) {
            this.running = true;
            this.syncingProcess.activate(() => {
                this.push();
                this.pushActivity();
                this.pullAsset();
                if (callback)
                    callback();
            });
        } else {
            if (callback)
                callback();
        }
    }

    queueReference(ref: Reference): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile)
                self.pebl.storage.saveQueuedReference(userProfile, ref, self.pullAsset.bind(self));
        });
    }

    retrievePresence(): void {
        // for (let sync of this.syncingProcess)
        //     sync.retrievePresence();
    }

    private pullAsset(): void {
        this.pebl.user.getUser((userProfile) => {
            if (userProfile && userProfile.registryEndpoint) {
                this.pebl.storage.getCurrentBook((currentBook) => {
                    if (currentBook) {
                        this.pebl.storage.getQueuedReference(userProfile, currentBook, (ref) => {
                            if (ref) {
                                this.pebl.storage.getToc(userProfile, ref.book, (toc) => {
                                    //Wait to add resources until the static TOC has been initialized, otherwise it never gets intialized
                                    if (toc.length > 0) {
                                        // this.pebl.storage.saveNotification(userProfile, ref);
                                        let tocEntry: { [key: string]: any } = {
                                            "url": ref.url,
                                            "documentName": ref.name,
                                            "section": ref.location,
                                            "pageKey": ref.id,
                                            "docType": ref.docType,
                                            "card": ref.card,
                                            "externalURL": ref.externalURL
                                        };

                                        this.pebl.storage.saveToc(userProfile, ref.book, tocEntry);

                                        this.pebl.emitEvent(this.pebl.events.incomingNotification, ref);
                                        this.pebl.emitEvent(this.pebl.events.updatedToc, ref.book);

                                        this.pebl.storage.removeQueuedReference(userProfile, ref.id);

                                        if (this.running)
                                            this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);

                                        // The below requires an API that is currently unavailable and also not needed at this time
                                        // let xhr = new XMLHttpRequest();

                                        // xhr.addEventListener("load", function() {
                                        //     this.pebl.storage.saveNotification(userProfile, ref);
                                        //     let tocEntry: { [key: string]: any } = {
                                        //         "url": ref.url,
                                        //         "documentName": ref.name,
                                        //         "section": ref.location,
                                        //         "pageKey": ref.id,
                                        //         "docType": ref.docType,
                                        //         "card": ref.card,
                                        //         "externalURL": ref.externalURL
                                        //     };

                                        //     this.pebl.storage.saveToc(userProfile, ref.book, tocEntry);

                                        //     this.pebl.emitEvent(this.pebl.events.incomingNotification, ref);

                                        //     this.pebl.storage.removeQueuedReference(userProfile, ref.id);

                                        //     if (this.running)
                                        //         this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
                                        // });

                                        // xhr.addEventListener("error", function() {
                                        //     this.pebl.storage.saveNotification(userProfile, ref);

                                        //     this.pebl.emitEvent(this.pebl.events.incomingNotification, ref);

                                        //     this.pebl.storage.removeQueuedReference(userProfile, ref.id);

                                        //     if (this.running)
                                        //         this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
                                        // });

                                        // let url = userProfile.registryEndpoint && userProfile.registryEndpoint.url;

                                        // if (url) {
                                        //     xhr.open("GET", url + ref.url);
                                        //     xhr.send();
                                        // } else if (this.running)
                                        //     this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
                                    } else {
                                        this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
                                    }
                                });

                            } else {
                                if (this.running)
                                    this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
                            }
                        });
                    } else if (this.running) {
                        this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
                    }
                });
            } else if (this.running)
                this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), 5000);
        });
    }

    disable(callback?: (() => void)): void {
        if (this.running) {
            this.running = false;

            if (this.pushTimeout)
                clearTimeout(this.pushTimeout);
            this.pushTimeout = undefined;

            if (this.pullAssetTimeout)
                clearTimeout(this.pullAssetTimeout);
            this.pullAssetTimeout = undefined;

            this.syncingProcess.disable(() => {
                if (callback)
                    callback();
            })
        } else {
            if (callback) {
                callback();
            }
        }
    }

    pushActivity(finished?: (() => void)): void {
        if (this.pushActivityTimeout) {
            clearTimeout(this.pushActivityTimeout);
            this.pushActivityTimeout = undefined;
        }

        this.pebl.user.getUser((userProfile) => {
            if (userProfile) {
                this.pebl.storage.getOutgoingActivity(userProfile,
                    (stmts): void => {
                        if (stmts.length > 0) {
                            this.syncingProcess.pushActivity(stmts,
                                (success) => {
                                    if (success)
                                        this.pebl.storage.removeOutgoingActivity(userProfile, stmts);
                                    if (this.running)
                                        this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), 5000);

                                    if (finished)
                                        finished();
                                });
                        } else {
                            if (this.running)
                                this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), 5000);

                            if (finished)
                                finished();
                        }
                    });
            } else if (this.running)
                this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), 5000);
        });
    }

    push(finished?: (() => void)): void {
        if (this.pushTimeout) {
            clearTimeout(this.pushTimeout);
            this.pushTimeout = undefined;
        }

        this.pebl.user.getUser((userProfile) => {
            if (userProfile) {
                this.pebl.storage.getOutgoingXApi(userProfile,
                    (stmts): void => {
                        if (stmts.length > 0) {
                            this.syncingProcess.push(stmts,
                                (success) => {
                                    if (success)
                                        this.pebl.storage.removeOutgoingXApi(userProfile, stmts);
                                    if (this.running)
                                        this.pushTimeout = setTimeout(this.push.bind(this), 2000);

                                    if (finished)
                                        finished();
                                });
                        } else {
                            if (this.running)
                                this.pushTimeout = setTimeout(this.push.bind(this), 2000);

                            if (finished)
                                finished();
                        }
                    });
            } else {
                if (this.running)
                    this.pushTimeout = setTimeout(this.push.bind(this), 2000);

                if (finished)
                    finished();
            }
        });
    }
}
