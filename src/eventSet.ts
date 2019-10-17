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
    incomingInstitution = "incomingInstitution";
    incomingSystem = "incomingSystem";
    incomingArtifact = "incomingArtifact";
    incomingMembership = "incomingMembership";
    incomingActivityEvents = "incomingActivityEvents";
    incomingModuleEvents = "incomingModuleEvents";

    incomingErrors = "incomingErrors";

    saveProgram = "saveProgram";
    saveProgramConflict = "saveProgramConflict";
    saveProgramSuccess = "saveProgramSuccess";
    saveProgramError = "saveProgramError";
    saveInstitution = "saveInstitution";
    saveSystem = "saveSystem";

    newBookNoReset = "newBookNoReset";

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

    modifiedMembership = "modifiedMembership";

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
    eventFinishedLogin = "eventFinishedLogin";
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
    eventExperienced = "eventExperienced";
    eventDisliked = "eventDisliked";
    eventLiked = "eventLiked";
    eventAccessed = "eventAccessed";
    eventHid = "eventHid";
    eventShowed = "eventShowed";
    eventDisplayed = "eventDisplayed";
    eventUndisplayed = "eventUndisplayed";
    eventBookmarked = "eventBookmarked";
    eventAnnotated = "eventAnnotated";
    eventSearched = "eventSearched";
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
    eventProgramActivityLaunched = "eventProgramActivityLaunched";
    eventProgramActivityCompleted = "eventProgramActivityCompleted";
    eventProgramActivityTeamCompleted = "eventProgramActivityTeamCompleted";
    eventProgramModified = "eventProgramModified";
    eventProgramDeleted = "eventProgramDeleted";
    eventProgramCompleted = "eventProgramCompleted";
    eventProgramCopied = "eventProgramCopied";
    eventProgramDiscussed = "eventProgramDiscussed";

    eventModuleRating = "eventModuleRating";
    eventModuleFeedback = "eventModuleFeedback";
    eventModuleExample = "eventModuleExample";
    eventModuleExampleRating = "eventModuleExampleRating";
    eventModuleExampleFeedback = "eventModuleExampleFeedback";
    moduleRemovedEvent = "moduleRemovedEvent";

    totalInstitutionActivities = "totalInstitutionActivities";
}
