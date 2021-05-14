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

import { UserAdapter } from "./adapters";
import { PEBL } from "./pebl"
import { UserProfile } from "./models";

export class User implements UserAdapter {
    private pebl: PEBL;

    constructor(pebl: PEBL) {
        this.pebl = pebl;
    }

    isLoggedIn(callback: (loggedIn: boolean) => void): void {
        this.pebl.storage.getCurrentUser(function(currentUser) {
            callback(currentUser != null);
        });
    }

    getUser(callback: (userProfile?: UserProfile) => void): void {
        let self = this;
        this.pebl.storage.getCurrentUser(function(currentUser) {
            if (currentUser) {
                self.pebl.storage.getUserProfile(currentUser,
                    function(userProfile) {
                        if (userProfile)
                            callback(userProfile);
                        else
                            callback();
                    });
            } else
                callback();
        });
    }

    // login(userProfile: UserProfile, callback: () => void): void {
    //     let self = this;
    //     this.pebl.storage.saveUserProfile(userProfile,
    //         function() {
    //             self.pebl.storage.saveCurrentUser(userProfile,
    //                 callback);
    //         });
    // }

    // logout(callback?: (() => void)): void {
    //     if (callback != null)
    //         this.pebl.storage.removeCurrentUser(callback);
    //     else
    //         this.pebl.storage.removeCurrentUser();
    // }
}
