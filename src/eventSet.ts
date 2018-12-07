export class EventSet {
    [key: string]: any;

    incomingAnnotations = "incomingAnnotations";
    incomingSharedAnnotations = "incomingSharedAnnotations";
    incomingNotifications = "incomingNotifications";
    incomingAssets = "incomingAssets";
    incomingEvents = "incomingEvents";
    incomingPresence = "incomingPresence";

    newBook = "newBook";
    newMessage = "newMessage";
    newActivity = "newActivity";
    newAnnotation = "newAnnotation";
    newReference = "newReference";
    newSharedAnnotation = "newSharedAnnotation";

    removedAnnotation = "removedAnnotation";
    removedSharedAnnotation = "removedSharedAnnotation";

    eventLoggedIn = "eventLoggedIn";
    eventLoggedOut = "eventLoggedOut";
    eventLogin = "eventLogin";
    eventLogout = "eventLogout";
    eventSessionStart = "eventSessionStart";
    eventSessionStop = "eventSessionStop";
    eventNextPage = "eventNextPage";
    eventPrevPage = "eventPrevPage";
    eventJumpPage = "eventJumpPage";
    eventInitialized = "eventInitialized";
    eventTerminated = "eventTerminated";
    eventInteracted = "eventInteracted";
    eventAnswered = "eventAnswered";
    eventPassed = "eventPassed";
    eventFailed = "eventFailed";
    eventPreferred = "eventPreferred";
    eventContentMorphed = "eventContentMorphed";
    eventCompleted = "eventCompleted";
    eventCompatibilityTested = "eventCompatibilityTested";
    eventChecklisted = "eventChecklisted";
}
