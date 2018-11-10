const NAMESPACE_USER_MESSAGES = "user-";
const PREFIX_PEBL_THREAD = "peblThread://";
const PREFIX_PEBL_EXTENSION = "https://www.peblproject.com/definitions.html#";

// -------------------------------

export class XApiStatement {

    identity?: string;
    readonly id: string;
    readonly "object": { [key: string]: any };
    readonly actor: { [key: string]: any };
    readonly verb: { [key: string]: any };
    readonly context: { [key: string]: any };
    readonly result: { [key: string]: any };
    readonly attachments: { [key: string]: any }[];
    readonly stored: string;
    readonly timestamp: string;

    constructor(raw: { [key: string]: any }) {
        this.id = raw.id;
        this.actor = raw.actor;
        this.verb = raw.verb;
        this.context = raw.context;
        this.stored = raw.stored;
        this.timestamp = raw.timestamp;
        this.result = raw.result;
        this["object"] = raw.object;
        this.attachments = raw.attachments;
    }

    toXAPI(): XApiStatement {
        return new XApiStatement(this);
    }

    getActorId(): string {
        return this.actor.mbox || this.actor.openid ||
            (this.actor.account && this.actor.account.name);
    }
}

// -------------------------------

export class Reference extends XApiStatement {
    readonly thread: string;
    readonly book: string;
    readonly docType: string;
    readonly location: string;
    readonly card: string;
    readonly url: string;
    readonly target: string;
    readonly name: string;
    readonly externalURL: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.thread = this["object"].id;
        if (this.thread.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.thread = this.thread.substring(PREFIX_PEBL_THREAD.length);

        let extensions = this["object"].extensions;

        this.book = extensions[PREFIX_PEBL_EXTENSION + "book"];
        this.docType = extensions[PREFIX_PEBL_EXTENSION + "docType"];
        this.location = extensions[PREFIX_PEBL_EXTENSION + "location"];
        this.card = extensions[PREFIX_PEBL_EXTENSION + "card"];
        this.url = extensions[PREFIX_PEBL_EXTENSION + "url"];
        this.target = extensions[PREFIX_PEBL_EXTENSION + "target"];
        this.name = extensions[PREFIX_PEBL_EXTENSION + "name"];
        this.externalURL = extensions[PREFIX_PEBL_EXTENSION + "externalURL"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "pushed") || (verb == "pulled");
    }
}

// -------------------------------

export class Annotation extends XApiStatement {
    readonly book: string;
    readonly annId: string;
    readonly ["type"]: string;
    readonly cfi: string;
    readonly idRef: string;
    readonly title: string;
    readonly style: string;
    readonly text: string;
    readonly owner: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this["object"].extensions;

        this.book = extensions[PREFIX_PEBL_EXTENSION + "book"];
        this.annId = extensions[PREFIX_PEBL_EXTENSION + "annId"];
        this["type"] = extensions[PREFIX_PEBL_EXTENSION + "type"];
        this.cfi = extensions[PREFIX_PEBL_EXTENSION + "cfi"];
        this.idRef = extensions[PREFIX_PEBL_EXTENSION + "idRef"];
        this.title = extensions[PREFIX_PEBL_EXTENSION + "title"];
        this.style = extensions[PREFIX_PEBL_EXTENSION + "style"];
        this.text = extensions[PREFIX_PEBL_EXTENSION + "text"];
        this.owner = extensions[PREFIX_PEBL_EXTENSION + "owner"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "commented");
    }
}

// -------------------------------

export class SharedAnnotation extends Annotation {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "shared");
    }
}

// -------------------------------

export class Action extends XApiStatement {
    readonly activityId: string;
    readonly target: string;
    readonly ["type"]: string;
    readonly action: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.activityId = this.object.id;

        let extensions = this.object.extensions;

        this.target = extensions[PREFIX_PEBL_EXTENSION + "target"];
        this["type"] = extensions[PREFIX_PEBL_EXTENSION + "type"];
        this.action = extensions[PREFIX_PEBL_EXTENSION + "action"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "preferred") || (verb == "morphed") || (verb == "interacted");
    }
}

// -------------------------------

export class Navigation extends XApiStatement {
    readonly activityId: string;

    readonly type: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.type = this.verb.display["en-US"];
        this.activityId = this.object.id;
    }
}

// -------------------------------

export class Message extends XApiStatement {
    readonly thread: string;
    readonly text: string;
    readonly prompt: string;
    readonly name: string;
    readonly direct: boolean;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.thread = this.object.id;
        if (this.thread.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.thread = this.thread.substring(PREFIX_PEBL_THREAD.length);

        this.prompt = this.object.name["en-US"];
        this.name = this.actor.name;
        this.direct = this.thread == (NAMESPACE_USER_MESSAGES + this.getActorId());
        this.text = this.object.description["en-US"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "responded");
    }
}

// -------------------------------

export class Voided extends XApiStatement {
    readonly thread: string;
    readonly target: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.thread = this.context.contextActivities.parent[0].id;
        if (this.thread.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.thread = this.thread.substring(PREFIX_PEBL_THREAD.length);

        this.target = this.object.id;
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "voided");
    }
}

// -------------------------------

export class Question extends XApiStatement {

    readonly score: number;
    readonly min: number;
    readonly max: number;

    readonly activityId: string;

    readonly completion: boolean;
    readonly success: boolean;

    readonly answers: string[];
    readonly prompt: string;

    readonly response: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.score = this.result.score.raw;
        this.min = this.result.score.min;
        this.max = this.result.score.max;

        this.completion = this.result.completion;
        this.success = this.result.success;

        this.response = this.result.response;

        this.prompt = this.object.definition.description["en-US"];

        this.activityId = this.object.id;

        let choices = this.object.definition.choices;
        this.answers = [];
        for (let key of Object.keys(choices))
            this.answers.push(choices[key].description["en-US"]);
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "answered");
    }

}

// -------------------------------

export class Quiz extends XApiStatement {

    readonly score: number;
    readonly min: number;
    readonly max: number;

    readonly activityId: string;

    readonly quizId: string;
    readonly quizName: string;

    readonly completion: boolean;
    readonly success: boolean;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.score = this.result.score.raw;
        this.min = this.result.score.min;
        this.max = this.result.score.max;

        this.completion = this.result.completion;
        this.success = this.result.success;

        this.quizId = this.object.definition.name["en-US"];

        this.quizName = this.object.definition.description["en-US"];

        this.activityId = this.object.id;
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "failed") || (verb == "passed");
    }

}

// -------------------------------

export class Session extends XApiStatement {

    readonly activityId: string;
    readonly activityName: string;
    readonly activityDescription: string;

    readonly type: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.activityId = this.object.id;
        this.activityName = this.object.name && this.object.name["en-US"];
        this.activityDescription = this.object.description && this.object.description["en-US"];

        this.type = this.verb.display["en-US"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "entered") || (verb == "exited") || (verb == "logged-in") ||
            (verb == "logged-out") || (verb == "terminated") || (verb == "initialized");
    }

}
