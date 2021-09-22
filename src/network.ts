/*

  Copyright 2021 Eduworks Corporation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

import { PEBL } from "./pebl";
import { LLSyncAction } from "./syncing";
import { NetworkAdapter, SyncProcess } from "./adapters";
import { Reference } from "./xapi";

export class Network implements NetworkAdapter {

    private running: boolean;
    private pushTimeout?: number = undefined;
    private pushActivityTimeout?: number = undefined;

    private pullAssetTimeout?: number = undefined;

    private pebl: PEBL;
    private syncingProcess: SyncProcess;
    private networkId: string;

    private ELECTED_PUSH_SHORT_TIMEOUT = 3 * 1000;
    private ELECTED_PUSH_LONG_TIMEOUT = 7.5 * 1000;

    private SHORT_PUSH_TIMEOUT = 2000;
    private LONG_PUSH_TIMEOUT = 5000;

    private LEADER_SHORT = "leaderShort";
    private LEADER_LONG = "leaderLong";

    private ELECTED_SHORT = "electedShort";
    private ELECTED_LONG = "electedLong";

    constructor(pebl: PEBL) {
        this.pebl = pebl;
        this.running = false;
        this.networkId = this.pebl.utils.getUuid();
        this.syncingProcess = new LLSyncAction(pebl);
    }

    activate(callback?: (() => void)): void {
        if (!this.running) {
            this.running = true;
            this.syncingProcess.activate(() => {
                this.push();
                this.pushActivity();
                this.pullAsset();
                if (localStorage[this.LEADER_SHORT] === "") {
                    localStorage[this.LEADER_SHORT] = this.networkId;
                    localStorage[this.ELECTED_SHORT] = Date.now();
                }
                if (localStorage[this.LEADER_LONG] === "") {
                    localStorage[this.LEADER_LONG] = this.networkId;
                    localStorage[this.ELECTED_LONG] = Date.now();
                }
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

    uploadAsset(file: File, activityId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            if (this.pebl.config && this.pebl.config.PeBLServicesURL) {
                let fd = new FormData();
                fd.append('activityId', activityId);
                fd.append('media', file);

                fetch(this.pebl.config.PeBLServicesURL + '/user/media', {
                    credentials: 'include',
                    method: 'POST',
                    body: fd
                }).then(async (res) => {
                    if (!res.ok)
                        throw Error(await res.text());
                    return res.text();
                }).then((mediaId) => {
                    console.log(mediaId);
                    resolve(mediaId);
                }).catch((e) => {
                    console.error(e);
                    reject(e);
                })
            } else {
                reject();
            }
        })
    }

    fetchAsset(assetId: string): Promise<File> {
        return new Promise((resolve, reject) => {
            if (this.pebl.config && this.pebl.config.PeBLServicesURL) {
                fetch(this.pebl.config.PeBLServicesURL + '/user/media?id=' + assetId, {
                    credentials: 'include',
                    method: 'GET'
                }).then(res => res.blob()).then(blob => {
                    console.log(blob);
                    resolve(new File([blob], assetId, { type: blob.type }));
                }).catch((e) => {
                    console.error(e);
                    reject();
                })
            }
        })
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
                                            this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);

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
                                        //         this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
                                        // });

                                        // xhr.addEventListener("error", function() {
                                        //     this.pebl.storage.saveNotification(userProfile, ref);

                                        //     this.pebl.emitEvent(this.pebl.events.incomingNotification, ref);

                                        //     this.pebl.storage.removeQueuedReference(userProfile, ref.id);

                                        //     if (this.running)
                                        //         this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
                                        // });

                                        // let url = userProfile.registryEndpoint && userProfile.registryEndpoint.url;

                                        // if (url) {
                                        //     xhr.open("GET", url + ref.url);
                                        //     xhr.send();
                                        // } else if (this.running)
                                        //     this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
                                    } else {
                                        this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
                                    }
                                });

                            } else {
                                if (this.running)
                                    this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
                            }
                        });
                    } else if (this.running) {
                        this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
                    }
                });
            } else if (this.running)
                this.pullAssetTimeout = setTimeout(this.pullAsset.bind(this), this.LONG_PUSH_TIMEOUT);
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

        if (localStorage[this.LEADER_LONG] !== this.networkId) {
            const electedTime = parseInt(localStorage[this.ELECTED_LONG] || '0');
            const time = Date.now();
            if ((electedTime + this.ELECTED_PUSH_LONG_TIMEOUT) < time) {
                localStorage[this.LEADER_LONG] = this.networkId;
                localStorage[this.ELECTED_LONG] = time;
            }
            if (this.running)
                this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), this.LONG_PUSH_TIMEOUT);
            if (finished)
                finished();
            return;
        }
        localStorage[this.ELECTED_LONG] = Date.now();

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
                                        this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), this.LONG_PUSH_TIMEOUT);

                                    if (finished)
                                        finished();
                                });
                        } else {
                            if (this.running)
                                this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), this.LONG_PUSH_TIMEOUT);

                            if (finished)
                                finished();
                        }
                    });
            } else if (this.running)
                this.pushActivityTimeout = setTimeout(this.pushActivity.bind(this), this.LONG_PUSH_TIMEOUT);
        });
    }

    push(finished?: (() => void)): void {
        if (this.pushTimeout) {
            clearTimeout(this.pushTimeout);
            this.pushTimeout = undefined;
        }

        if (localStorage[this.LEADER_SHORT] !== this.networkId) {
            const electedTime = parseInt(localStorage[this.ELECTED_SHORT] || '0');
            const time = Date.now();
            if ((electedTime + this.ELECTED_PUSH_SHORT_TIMEOUT) < time) {
                localStorage[this.LEADER_SHORT] = this.networkId;
                localStorage[this.ELECTED_SHORT] = time;
            }
            if (this.running)
                this.pushTimeout = setTimeout(this.push.bind(this), this.SHORT_PUSH_TIMEOUT);
            if (finished)
                finished();
            return;
        }
        localStorage[this.ELECTED_SHORT] = Date.now();

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
                                        this.pushTimeout = setTimeout(this.push.bind(this), this.SHORT_PUSH_TIMEOUT);

                                    if (finished)
                                        finished();
                                });
                        } else {
                            if (this.running)
                                this.pushTimeout = setTimeout(this.push.bind(this), this.SHORT_PUSH_TIMEOUT);

                            if (finished)
                                finished();
                        }
                    });
            } else {
                if (this.running)
                    this.pushTimeout = setTimeout(this.push.bind(this), this.SHORT_PUSH_TIMEOUT);

                if (finished)
                    finished();
            }
        });
    }
}
