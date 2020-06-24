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

    updatedToc = "updatedToc";

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

    eventRefreshLogin = "eventRefreshLogin";
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
    eventAttempted = "eventAttempted";
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
    eventSelected = "eventSelected";
    eventDiscarded = "eventDiscarded";
    eventBookmarked = "eventBookmarked";
    eventUnbookmarked = "eventUnbookmarked";
    eventUnsharedAnnotation = "eventUnsharedAnnotation";
    eventAnnotated = "eventAnnotated";
    eventUnannotated = "eventUnannotated";
    eventNoted = "eventNoted";
    eventSearched = "eventSearched";
    eventCompleted = "eventCompleted";
    eventLaunched = "eventLaunched";
    eventCompatibilityTested = "eventCompatibilityTested";
    eventChecklisted = "eventChecklisted";
    eventHelped = "eventHelped";
    eventInvited = "eventInvited";
    eventUninvited = "eventUninvited";
    eventSubmitted = "eventSubmitted";

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
