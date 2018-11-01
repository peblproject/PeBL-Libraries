export class XApiGenerator {

    addExtensions(stmt: { [key: string]: any }, extensions: { [key: string]: any }): { [key: string]: any } {

        if (!stmt.extensions)
            stmt.extensions = {};

        for (let key of Object.keys(extensions)) {
            stmt.extensions[key] = extensions[key];
        }

        return stmt;
    }

    makeAccountAgent(homePage: string, user: string): { [key: string]: any } {
        return {
            homePage: homePage,
            name: user
        }
    }

    addResult(stmt: { [key: string]: any }, score: number, minScore: number, maxScore: number, complete: boolean, success: boolean, answered?: string, duration?: string, extensions?: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.result)
            stmt.result = {};
        stmt.result.success = success;
        stmt.result.complete = complete;
        stmt.result.response = answered;

        if (!stmt.result.score)
            stmt.result.score = {};

        stmt.result.score.raw = score;
        stmt.result.score.scaled = (score - minScore) / (maxScore - minScore);
        stmt.result.score.min = minScore;
        stmt.result.score.max = maxScore;

        if (extensions) {
            if (!stmt.extensions)
                stmt.extensions = {};

            for (let key of Object.keys(extensions)) {
                stmt.extensions[key] = extensions[key];
            }
        }

        return stmt;
    }

    addObjectInteraction(stmt: { [key: string]: any }, activityId: string, name: string, description: string, prompt: string, interaction: string, answers: string[], correctAnswers: string[][]): { [key: string]: any } {
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
        for (let answers of correctAnswers) {
            answerArr.push(answers.join("[,]"));
        }
        stmt.object.definition.correctResponsePattern = answerArr;

        if (interaction == "choice") {
            stmt.object.definition.choices = [];

            let i = 0;
            for (let answer of answers) {
                stmt.object.definition.choices.push({
                    id: i,
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

        stmt.object.definition.description["en-US"] = description;

        return stmt;
    }

    addVerb(name: string, url: string, stmt: { [key: string]: any }): { [key: string]: any } {
        stmt.verb = {
            id: url,
            display: {
                "en-US": name
            }
        }
        return stmt;
    }

    addActorAccount(name: string, accountAgent: { [key: string]: any }, stmt: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.actor)
            stmt.actor = {};
        stmt.actor.objectType = "agent";
        stmt.actor.name = name;
        stmt.actor.account = accountAgent;
        return stmt;
    }

    addActorMBox(name: string, mbox: string, stmt: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.actor)
            stmt.actor = {};
        stmt.actor.objectType = "agent";
        stmt.actor.name = name;
        stmt.actor.mbox = mbox;
        return stmt;
    }

    addTimestamp(stmt: { [key: string]: any }): { [key: string]: any } {
        if (!stmt.timestamp)
            stmt.timestamp = new Date().toISOString();

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

    addContext(options: { [key: string]: any }, stmt: { [key: string]: any }): { [key: string]: any } {
        stmt.context = options;
        return stmt;
    }
}
