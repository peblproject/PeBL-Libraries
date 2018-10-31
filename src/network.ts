class Network implements NetworkAdapter {

    private pebl: PEBL;

    private running: boolean;
    private pushTimeout: (number | null) = null;

    private syncingProcess: SyncProcess[];

    constructor(pebl: PEBL) {
        this.pebl = pebl;
        this.running = false;
        this.syncingProcess = [];
    }

    activate(): void {
        this.running = true;

        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let endpoints: { [key: string]: Endpoint } = userProfile.lrsUrls;

                for (let key of Object.keys(endpoints)) {
                    self.syncingProcess.push(new LLSyncAction(self.pebl, endpoints[key]));
                }
            }
        })

        this.push();
    }

    disable(): void {
        this.running = false;

        if (this.pushTimeout)
            clearTimeout(this.pushTimeout);
        this.pushTimeout = null;
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
                                    function(endpoint, success) {
                                        if (success)
                                            self.pebl.storage.removeOutgoing(userProfile, stmts);
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
