const PREFIX_PEBL_EXTENSION = "https://www.peblproject.com/definitions.html#";
const PEBL_ACTIVITY_PREFIX = "http://www.peblproject.com/activities/";

import { UserProfile } from "./models";
import { getBrowserMetadata } from "./utils";

export class XApiGenerator {

    addExtensions(extensions: { [key: string]: any }): { [key: string]: any } {

        let result: { [key: string]: any } = {};

        for (let key of Object.keys(extensions)) {
            if (key.startsWith('http') || key.startsWith('https'))
                result[key] = extensions[key];
            else
                result[PREFIX_PEBL_EXTENSION + key] = extensions[key];
        }

        return result;
    }

    addResult(stmt: { [key: string]: any }, score?: number, minScore?: number, maxScore?: number, complete?: boolean, success?: boolean, answered?: string, duration?: string, extensions?: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.result)
            stmt.result = {};
        stmt.result.success = success;
        stmt.result.completion = complete;
        stmt.result.response = answered;

        if (score) {
            if (!stmt.result.score)
                stmt.result.score = {};

            stmt.result.score.raw = score;
            stmt.result.score.duration = duration;
            if (minScore && maxScore)
                stmt.result.score.scaled = (score - minScore) / (maxScore - minScore);
            stmt.result.score.min = minScore;
            stmt.result.score.max = maxScore;
        }
        

        if (extensions) {
            if (!stmt.result.extensions)
                stmt.result.extensions = {};

            for (let key of Object.keys(extensions)) {
                stmt.result.extensions[key] = extensions[key];
            }
        }

