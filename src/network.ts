import { PEBL } from "./pebl";
import { LLSyncAction } from "./syncing";
import { NetworkAdapter, SyncProcess } from "./adapters";
import { Endpoint } from "./models";

let pebl: PEBL;
let syncingProcess: SyncProcess[];

export class Network implements NetworkAdapter {

    private running: boolean;
    private pushTimeout?: number = undefined;

    constructor(incomingPebl: PEBL) {
        pebl = incomingPebl;
        this.running = false;
    }

    activate(): void {
        let self = this;

        pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let endpoints: Endpoint[] = userProfile.endpoints;

                if (!self.running) {
                    syncingProcess = [];
                    for (let e of endpoints)
                        syncingProcess.push(new LLSyncAction(pebl, e));


                    self.push();
                    self.running = true;
                }
            }
        })
    }

    disable(): void {
        this.running = false;

        if (this.pushTimeout)
            clearTimeout(this.pushTimeout);
        this.pushTimeout = undefined;
    }

    push(finished?: (() => void)): void {
        let self = this;
        pebl.user.getUser(function(userProfile) {
            if (userProfile)
                pebl.storage.getOutgoing(userProfile,
                    function(stmts): void {
                        if (syncingProcess.length == 1) {
                            if (stmts.length > 0) {
                                syncingProcess[0].push(stmts,
                                    function(success) {
                                        if (success)
                                            pebl.storage.removeOutgoing(userProfile, stmts);
                                        if (self.running)
                                            self.pushTimeout = setTimeout(self.push, 5000);

                                        if (finished)
                                            finished();
                                    });
                            } else {
                                if (self.running)
                                    self.pushTimeout = setTimeout(self.push, 5000);

                                if (finished)
                                    finished();
                            }
                        }
                    });
            else {
                if (self.running)
                    self.pushTimeout = setTimeout(self.push, 5000);

                if (finished)
                    finished();
            }
        });
    }
}
