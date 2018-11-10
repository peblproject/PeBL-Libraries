const PEBL_PREFIX = "pebl://";

import { PEBL } from "./pebl";
import { XApiGenerator } from "./xapiGenerator";
import { SharedAnnotation, Annotation, Voided, Session } from "./xapi";
import { UserProfile } from "./models";

export class PEBLEventHandlers {

    [key: string]: any;

    pebl: PEBL;
    xapiGen: XApiGenerator;

    constructor(pebl: PEBL) {
        this.pebl = pebl;
        this.xapiGen = new XApiGenerator();
    }

    // -------------------------------

    openedBook(event: CustomEvent) {
        let book: string = event.detail;
        let self = this;
        if (book.indexOf("/") != -1)
            book = book.substring(book.lastIndexOf("/"));

        this.pebl.storage.getCurrentBook(function(currentBook) {
            if (currentBook != book) {
                self.pebl.emitEvent(self.pebl.events.eventTerminated, currentBook);
                self.pebl.storage.removeCurrentActivity();
                self.pebl.emitEvent(self.pebl.events.eventInteracted, book);
            } else {
                self.pebl.emitEvent(self.pebl.events.eventJumpPage, null);
            }

            self.pebl.unsubscribeAllEvents();
            self.pebl.unsubscribeAllThreads();
            self.pebl.storage.saveCurrentBook(book);
        });
    }

    // -------------------------------

    newActivity(event: CustomEvent) {
        let activity = event.detail;
        let self = this;
        this.pebl.storage.getCurrentActivity(function(currentActivity) {
            if (activity != currentActivity) {
                self.pebl.emitEvent(self.pebl.events.eventTerminated, currentActivity);
                self.pebl.emitEvent(self.pebl.events.eventInitialized, activity);
            } else {
                self.pebl.emitEvent(self.pebl.events.eventJumpPage, null);
            }

            self.pebl.unsubscribeAllEvents();
            self.pebl.unsubscribeAllThreads();
            self.pebl.storage.saveCurrentActivity(activity);
        });
    }

