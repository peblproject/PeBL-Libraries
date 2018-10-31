class User implements UserAdapter {
    private pebl: PEBL;

    constructor(pebl: PEBL) {
        this.pebl = pebl;
    }

    isLoggedIn(callback: (loggedIn: boolean) => void): void {
        this.pebl.storage.getCurrentUser(function(currentUser) {
            callback(currentUser != null);
        });
    }

    getUser(callback: (userProfile: (UserProfile | null)) => void): void {
        let self = this;
        this.pebl.storage.getCurrentUser(function(currentUser) {
            if (currentUser) {
                self.pebl.storage.getUserProfile(currentUser,
                    function(userProfile) {
                        if (userProfile)
                            callback(userProfile);
                        else
                            callback(null);
                    });
            } else
                callback(null);
        });
    }

    login(userProfile: UserProfile, callback: () => void): void {
        let self = this;
        this.pebl.storage.saveUserProfile(userProfile,
            function() {
                self.pebl.storage.saveCurrentUser(userProfile,
                    callback);
            });
    }

    logout(callback?: (() => void)): void {
        if (callback != null)
            this.pebl.storage.removeCurrentUser(callback);
        else
            this.pebl.storage.removeCurrentUser();
    }

    listener(): void {

    }
}
