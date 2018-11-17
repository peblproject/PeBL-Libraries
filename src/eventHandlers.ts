const PEBL_PREFIX = "pebl://";
const PEBL_THREAD_PREFIX = "peblThread://";
// const PEBL_THREAD_USER_PREFIX = "peblThread://user-";

import { PEBL } from "./pebl";
import { XApiGenerator } from "./xapiGenerator";
import { SharedAnnotation, Annotation, Voided, Session, Navigation, Action, Reference, Message, Question, Quiz } from "./xapi";
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

    newBook(event: CustomEvent) {
        let book: string = event.detail;
        let self = this;
        if (book.indexOf("/") != -1)
            book = book.substring(book.lastIndexOf("/") + 1);

        this.pebl.storage.getCurrentBook(function(currentBook) {
            if (currentBook != book) {
                if (currentBook)
                    self.pebl.emitEvent(self.pebl.events.eventTerminated, currentBook);
                self.pebl.storage.removeCurrentActivity();
                self.pebl.emitEvent(self.pebl.events.eventInteracted, {
                    activity: book
                });

                self.pebl.unsubscribeAllEvents();
                self.pebl.unsubscribeAllThreads();
                self.pebl.storage.saveCurrentBook(book);
            } else {
                self.pebl.emitEvent(self.pebl.events.eventJumpPage, null);
            }
        });
    }

    newActivity(event: CustomEvent) {
        let activity = event.detail;
        let self = this;
        this.pebl.storage.getCurrentActivity(function(currentActivity) {
            if (activity != currentActivity) {
                if (currentActivity)
                    self.pebl.emitEvent(self.pebl.events.eventTerminated, currentActivity);
                self.pebl.emitEvent(self.pebl.events.eventInitialized, {
                    activity: activity
                });
            }

            self.pebl.storage.saveCurrentActivity(activity);
        });
    }

    newReference(event: CustomEvent): void {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            docType: payload.docType,
            location: payload.location,
            card: payload.card,
            url: payload.url,
            book: payload.book,
            externalURL: payload.externalURL
        };

        this.pebl.storage.getCurrentActivity(function(activity) {
            self.pebl.storage.getCurrentBook(function(book) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_THREAD_PREFIX + payload.target, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        if (userProfile.identity == payload.target)
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#pulled", "pulled");
                        else
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#pushed", "pushed");
                        if (activity || book)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        let s = new Reference(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                        // self.pebl.emitEvent(self.pebl.events.in)
                    }
                });
            });
        });
    }

    newMessage(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/responded", "responded");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addObject(xapi, PEBL_THREAD_PREFIX + payload.to, payload.prompt, payload.text);
                        self.xapiGen.addActorAccount(xapi, userProfile);

                        let message = new Message(xapi);
                        self.pebl.storage.saveMessages(userProfile, message);
                        self.pebl.storage.saveOutgoing(userProfile, message);
                        self.pebl.emitEvent(message.thread, [message]);
                    });
                });
            }
        });
    }

    newAnnotation(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {

                let exts = {
                    annId: payload.annId,
                    type: payload.type,
                    cfi: payload.cfi,
                    idRef: payload.idRef,
                    style: payload.style
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/commented", "commented");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.title, payload.text, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addActorAccount(xapi, userProfile);

                        let annotation = new Annotation(xapi);
                        self.pebl.storage.saveAnnotations(userProfile, annotation);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingAnnotations, [annotation]);
                    });
                });
            }
        });
    }

    newSharedAnnotation(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {

                let exts = {
                    annId: payload.annId,
                    type: payload.type,
                    cfi: payload.cfi,
                    idRef: payload.idRef,
                    style: payload.style
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {

                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/shared", "shared");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.title, payload.text, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addActorAccount(xapi, userProfile);

                        let annotation = new SharedAnnotation(xapi);
                        self.pebl.storage.saveAnnotations(userProfile, annotation);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [annotation]);
                    });
                });
            }
        });
    }

    removedAnnotation(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        else
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addStatementRef(xapi, xId);
                        self.xapiGen.addActorAccount(xapi, userProfile);

                        let annotation = new Voided(xapi);
                        self.pebl.storage.removeAnnotation(userProfile, xId);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingAnnotations, [annotation]);
                    });
                });
            }
        });
    }

    removedSharedAnnotation(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
                self.xapiGen.addTimestamp(xapi);
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        else
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                        self.xapiGen.addStatementRef(xapi, xId);
                        self.xapiGen.addActorAccount(xapi, userProfile);

                        let annotation = new Voided(xapi);
                        self.pebl.storage.removeAnnotation(userProfile, xId);
                        self.pebl.storage.saveOutgoing(userProfile, annotation);
                        self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [annotation]);

                    });
                });
            }
        });
    }

    // -------------------------------

    eventLoggedIn(event: CustomEvent) {
        let userP = new UserProfile(event.detail);
        let self = this;

        this.pebl.storage.getCurrentUser(function(currentIdentity) {
            self.pebl.storage.saveUserProfile(userP, function() {
                if (userP.identity != currentIdentity) {
                    self.pebl.emitEvent(self.pebl.events.eventLogin, userP);
                }
                self.pebl.network.activate();
            });
        });
    }

    eventLoggedOut(event: CustomEvent) {
        let self = this;
        this.pebl.user.getUser(function(currentUser) {
            self.pebl.network.disable(function() {
                self.pebl.emitEvent(self.pebl.events.eventLogout, currentUser);
            });
        });
    }

    // -------------------------------

    eventSessionStart(event: CustomEvent) {
        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#entered", "entered");
                        if (book || activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                        let s = new Session(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);

                    });
                });
            }
        });
    }

    eventSessionStop(event: CustomEvent) {
        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#exited", "exited");
                        if (book || activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                        let s = new Session(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);

                    });
                });
            }
        });
    }

    // -------------------------------

    eventTerminated(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_PREFIX + payload);
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/terminated", "terminated");
                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + payload);

                let s = new Session(xapi);
                self.pebl.storage.saveOutgoing(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    eventInitialized(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_PREFIX + payload.activity, payload.name, payload.description);
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/initialized", "initialized");
                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + payload.activity);

                let s = new Session(xapi);
                self.pebl.storage.saveOutgoing(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    eventInteracted(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            target: payload.target,
            type: payload.type
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_PREFIX + payload.activity, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/interacted", "interacted");
                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + payload.activity);

                let s = new Action(xapi);
                self.pebl.storage.saveOutgoing(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    eventJumpedPage(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_PREFIX + payload.activity, payload.name, payload.description);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#paged-jump", "paged-jump");
                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + payload.activity);

                let s = new Navigation(xapi);
                self.pebl.storage.saveOutgoing(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    // -------------------------------

    eventAnswered(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.storage.getCurrentActivity(function(activity) {
            self.pebl.storage.getCurrentActivity(function(book) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObjectInteraction(xapi, PEBL_PREFIX + book, payload.name, payload.prompt, "choice", payload.answers, payload.correctAnswers);
                        self.xapiGen.addResult(xapi, payload.score, payload.minScore, payload.maxScore, payload.complete, payload.success, payload.answered);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/answered", "answered");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        let s = new Question(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventPassed(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.storage.getCurrentActivity(function(activity) {
            self.pebl.storage.getCurrentActivity(function(book) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description);
                        self.xapiGen.addResult(xapi, payload.score, payload.minScore, payload.maxScore, payload.complete, payload.success);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/passed", "passed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        let s = new Quiz(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventFailed(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.storage.getCurrentActivity(function(activity) {
            self.pebl.storage.getCurrentActivity(function(book) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description);
                        self.xapiGen.addResult(xapi, payload.score, payload.minScore, payload.maxScore, payload.complete, payload.success);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/failed", "failed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        let s = new Quiz(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    // -------------------------------

    eventPreferred(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            target: payload.target,
            type: payload.type
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_PREFIX + payload.activity, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/preferred", "preferred");
                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + payload.activity);

                let s = new Action(xapi);
                self.pebl.storage.saveOutgoing(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    eventContentMorphed(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            target: payload.target,
            type: payload.type
        }

        this.pebl.storage.getCurrentActivity(function(activity) {
            self.pebl.storage.getCurrentBook(function(book) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#morphed", "morphed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventNextPage(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            firstCfi: payload.firstCfi,
            lastCfi: payload.lastCfi
        }

        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#paged-next", "paged-next");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Navigation(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventPrevPage(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            firstCfi: payload.firstCfi,
            lastCfi: payload.lastCfi
        }

        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#paged-prev", "paged-prev");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Navigation(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventCompleted(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/completed", "completed");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Navigation(xapi);
                        self.pebl.storage.saveOutgoing(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventCompatibilityTested(event: CustomEvent) {

    }

    eventChecklisted(event: CustomEvent) {

    }

    // -------------------------------

    eventLogin(event: CustomEvent) {

        let userProfile = event.detail;
        let xapi = {};
        let self = this;

        this.pebl.storage.saveCurrentUser(userProfile, function() {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/logged-in", "logged-in");
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book);
                    else
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + "Harness");

                    self.xapiGen.addActorAccount(xapi, userProfile);

                    let session = new Session(xapi);
                    self.pebl.storage.saveEvent(userProfile, session);
                    self.pebl.storage.saveOutgoing(userProfile, session);

                });
            }
        });
    }

    eventLogout(event: CustomEvent) {
        let xapi = {};
        let self = this;

        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/logged-out", "logged-out");
                self.pebl.storage.getCurrentBook(function(book) {
                    if (book)
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book);
                    else
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + "Harness");

                    self.xapiGen.addActorAccount(xapi, userProfile);

                    let session = new Session(xapi);
                    self.pebl.storage.saveEvent(userProfile, session);
                    self.pebl.storage.saveOutgoing(userProfile, session);

                    self.pebl.storage.removeCurrentUser();
                });
            }
        });
    }
}
