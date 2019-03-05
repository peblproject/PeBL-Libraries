export class EventSet {
    [key: string]: any;

    incomingAnnotations = "incomingAnnotations";
    incomingSharedAnnotations = "incomingSharedAnnotations";
    incomingNotifications = "incomingNotifications";
    incomingAssets = "incomingAssets";
    incomingEvents = "incomingEvents";
    incomingPresence = "incomingPresence";
    incomingLearnlet = "incomingLearnlet";
    incomingProgram = "incomingProgram";
    incomingArtifact = "incomingArtifact";
    incomingMembership = "incomingMembership";
    incomingActivityEvents = "incomingActivityEvents";

    incomingErrors = "incomingErrors";

    saveProgram = "saveProgram";

    newLearnlet = "newLearnlet";
    newBook = "newBook";
    newMessage = "newMessage";
    newActivity = "newActivity";
    newAnnotation = "newAnnotation";
    newReference = "newReference";
    newPresence = "newPresence";
    newMembership = "newMembership";
    newSharedAnnotation = "newSharedAnnotation";
    newArtifact = "newArtifact";

    removedPresence = "removedPresence";
    removedMembership = "removedMembership";
    removedAnnotation = "removedAnnotation";
    removedSharedAnnotation = "removedSharedAnnotation";
    removedLearnlet = "removedLearnlet";
    removedProgram = "removedProgram";
    removedMessage = "removedMessage";

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
    eventHelped = "eventHelped";
    eventInvited = "eventInvited";
    eventUninvited = "eventUninvited";

    eventProgramLevelUp = "eventProgramLevelUp";
    eventProgramLevelDown = "eventProgramLevelDown";
    eventProgramInvited = "eventProgramInvited";
    eventProgramUninvited = "eventProgramUninvited";
    eventProgramJoined = "eventProgramJoined";
    eventProgramExpelled = "eventProgramExpelled";
}
