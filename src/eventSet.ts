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
    newVariable = "newVariable";

    modifiedMembership = "modifiedMembership";

    pinnedMessage = "pinnedMessage";
    unpinnedMessage = "unpinnedMessage";

    pinnedAnnotation = "pinnedAnnotation";
    unpinnedAnnotation = "unpinnedAnnotation";

    reportedMessage = "reportedMessage";
    unreportedMessage = "unreportedMessage";

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
    eventUploadedMedia = "eventUploadedMedia";
    eventInitializedGeneric = "eventInitializedGeneric";
    eventCompletedGeneric = "eventCompletedGeneric";
    eventPlayed = "eventPlayed";
    eventPaused = "eventPaused";
    eventSeeked = "eventSeeked";


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

    getChapterCompletionPercentages = "getChapterCompletionPercentages";
    getMostAnsweredQuestions = "getMostAnsweredQuestions";
    getLeastAnsweredQuestions = "getLeastAnsweredQuestions";
    getQuizAttempts = "getQuizAttempts";
    getReportedThreadedMessages = "getReportedThreadedMessages";
}
