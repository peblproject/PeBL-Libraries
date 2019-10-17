const PEBL_PREFIX = "pebl://";
const PEBL_THREAD_PREFIX = "peblThread://";
const PEBL_THREAD_USER_PREFIX = "peblThread://user-";
const PEBL_THREAD_ARTIFACT_PREFIX = "peblThread://artifact-";
const PEBL_THREAD_GROUP_PREFIX = "peblThread://group-";

import { PEBL } from "./pebl";
import { XApiGenerator } from "./xapiGenerator";
import { SharedAnnotation, Annotation, Voided, Session, Navigation, Action, Reference, Message, Question, Quiz, Membership, Artifact, Invitation, ProgramAction, CompatibilityTest, ModuleRating, ModuleFeedback, ModuleExample, ModuleExampleRating, ModuleExampleFeedback, ModuleRemovedEvent } from "./xapi";
import { UserProfile } from "./models";
import { Learnlet, Program, Institution, System } from "./activity";

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
                self.pebl.emitEvent(self.pebl.events.eventJumpPage, {});
            }
        });
    }

    newBookNoReset(event: CustomEvent) {
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

                self.pebl.storage.saveCurrentBook(book);
            } else {
                self.pebl.emitEvent(self.pebl.events.eventJumpPage, {});
            }
        });
    }

    newActivity(event: CustomEvent) {
        let payload = event.detail;
        let self = this;
        this.pebl.storage.getCurrentActivity(function(currentActivity) {
            if (payload.activity != currentActivity) {
                if (currentActivity)
                    self.pebl.emitEvent(self.pebl.events.eventTerminated, currentActivity);
                self.pebl.emitEvent(self.pebl.events.eventInitialized, {
                    name: payload.name,
                    description: payload.description
                });
            }

            self.pebl.storage.saveCurrentActivity(payload.activity);
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
                        self.xapiGen.addObject(xapi, PEBL_THREAD_USER_PREFIX + payload.target, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        var pulled = userProfile.identity == payload.target;
                        if (pulled)
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#pulled", "pulled");
                        else
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#pushed", "pushed");
                        if (activity || book)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        let s = new Reference(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                        if (pulled)
                            self.pebl.emitEvent(PEBL_THREAD_USER_PREFIX + payload.target, [s]);
                    }
                });
            });
        });
    }

    newMessage(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            access: payload.access,
            type: payload.type
        };

        self.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/responded", "responded");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addObject(xapi, PEBL_THREAD_PREFIX + payload.thread, payload.prompt, payload.text, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addActorAccount(xapi, userProfile);

                        let message = new Message(xapi);
                        self.pebl.storage.saveMessages(userProfile, message);
                        self.pebl.storage.saveOutgoingXApi(userProfile, message);
                        self.pebl.emitEvent(message.thread, [message]);
                    });
                });
            }
        });
    }

    removedMessage(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addStatementRef(xapi, xId);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + xId);

                        let m = new Voided(xapi);
                        self.pebl.storage.removeMessage(userProfile, xId);
                        self.pebl.storage.saveOutgoingXApi(userProfile, m);
                    });
                });
            }
        });
    }

    newLearnlet(event: CustomEvent) {
        // let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {

                // let exts = {
                //     cfi: payload.cfi
                // };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        // self.xapiGen.addId(xapi);
                        // self.xapiGen.addTimestamp(xapi);
                        // self.xapiGen.addActorAccount(xapi, userProfile);
                        // self.xapiGen.addObject(xapi, PEBL_THREAD_USER_PREFIX + payload.thread, payload.learnletId, payload.learnletDescription, exts);
                        // self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#learnletCreated", "learnletCreated");
                        // if (book || activity)
                        //     self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                        let m = new Learnlet(xapi);
                        self.pebl.storage.saveOutgoingActivity(userProfile, m);
                        // self.pebl.storage.saveEvent(userProfile, m);
                    });
                });
            }
        });
    }

    saveProgram(event: CustomEvent) {
        let prog: Program = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let exts = {
                    role: "owner",
                    activityType: "program"
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        if (Program.isNew(prog)) {
                            self.xapiGen.addId(xapi);
                            self.xapiGen.addTimestamp(xapi);
                            self.xapiGen.addActorAccount(xapi, userProfile);
                            self.xapiGen.addObject(xapi, PEBL_THREAD_USER_PREFIX + userProfile.identity, prog.id, prog.programShortDescription, self.xapiGen.addExtensions(exts));
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#joined", "joined");
                            if (book || activity)
                                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                            let m = new Membership(xapi);
                            prog.addMember(m);
                            self.pebl.storage.saveGroupMembership(userProfile, m);
                            self.pebl.storage.saveOutgoingXApi(userProfile, m);
                        }
                        self.pebl.storage.saveOutgoingActivity(userProfile, prog);
                        self.pebl.storage.saveActivity(userProfile, prog);
                        self.pebl.emitEvent(self.pebl.events.incomingProgram, [prog]);
                    });
                });
            }
        });
    }

    saveInstitution(event: CustomEvent) {
        let inst = new Institution(event.detail);

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let exts = {
                    role: "owner",
                    activityType: "institution"
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        if (Institution.isNew(inst)) {
                            self.xapiGen.addId(xapi);
                            self.xapiGen.addTimestamp(xapi);
                            self.xapiGen.addActorAccount(xapi, userProfile);
                            self.xapiGen.addObject(xapi, PEBL_THREAD_USER_PREFIX + userProfile.identity, inst.id, inst.description, self.xapiGen.addExtensions(exts));
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#joined", "joined");
                            if (book || activity)
                                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                            let m = new Membership(xapi);
                            inst.addMember(m);
                            self.pebl.storage.saveGroupMembership(userProfile, m);
                            self.pebl.storage.saveOutgoingXApi(userProfile, m);
                        }
                        self.pebl.storage.saveOutgoingActivity(userProfile, inst);
                        self.pebl.storage.saveActivity(userProfile, inst);
                        self.pebl.emitEvent(self.pebl.events.incomingInstitition, [inst]);
                    });
                });
            }
        });
    }

    saveSystem(event: CustomEvent) {
        let system = new System(event.detail);

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let exts = {
                    role: "owner",
                    activityType: "system"
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        if (System.isNew(system)) {
                            self.xapiGen.addId(xapi);
                            self.xapiGen.addTimestamp(xapi);
                            self.xapiGen.addActorAccount(xapi, userProfile);
                            self.xapiGen.addObject(xapi, PEBL_THREAD_USER_PREFIX + userProfile.identity, system.id, system.description, self.xapiGen.addExtensions(exts));
                            self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#joined", "joined");
                            if (book || activity)
                                self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                            let m = new Membership(xapi);
                            system.addMember(m);
                            self.pebl.storage.saveGroupMembership(userProfile, m);
                            self.pebl.storage.saveOutgoingXApi(userProfile, m);
                        }
                        self.pebl.storage.saveOutgoingActivity(userProfile, system);
                        self.pebl.storage.saveActivity(userProfile, system);
                        self.pebl.emitEvent(self.pebl.events.incomingSystem, [system]);
                    });
                });
            }
        });
    }

    newArtifact(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {

                let exts = {
                    role: payload.role
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_THREAD_ARTIFACT_PREFIX + payload.thread, payload.artifactId, payload.artifactDescription, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#artifactCreated", "artifactCreated");
                        if (book || activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                        let m = new Artifact(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, m);
                        self.pebl.storage.saveEvent(userProfile, m);
                    });
                });
            }
        });
    }

    newMembership(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {

                let exts = {
                    role: payload.role,
                    activityType: payload.activityType,
                    organization: payload.organization,
                    organizationName: payload.organizationName
                };

                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_THREAD_USER_PREFIX + payload.thread, payload.groupId, payload.groupDescription, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#joined", "joined");
                        if (book || activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (book || activity));

                        let m = new Membership(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, m);
                        self.pebl.emitEvent(self.pebl.events.incomingMembership, [m]);
                        if (payload.thread == userProfile.identity)
                            self.pebl.storage.saveGroupMembership(userProfile, m);
                    });
                });
            }
        });
    }

    modifiedMembership(event: CustomEvent) {
        let payload = event.detail;
        let oldMembership = payload.oldMembership;
        let newMembership = payload.newMembership;

        let xapiVoided = {};
        let xapiNew = {
            id: ''
        };
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                let newUserProfile = new UserProfile({
                    identity: oldMembership.actor.account.name,
                    name: oldMembership.actor.name,
                    homePage: oldMembership.actor.account.homePage,
                    preferredName: oldMembership.actor.name
                });

                // First void the old membership
                self.xapiGen.addId(xapiVoided);
                self.xapiGen.addVerb(xapiVoided, "http://adlnet.gov/expapi/verbs/voided", "voided");
                self.xapiGen.addTimestamp(xapiVoided);
                self.xapiGen.addStatementRef(xapiVoided, oldMembership.id);
                self.xapiGen.addActorAccount(xapiVoided, newUserProfile);
                self.xapiGen.addParentActivity(xapiVoided, PEBL_PREFIX + oldMembership.id);

                let m = new Voided(xapiVoided);
                // If modifying my own membership
                self.pebl.storage.saveOutgoingXApi(userProfile, m);
                if (newUserProfile.identity === userProfile.identity)
                    self.pebl.storage.removeGroupMembership(newUserProfile, oldMembership.id);

                self.pebl.emitEvent(self.pebl.events.incomingMembership, [m]);

                // Then send out a new one

                if (newMembership) {
                    let exts = {
                        role: newMembership.role,
                        activityType: newMembership.activityType,
                        organization: newMembership.organization,
                        organizationName: newMembership.organizationName
                    }

                    self.pebl.storage.getCurrentActivity(function(activity) {
                        self.pebl.storage.getCurrentBook(function(book) {
                            xapiNew.id = newMembership.id;
                            self.xapiGen.addTimestamp(xapiNew);
                            self.xapiGen.addActorAccount(xapiNew, newUserProfile);
                            self.xapiGen.addObject(xapiNew, PEBL_THREAD_USER_PREFIX + newUserProfile.identity, newMembership.membershipId, newMembership.groupDescription, self.xapiGen.addExtensions(exts));
                            self.xapiGen.addVerb(xapiNew, "http://www.peblproject.com/definitions.html#joined", "joined");
                            if (book || activity)
                                self.xapiGen.addParentActivity(xapiNew, PEBL_PREFIX + (book || activity));

                            let n = new Membership(xapiNew);
                            self.pebl.storage.saveOutgoingXApi(userProfile, n);
                            self.pebl.emitEvent(self.pebl.events.incomingMembership, [n]);
                            if (newUserProfile.identity === userProfile.identity)
                                self.pebl.storage.saveGroupMembership(userProfile, n);
                        });
                    });
                }
            }
        });
    }

    removedMembership(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addStatementRef(xapi, xId);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + xId);

                        let m = new Voided(xapi);
                        self.pebl.storage.removeGroupMembership(userProfile, xId);
                        self.pebl.storage.saveOutgoingXApi(userProfile, m);
                        self.pebl.emitEvent(self.pebl.events.incomingMembership, [m]);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, annotation);
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
                        self.pebl.storage.saveSharedAnnotations(userProfile, annotation);
                        self.pebl.storage.saveOutgoingXApi(userProfile, annotation);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, annotation);
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
                        self.pebl.storage.removeSharedAnnotation(userProfile, xId);
                        self.pebl.storage.saveOutgoingXApi(userProfile, annotation);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                self.pebl.storage.saveOutgoingXApi(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    eventInitialized(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.user.getUser(function(userProfile) {
                if (userProfile) {
                    self.xapiGen.addId(xapi);
                    self.xapiGen.addTimestamp(xapi);
                    self.xapiGen.addActorAccount(xapi, userProfile);
                    self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description);
                    self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/initialized", "initialized");
                    self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + payload.activity);

                    let s = new Session(xapi);
                    self.pebl.storage.saveOutgoingXApi(userProfile, s);
                    self.pebl.storage.saveEvent(userProfile, s);
                }
            });
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
                self.pebl.storage.saveOutgoingXApi(userProfile, s);
                self.pebl.storage.saveEvent(userProfile, s);
            }
        });
    }

    eventJumpPage(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#paged-jump", "paged-jump");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Navigation(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
        this.pebl.storage.getCurrentActivity(function(activity) {
            self.pebl.storage.getCurrentActivity(function(book) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/preferred", "preferred");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + (activity || book));

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventExperienced(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#experienced", "experienced");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventDisliked(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#disliked", "disliked");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventLiked(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#liked", "liked");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventAccessed(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#accessed", "accessed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventHid(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#hid", "hid");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventShowed(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#showed", "showed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventDisplayed(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#displayed", "displayed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventUndisplayed(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#undisplayed", "undisplayed");
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Action(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
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
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventCompatibilityTested(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            readerName: payload.readerName,
            osName: payload.osName,
            osVersion: payload.osVersion,
            browserName: payload.browserName,
            browserVersion: payload.browserVersion,
            userAgent: payload.userAgent,
            appVersion: payload.appVersion,
            platform: payload.platform,
            vendor: payload.vendor,
            testResults: payload.testResults
        }

        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.name, payload.description, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#compatibilityTested", "compatibilityTested");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let test = new CompatibilityTest(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, test);
                    }
                });
            });
        });
    }

    eventChecklisted(event: CustomEvent) {

    }

    eventHelped(event: CustomEvent) {
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
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#helped", "helped");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let s = new Navigation(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, s);
                        self.pebl.storage.saveEvent(userProfile, s);
                    }
                });
            });
        });
    }

    eventInvited(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            programId: payload.programId,
            programRole: payload.programRole
        }

        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + 'Harness', payload.token, payload.description, self.xapiGen.addExtensions(exts));
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#invited", "invited");
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);

                        let invite = new Invitation(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, invite);
                    }
                });
            });
        });
    }

    eventUninvited(event: CustomEvent) {
        let xId = event.detail;

        let xapi = {};
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addStatementRef(xapi, xId);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + 'Harness');

                        let uninvite = new Voided(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, uninvite);
                    });
                });
            }
        });
    }

    eventProgramLevelUp(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programLevelUp", "programLevelUp");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramLevelDown(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programLevelDown", "programLevelDown");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramInvited(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programInvited", "programInvited");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramUninvited(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programUninvited", "programUninvited");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramJoined(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programJoined", "programJoined");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramExpelled(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programExpelled", "programExpelled");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramActivityLaunched(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programActivityLaunched", "programActivityLaunched");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramActivityCompleted(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programActivityCompleted", "programActivityCompleted");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramActivityTeamCompleted(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programActivityTeamCompleted", "programActivityTeamCompleted");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramModified(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programModified", "programModified");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramDeleted(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programDeleted", "programDeleted");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramCompleted(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programCompleted", "programCompleted");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramCopied(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programCopied", "programCopied");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
    }

    eventProgramDiscussed(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            previousValue: payload.previousValue,
            newValue: payload.newValue,
            action: payload.action
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.xapiGen.addId(xapi);
                self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#programDiscussed", "programDiscussed");
                self.xapiGen.addTimestamp(xapi);
                self.xapiGen.addActorAccount(xapi, userProfile);
                self.xapiGen.addObject(xapi, PEBL_THREAD_GROUP_PREFIX + payload.programId, payload.programId, payload.description, self.xapiGen.addExtensions(exts));

                let pa = new ProgramAction(xapi);
                self.pebl.storage.saveOutgoingXApi(userProfile, pa);
            }
        });
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
                    self.pebl.storage.saveOutgoingXApi(userProfile, session);

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
                    self.pebl.storage.saveOutgoingXApi(userProfile, session);

                    self.pebl.storage.removeCurrentUser();
                });
            }
        });
    }

    // -------------------------------

    eventModuleRating(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            idref: payload.idref,
            programId: payload.programId
        }
        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#moduleRating", "moduleRating");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.rating, payload.description, self.xapiGen.addExtensions(exts));
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        let mr = new ModuleRating(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, mr);
                    }
                });
            });
        });
    }

    eventModuleFeedback(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            willingToDiscuss: payload.willingToDiscuss,
            idref: payload.idref,
            programId: payload.programId
        }
        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#moduleFeedback", "moduleFeedback");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.feedback, payload.description, self.xapiGen.addExtensions(exts));
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        let mf = new ModuleFeedback(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, mf);
                    }
                });
            });
        });
    }

    eventModuleExample(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            idref: payload.idref,
            youtubeUrl: payload.youtubeUrl,
            imageUrl: payload.imageUrl,
            websiteUrl: payload.websiteUrl,
            quotedPerson: payload.quotedPerson,
            quotedTeam: payload.quotedTeam
        }
        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#moduleExample", "moduleExample");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.example, payload.description, self.xapiGen.addExtensions(exts));
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        let me = new ModuleExample(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, me);
                        self.pebl.emitEvent(self.pebl.events.incomingModuleEvents, [me]);
                    }
                });
            });
        });
    }

    eventModuleExampleRating(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            idref: payload.idref,
            programId: payload.programId,
            exampleId: payload.exampleId
        }
        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#moduleExampleRating", "moduleExampleRating");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.rating, payload.description, self.xapiGen.addExtensions(exts));
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        let mer = new ModuleExampleRating(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, mer);
                    }
                });
            });
        });
    }

    eventModuleExampleFeedback(event: CustomEvent) {
        let payload = event.detail;

        let xapi = {};
        let self = this;

        let exts = {
            willingToDiscuss: payload.willingToDiscuss,
            idref: payload.idref,
            programId: payload.programId,
            exampleId: payload.exampleId
        }
        this.pebl.storage.getCurrentBook(function(book) {
            self.pebl.storage.getCurrentActivity(function(activity) {
                self.pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        self.xapiGen.addId(xapi);
                        self.xapiGen.addVerb(xapi, "http://www.peblproject.com/definitions.html#moduleExampleFeedback", "moduleExampleFeedback");
                        self.xapiGen.addTimestamp(xapi);
                        self.xapiGen.addActorAccount(xapi, userProfile);
                        self.xapiGen.addObject(xapi, PEBL_PREFIX + book, payload.feedback, payload.description, self.xapiGen.addExtensions(exts));
                        if (activity)
                            self.xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                        let mef = new ModuleExampleFeedback(xapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, mef);
                    }
                });
            });
        });
    }

    moduleRemovedEvent(event: CustomEvent) {
        let payload = event.detail;

        let voidXapi = {};
        let eventXapi = {};
        let self = this;

        let exts = {
            type: payload.type
        }

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile) {
                self.pebl.storage.getCurrentActivity(function(activity) {
                    self.pebl.storage.getCurrentBook(function(book) {
                        self.xapiGen.addId(voidXapi);
                        self.xapiGen.addVerb(voidXapi, "http://adlnet.gov/expapi/verbs/voided", "voided");
                        self.xapiGen.addTimestamp(voidXapi);
                        self.xapiGen.addStatementRef(voidXapi, payload.eventId);
                        self.xapiGen.addActorAccount(voidXapi, userProfile);
                        if (activity)
                            self.xapiGen.addParentActivity(voidXapi, PEBL_PREFIX + activity);

                        let voided = new Voided(voidXapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, voided);

                        // Send event to everyone to remove that module event from their local storage

                        self.xapiGen.addId(eventXapi);
                        self.xapiGen.addVerb(eventXapi, "http://www.peblproject.com/definitions.html#moduleRemovedEvent", "moduleRemovedEvent");
                        self.xapiGen.addTimestamp(eventXapi);
                        self.xapiGen.addActorAccount(eventXapi, userProfile);
                        self.xapiGen.addObject(eventXapi, PEBL_PREFIX + book, payload.idref, payload.eventId, self.xapiGen.addExtensions(exts));
                        if (activity)
                            self.xapiGen.addParentActivity(eventXapi, PEBL_PREFIX + activity);
                        let mre = new ModuleRemovedEvent(eventXapi);
                        self.pebl.storage.saveOutgoingXApi(userProfile, mre);
                        self.pebl.emitEvent(self.pebl.events.incomingModuleEvents, [mre]);
                    });
                });
            }
        });
    }

    incomingModuleEvents(event: CustomEvent) {
        let self = this;
        let events = event.detail;

        for (let event of events) {
            if (event.verb.display['en-US'] === 'moduleRemovedEvent') {
                self.pebl.storage.removeModuleEvent(event.idref, event.eventId);
            }
        }
    }
}