        return stmt;
    }

    addResultResponse(stmt: { [key: string]: any }, response: string, complete: boolean, duration?: string, extensions?: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.result)
            stmt.result = {};
        stmt.result.response = response;
        stmt.result.completion = complete;
        if (duration)
            stmt.result.duration = duration;
        if (extensions) {
            if (!stmt.result.extensions)
                stmt.result.extensions = {};
            for (let key of Object.keys(extensions)){
                stmt.result.extensions[key] = extensions[key];
            }
        }

        return stmt;
    }

    addResultExtensions(stmt: { [key: string]: any }, extensions?: { [key: string]: any }): { [key: string]: any } {
        if (extensions) {
            if (!stmt.result)
                stmt.result = {};
            if (!stmt.result.extensions)
                stmt.result.extensions = {};
            for (let key of Object.keys(extensions)) {
                stmt.result.extensions[key] = extensions[key];
            }
        }

        return stmt;
    }

    addObject(stmt: { [key: string]: any }, activityId: string, name?: string, description?: string, activityType?: string, extensions?: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.object)
            stmt.object = {};

        stmt.object.id = activityId;
        stmt.object.objectType = "Activity";

        if (!stmt.object.definition)
            stmt.object.definition = {}

        if (name) {
            if (!stmt.object.definition.name)
                stmt.object.definition.name = {}

            stmt.object.definition.name["en-US"] = name;
        }

        if (description) {
            if (!stmt.object.definition.description)
                stmt.object.definition.description = {}

            stmt.object.definition.description["en-US"] = description;
        }

        if (activityType)
            stmt.object.definition.type = activityType;

        if (extensions)
            stmt.object.definition.extensions = extensions;

        return stmt;
    }

    private memberToIndex(x: string, arr: string[]): number {
        for (let i = 0; i < arr.length; i++)
            if (x == arr[i])
                return i;
        return -1;
    }

    private arrayToIndexes(arr: string[], indexArr: string[]): string[] {
        let clone: string[] = arr.slice(0);
        for (let i = 0; i < arr.length; i++) {
            clone[i] = this.memberToIndex(arr[i], indexArr).toString();
        }
        return clone;
    }

    addObjectInteraction(stmt: { [key: string]: any }, activityId: string, name: string, prompt: string, interaction: string, answers: string[], correctAnswers: string[][], extensions?: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.object)
            stmt.object = {};

        stmt.object.id = activityId;
        stmt.object.objectType = "Activity";

        if (!stmt.object.definition)
            stmt.object.definition = {}

        if (!stmt.object.definition.name)
            stmt.object.definition.name = {}

        stmt.object.definition.type = "http://adlnet.gov/expapi/activities/cmi.interaction";
        stmt.object.definition.interactionType = interaction;

        let answerArr = [];
        for (let corrrectAnswer of correctAnswers)
            answerArr.push(this.arrayToIndexes(corrrectAnswer, answers).join("[,]"));

        stmt.object.definition.correctResponsesPattern = answerArr;

        if (interaction == "choice") {
            stmt.object.definition.choices = [];

            let i = 0;
            for (let answer of answers) {
                stmt.object.definition.choices.push({
                    id: i.toString(),
                    description: {
                        "en-US": answer
                    }
                });
                i++;
            }
        }

        stmt.object.definition.name["en-US"] = name;

        if (!stmt.object.definition.description)
            stmt.object.definition.description = {}

        stmt.object.definition.description["en-US"] = prompt;

        if (extensions)
            stmt.object.definition.extensions = extensions;

        return stmt;
    }

    addVerb(stmt: { [key: string]: any }, url: string, name: string): { [key: string]: any } {
        stmt.verb = {
            id: url,
            display: {
                "en-US": name
            }
        }
        return stmt;
    }

    addActorAccount(stmt: { [key: string]: any }, userProfile: UserProfile): { [key: string]: any } {
        if (!stmt.actor)
            stmt.actor = {};
        stmt.actor.objectType = "Agent";
        stmt.actor.name = userProfile.name || userProfile.identity;
        stmt.actor.account = {
            homePage: userProfile.homePage,
            name: userProfile.identity
        };
        return stmt;
    }

    addActorMBox(stmt: { [key: string]: any }, userProfile: UserProfile): { [key: string]: any } {
        if (!stmt.actor)
            stmt.actor = {};
        stmt.actor.objectType = "Agent";
        stmt.actor.name = userProfile.name;
        stmt.actor.mbox = userProfile.identity;
        return stmt;
    }

    addTimestamp(stmt: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.timestamp)
            stmt.timestamp = new Date().toISOString();

        return stmt;
    }

    addStatementRef(stmt: { [key: string]: any }, id: string): { [key: string]: any } {
        if (!stmt.object)
            stmt.object = {}

        stmt.object.objectType = "StatementRef";
        stmt.object.id = id;

        return stmt;
    }

    addId(stmt: { [key: string]: any }): { [key: string]: any } {
        /*!
          Excerpt from: Math.uuid.js (v1.4)
          http://www.broofa.com
          mailto:robert@broofa.com
          Copyright (c) 2010 Robert Kieffer
          Dual licensed under the MIT and GPL licenses.
        */
        stmt.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return stmt;
    }

    addContext(stmt: { [key: string]: any }, options: { [key: string]: any }): { [key: string]: any } {
        stmt.context = options;
        return stmt;
    }

    addParentActivity(stmt: { [key: string]: any }, parentId: string): { [key: string]: any } {
        if (!stmt.context)
            stmt.context = {};

        if (!stmt.context.contextActivities)
            stmt.context.contextActivities = {};

        if (!stmt.context.contextActivities.parent)
            stmt.context.contextActivities.parent = [];

        stmt.context.contextActivities.parent.push({
            objectType: "Activity",
            id: parentId
        });

        return stmt;
    }

    addPeblContextExtensions(obj: { [key: string]: any }, userProfile: UserProfile, bookTitle?: string, bookId?: string) {
        let platform = getBrowserMetadata();

        obj.browserName = platform.name;
        obj.browserVersion = platform.version;
        obj.osName = platform.os.family;
        obj.osVersion = platform.os.version;

        obj.contextOrigin = window.location.origin;
        obj.contextUrl = window.location.href;

        if (userProfile.currentTeam)
            obj.currentTeam = userProfile.currentTeam;
        if (userProfile.currentClass)
            obj.currentClass = userProfile.currentClass;

        if (bookTitle)
            obj.bookTitle = bookTitle;
        if (bookId)
            obj.bookId = bookId;

        return obj;
    }

    addPeblActivity(activityURI?: string, activityType?: string, activityId?: string) {
        if (activityURI)
            return activityURI;

        if (activityType) {
            var peblActivity = PEBL_ACTIVITY_PREFIX + activityType;

            if (activityId)
                peblActivity += ('?id=' + activityId);

            return peblActivity;
        }
        

        return 'pebl://deprecated';
    }

    addAttachments(stmt: { [key: string]: any }, attachments: {display: {[key: string]: string}, contentType: string, length: number, sha2: string}[]) {
        if (!stmt.attachments && attachments)
            stmt.attachments = attachments;

        return stmt;
    }
}
