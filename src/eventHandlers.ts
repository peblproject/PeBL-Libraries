const PEBL_PREFIX = "pebl://";

import { PEBL } from "./pebl";
import { XApiGenerator } from "./xapiGenerator";
import { Annotation } from "./xapi";

let pebl: PEBL;
let xapiGen: XApiGenerator;

export class PEBLEventHandlers {

    [key: string]: any;

    constructor(incomingPEBL: PEBL) {
        pebl = incomingPEBL;
        xapiGen = new XApiGenerator();
    }

    // -------------------------------

    openedBook(event: CustomEvent) {
        let book: string = event.detail;
        if (book.indexOf("/") != -1)
            book = book.substring(book.lastIndexOf("/"));

        pebl.storage.getCurrentBook(function(currentBook) {
            if (currentBook != book) {
                pebl.emitEvent(pebl.events.eventTerminated, currentBook);
                pebl.storage.removeCurrentActivity();
                pebl.emitEvent(pebl.events.eventInteracted, book);
            } else {
                pebl.emitEvent(pebl.events.eventJumpPage, null);
            }

            pebl.unsubscribeAllEvents();
            pebl.unsubscribeAllThreads();
            pebl.storage.saveCurrentBook(book);
        });
    }

    newActivity(event: CustomEvent) {
        let activity = event.detail;
        pebl.storage.getCurrentActivity(function(currentActivity) {
            if (activity != currentActivity) {
                pebl.emitEvent(pebl.events.eventTerminated, currentActivity);
                pebl.emitEvent(pebl.events.eventInitialized, activity);
            } else {
                pebl.emitEvent(pebl.events.eventJumpPage, null);
            }

            pebl.unsubscribeAllEvents();
            pebl.unsubscribeAllThreads();
            pebl.storage.saveCurrentActivity(activity);
        });
    }

    // -------------------------------

    newAnnotation(event: CustomEvent) {
        let rawData = event.detail;

        let xapi = {};

        xapiGen.addId(xapi);
        xapiGen.addVerb(xapi, "http://adlnet.gov/expapi/verbs/commented", "commented");
        xapiGen.addTimestamp(xapi);
        delete rawData["book"];
        delete rawData["date"];
        let objExtensions = xapiGen.addExtensions(rawData);

        pebl.storage.getCurrentActivity(function(activity) {

            pebl.storage.getCurrentBook(function(book) {

                if (activity)
                    xapiGen.addParentActivity(xapi, PEBL_PREFIX + activity);
                else
                    xapiGen.addParentActivity(xapi, PEBL_PREFIX + book);

                xapiGen.addObject(xapi, PEBL_PREFIX + book, "Annotation", undefined, objExtensions);

                pebl.user.getUser(function(userProfile) {
                    if (userProfile) {
                        let annotation = new Annotation(xapi);
                        pebl.storage.saveAnnotations(userProfile, annotation);
                        pebl.storage.saveOutgoing(userProfile, annotation);
                    }
                });
            });
        });
    }

    newSharedAnnotation(event: CustomEvent) {
        console.log(event);
    }

    removedAnnotation(event: CustomEvent) {
        console.log(event);
    }

    removedSharedAnnotation(event: CustomEvent) {
        console.log(event);
    }

    // -------------------------------

    eventLoggedIn(event: CustomEvent) {
        let userP = event.detail;

        pebl.storage.getCurrentUser(function(currentIdentity) {
            if (userP.identity != currentIdentity) {

            }
        })
    }

    eventLoggedOut(event: CustomEvent) {
        console.log(event);
    }

    // -------------------------------

    eventSessionStart(event: CustomEvent) {
        // let xapi = event.detail;

        // pebl.user.getUser(function(userProfile) {
        //     if (userProfile)
        //         pebl.storage.saveEvent(userProfile, xapi);
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
}