    newMessage(event: CustomEvent) {
        let rawData = event.detail;

        let xapi = {};
        let self = this;

        this.xapiGen.addId(xapi);
        this.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/responded", "responded");
        this.xapiGen.addTimestamp(xapi);
        let objExtensions = this.xapiGen.addExtensions(rawData);

        this.pebl.storage.getCurrentActivity(function(activity) {

            self.pebl.storage.getCurrentBook(function(book) {

                if (activity)
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                else
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                self.xapiGen.addObject(xapi, PEBL_PREFIX + book, "Message", undefined, objExtensions);

                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        let annotation = new Annotation(xapi);
                        self.pebl.storage.saveAnnotations(userProfile, annotation);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                    }
                });
            });
        });
    }

    newAnnotation(event: CustomEvent) {
        let rawData = event.detail;

        let xapi = {};
        let self = this;

        this.xapiGen.addId(xapi);
        this.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/commented", "commented");
        this.xapiGen.addTimestamp(xapi);
        delete rawData["book"];
        delete rawData["date"];
        let objExtensions = this.xapiGen.addExtensions(rawData);

        this.pebl.storage.getCurrentActivity(function(activity) {

            self.pebl.storage.getCurrentBook(function(book) {

                if (activity)
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                else
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                self.xapiGen.addObject(xapi, PEBL_PREFIX + book, "Annotation", undefined, objExtensions);

                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        let annotation = new Annotation(xapi);
                        self.pebl.storage.saveAnnotations(userProfile, annotation);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingAnnotations, [annotation]);
                    }
                });
            });
        });
    }

    newSharedAnnotation(event: CustomEvent) {
        let rawData = event.detail;

        let xapi = {};
        let self = this;

        this.xapiGen.addId(xapi);
        this.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/shared", "shared");
        this.xapiGen.addTimestamp(xapi);
        delete rawData["book"];
        delete rawData["date"];
        let objExtensions = this.xapiGen.addExtensions(rawData);

        this.pebl.storage.getCurrentActivity(function(activity) {

            self.pebl.storage.getCurrentBook(function(book) {

                if (activity)
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                else
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                self.xapiGen.addObject(xapi, PEBL_PREFIX + book, "Shared Annotation", undefined, objExtensions);

                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        let annotation = new SharedAnnotation(xapi);
                        self.pebl.storage.saveAnnotations(userProfile, annotation);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [annotation]);
                    }
                });
            });
        });
    }

    removedAnnotation(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        this.xapiGen.addId(xapi);
        this.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
        this.xapiGen.addTimestamp(xapi);
        this.pebl.storage.getCurrentActivity(function(activity) {

            self.pebl.storage.getCurrentBook(function(book) {

                if (activity)
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                else
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                self.xapiGen.addStatementRef(xapi, xId);

                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        let annotation = new Voided(xapi);
                        self.pebl.storage.removeAnnotation(userProfile, xId);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingAnnotations, [annotation]);
                    }
                });
            });
        });
    }

    removedSharedAnnotation(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        this.xapiGen.addId(xapi);
        this.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
        this.xapiGen.addTimestamp(xapi);
        this.pebl.storage.getCurrentActivity(function(activity) {

            self.pebl.storage.getCurrentBook(function(book) {

                if (activity)
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                else
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                self.xapiGen.addStatementRef(xapi, xId);

                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        let annotation = new Voided(xapi);
                        self.pebl.storage.removeAnnotation(userProfile, xId);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [annotation]);
                    }
                });
            });
        });
    }

    // -------------------------------

    eventLoggedIn(event: CustomEvent) {
        let userP = new UserProfile(event.detail);
        let self = this;

        this.pebl.storage.getCurrentUser(function(currentIdentity) {
            self.pebl.storage.saveUserProfile(userP);

            if (userP.identity != currentIdentity) {
                self.pebl.emitEvent(self.pebl.events.eventLogin, userP);
            }
            self.pebl.network.activate();
        })
    }

    eventLoggedOut(event: CustomEvent) {
        let self = this;
        this.pebl.user.getUser(function(currentUser) {
            self.pebl.emitEvent(self.pebl.events.eventLogout, currentUser);
            self.pebl.network.disable();
        });
    }

    // -------------------------------

    eventSessionStart(event: CustomEvent) {
        // let xapi = event.detail;

        // this.pebl.user.getUser(function(userProfile) {
        //     if (userProfile)
        //         this.pebl.storage.saveEvent(userProfile, xapi);
        // });
    }

    eventSessionStop(event: CustomEvent) {

    }

    // -------------------------------

    eventTerminated(event: CustomEvent) {

    }

    eventInitialized(event: CustomEvent) {

    }

    eventInteracted(event: CustomEvent) {

    }

    // -------------------------------

    eventAnswered(event: CustomEvent) {

    }

    eventPassed(event: CustomEvent) {

    }

    eventFailed(event: CustomEvent) {

    }

    // -------------------------------

    eventPreferred(event: CustomEvent) {

    }

    eventContentMorphed(event: CustomEvent) {

    }

    eventCompatibilityTested(event: CustomEvent) {

    }

    eventChecklisted(event: CustomEvent) {

    }

    eventPulled(event: CustomEvent) {

    }

    eventPushed(event: CustomEvent) {

    }

    // -------------------------------

    eventLogin(event: CustomEvent) {
        this.pebl.storage.saveCurrentUser(event.detail);

        let xapi = {};
        let self = this;

        this.xapiGen.addId(xapi);
        this.xapiGen.addTimestamp(xapi);
        this.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/logged-in", "logged-in");
        this.pebl.storage.getCurrentBook(function(book) {
            if (book)
                self.xapiGen.addObject(xapi, PEBL_PREFIX + book);
            else
                self.xapiGen.addObject(xapi, PEBL_PREFIX + "Harness");

            self.pebl.user.getUser(function(userProfile) {
                if (userProfile) {
                    self.xapiGen.addActorAccount(xapi, userProfile);
                    let session = new Session(xapi);
                    self.pebl.storage.saveEvent(userProfile, session);
                    self.pebl.storage.saveOutgoing(userProfile, session);
                }
            });
        });
    }

    eventLogout(event: CustomEvent) {
        this.pebl.storage.removeCurrentUser();
    }
}
