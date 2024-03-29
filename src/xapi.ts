const NAMESPACE_USER_MESSAGES = "user-";
const PREFIX_PEBL_THREAD = "peblThread://";
const PREFIX_PEBL = "pebl://";
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
    readonly browserName?: string;
    readonly browserVersion?: string;
    readonly osName?: string;
    readonly osVersion?: string;
    readonly contextOrigin?: string;
    readonly contextUrl?: string;
    readonly currentTeam?: string;
    readonly currentClass?: string;

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

        if (this["object"].definition) {
            let extensions = this["object"].definition.extensions;
            this.browserName = extensions[PREFIX_PEBL_EXTENSION + "browserName"];
            this.browserVersion = extensions[PREFIX_PEBL_EXTENSION + "browserVersion"];
            this.osName = extensions[PREFIX_PEBL_EXTENSION + "osName"];
            this.osVersion = extensions[PREFIX_PEBL_EXTENSION + "osVersion"];
            this.contextOrigin = extensions[PREFIX_PEBL_EXTENSION + "contextOrigin"];
            this.contextUrl = extensions[PREFIX_PEBL_EXTENSION + "contextUrl"];
            this.currentTeam = extensions[PREFIX_PEBL_EXTENSION + "currentTeam"];
            this.currentClass = extensions[PREFIX_PEBL_EXTENSION + "currentClass"];
        }
        
    }

    toXAPI(): XApiStatement {
        return new XApiStatement(this);
    }

    getActorId(): string {
        return this.actor.mbox || this.actor.openid ||
            (this.actor.account && this.actor.account.name);
    }

    static is(x: any): boolean {
        if (x.verb)
            return true;
        else
            return false;
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

        this.name = this.object.definition.name["en-US"];

        let extensions = this["object"].definition.extensions;

        this.book = extensions[PREFIX_PEBL_EXTENSION + "book"];
        this.docType = extensions[PREFIX_PEBL_EXTENSION + "docType"];
        this.location = extensions[PREFIX_PEBL_EXTENSION + "location"];
        this.card = extensions[PREFIX_PEBL_EXTENSION + "card"];
        this.url = extensions[PREFIX_PEBL_EXTENSION + "url"];
        this.target = extensions[PREFIX_PEBL_EXTENSION + "target"];
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
    readonly type: string;
    readonly cfi: string;
    readonly idRef: string;
    readonly title: string;
    readonly style: string;
    readonly text?: string;
    readonly owner: string;
    pinned?: boolean;
    pinMessage?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.title = this.object.definition.name && this.object.definition.name["en-US"];
        this.text = this.object.definition.description && this.object.definition.description["en-US"];

        this.book = this.object.id;
        if (this.book.indexOf(PREFIX_PEBL) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
        else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);

        this.owner = this.getActorId();

        let extensions = this.object.definition.extensions;

        this.type = extensions[PREFIX_PEBL_EXTENSION + "type"];
        this.cfi = extensions[PREFIX_PEBL_EXTENSION + "cfi"];
        this.idRef = extensions[PREFIX_PEBL_EXTENSION + "idRef"];
        this.style = extensions[PREFIX_PEBL_EXTENSION + "style"];
        
        if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
            this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];

        this.pinned = raw.pinned;
        this.pinMessage = raw.pinMessage;
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "commented") || (verb == "bookmarked") || (verb == "annotated");
    }
}

// -------------------------------

export class SharedAnnotation extends Annotation {
    groupId?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        let extensions = this.object.definition.extensions;
        if (extensions) {
            this.groupId = extensions[PREFIX_PEBL_EXTENSION + 'groupId']
        }
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "shared");
    }
}

// -------------------------------

export class Action extends XApiStatement {
    readonly activityId: string;
    readonly book: string;
    readonly target?: string;
    readonly idref?: string;
    readonly cfi?: string;
    readonly type?: string;
    readonly name?: string;
    readonly description?: string;
    readonly action: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.activityId = this.object.id;

        this.action = this.verb.display["en-US"];

        this.book = this.object.id;
        if (this.book.indexOf(PREFIX_PEBL) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
        else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);

        if (this.object.definition) {
            this.name = this.object.definition.name && this.object.definition.name["en-US"];
            this.description = this.object.definition.description && this.object.definition.description["en-US"];

            let extensions = this.object.definition.extensions;

            if (extensions) {
                this.target = extensions[PREFIX_PEBL_EXTENSION + "target"];
                this.type = extensions[PREFIX_PEBL_EXTENSION + "type"];
                this.idref = extensions[PREFIX_PEBL_EXTENSION + "idref"];
                this.cfi = extensions[PREFIX_PEBL_EXTENSION + "cfi"];
                if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
                    this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];
            }
        }
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "preferred") || (verb == "morphed") || (verb == "interacted") || (verb == "experienced") || (verb == "disliked") ||
            (verb == "liked") || (verb == "accessed") || (verb == "hid") || (verb == "showed") || (verb == "displayed") || (verb == "undisplayed") ||
            (verb == "searched") || (verb == "selected") || (verb == "unbookmarked") || (verb == "discarded") || (verb == "unshared") || (verb == "unannotated") ||
            (verb == "submitted");
    }
}

// -------------------------------

export class Navigation extends XApiStatement {
    readonly activityId: string;
    readonly book: string;
    readonly firstCfi?: string;
    readonly lastCfi?: string;

    readonly type: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.type = this.verb.display["en-US"];
        this.activityId = this.object.id;

        this.book = this.object.id;
        if (this.book.indexOf(PREFIX_PEBL) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
        else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);

        let extensions = this.object.definition.extensions;

        if (extensions) {
            this.firstCfi = extensions[PREFIX_PEBL_EXTENSION + "firstCfi"];
            this.lastCfi = extensions[PREFIX_PEBL_EXTENSION + "lastCfi"];
            if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
                this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];
        }
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "paged-next") || (verb == "paged-prev") || (verb == "paged-jump") || (verb == "interacted") ||
            (verb == "completed");
    }
}

// -------------------------------

export class Message extends XApiStatement {
    thread: string;
    readonly text: string;
    readonly prompt: string;
    readonly name: string;
    readonly direct: boolean;
    readonly book?: string;
    groupId?: string;
    isPrivate?: boolean;
    readonly access?: "private" | "team" | "class" | "all";
    readonly type?: "written" | "table" | "checkboxes" | "radioboxes" | "buttons";
    readonly replyThread?: string;
    readonly cfi?: string;
    readonly idRef?: string;
    readonly peblAction?: string;
    pinned?: boolean;
    pinMessage?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.thread = this.object.id;
        if (this.thread.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.thread = this.thread.substring(PREFIX_PEBL_THREAD.length);

        this.prompt = this.object.definition.name["en-US"];
        this.name = this.actor.name;
        this.direct = this.thread == (NAMESPACE_USER_MESSAGES + this.getActorId());
        this.text = this.result ? this.result.response : this.object.definition.description['en-US'];

        let extensions = this.object.definition.extensions;
        if (extensions) {
            this.access = extensions[PREFIX_PEBL_EXTENSION + "access"];
            this.type = extensions[PREFIX_PEBL_EXTENSION + "type"];
            this.replyThread = extensions[PREFIX_PEBL_EXTENSION + "replyThread"];
            this.groupId = extensions[PREFIX_PEBL_EXTENSION + "groupId"];
            this.isPrivate = extensions[PREFIX_PEBL_EXTENSION + "isPrivate"];
            this.book = extensions[PREFIX_PEBL_EXTENSION + "book"];
            this.cfi = extensions[PREFIX_PEBL_EXTENSION + "cfi"];
            this.idRef = extensions[PREFIX_PEBL_EXTENSION + "idRef"];
            this.peblAction = extensions[PREFIX_PEBL_EXTENSION + "peblAction"];
            
            
            if (extensions[PREFIX_PEBL_EXTENSION + "thread"])
                this.thread = extensions[PREFIX_PEBL_EXTENSION + "thread"];
        }

        this.pinned = raw.pinned;
        this.pinMessage = raw.pinMessage;
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "responded") || (verb == "noted");
    }
}

// -------------------------------

export class Voided extends XApiStatement {
    readonly thread: string;
    readonly target: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.thread = (this.context && this.context.contextActivities && this.context.contextActivities.parent) ? this.context.contextActivities.parent[0].id : "";
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

    readonly book: string;

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

        this.book = this.object.id;
        if (this.book.indexOf(PREFIX_PEBL) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
        else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);

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

        let extensions = this.object.definition.extensions;
        if (extensions) {
            if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
                this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];
        }
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "attempted");
    }

}

// -------------------------------

export class Quiz extends XApiStatement {

    readonly book: string;

    readonly score: number;
    readonly min: number;
    readonly max: number;

    readonly activityId: string;

    readonly completion: boolean;
    readonly success: boolean;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.book = this.object.id;
        if (this.book.indexOf(PREFIX_PEBL) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
        else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);

        this.score = this.result.score.raw;
        this.min = this.result.score.min;
        this.max = this.result.score.max;

        this.completion = this.result.completion;
        this.success = this.result.success;

        this.activityId = this.object.id;

        let extensions = this.object.definition.extensions;
        if (extensions) {
            if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
                this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];
        }
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "failed") || (verb == "passed");
    }

}

// -------------------------------

export class Session extends XApiStatement {

    readonly activityId: string;
    readonly book: string;
    readonly activityName?: string;
    readonly activityDescription?: string;

    readonly type: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.activityId = this.object.id;
        if (this.object.definition) {
            this.activityName = this.object.definition.name && this.object.definition.name["en-US"];
            this.activityDescription = this.object.definition.description && this.object.definition.description["en-US"];
        }

        this.book = this.object.id;
        if (this.book.indexOf(PREFIX_PEBL) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL) + PREFIX_PEBL.length);
        else if (this.book.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.book = this.book.substring(this.book.indexOf(PREFIX_PEBL_THREAD) + PREFIX_PEBL_THREAD.length);

        this.type = this.verb.display["en-US"];

        let extensions = this.object.definition.extensions;
        if (extensions) {
            if (extensions[PREFIX_PEBL_EXTENSION + "bookId"])
                this.book = extensions[PREFIX_PEBL_EXTENSION + "bookId"];
        }
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "entered") || (verb == "exited") || (verb == "logged-in") ||
            (verb == "logged-out") || (verb == "terminated") || (verb == "initialized") || (verb == "launched");
    }
}

// -------------------------------

export class Membership extends XApiStatement {

    readonly thread: string;
    readonly membershipId: string;
    readonly activityType: string;
    readonly description?: string;
    readonly role: string;
    readonly organization?: string;
    readonly organizationName?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.thread = this.object.id;
        if (this.thread.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.thread = this.thread.substring(PREFIX_PEBL_THREAD.length);

        this.membershipId = this.object.definition.name["en-US"];
        this.description = this.object.definition.description && this.object.definition.description["en-US"];

        let extensions = this.object.definition.extensions;

        this.role = extensions[PREFIX_PEBL_EXTENSION + "role"];
        this.activityType = extensions[PREFIX_PEBL_EXTENSION + "activityType"];
        this.organization = extensions[PREFIX_PEBL_EXTENSION + "organization"];
        this.organizationName = extensions[PREFIX_PEBL_EXTENSION + "organizationName"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "joined");
    }
}

// -------------------------------

export class Artifact extends XApiStatement {

    readonly thread: string;
    readonly artifactId: string;
    readonly artifactDescription?: string;
    readonly body: any;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.thread = this.object.id;
        if (this.thread.indexOf(PREFIX_PEBL_THREAD) != -1)
            this.thread = this.thread.substring(PREFIX_PEBL_THREAD.length);

        this.artifactId = this.object.definition.name["en-US"];
        this.artifactDescription = this.object.definition.description && this.object.definition.description["en-US"];

        let extensions = this.object.definition.extensions;

        this.body = extensions[PREFIX_PEBL_EXTENSION + "body"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "artifactCreated");
    }
}

// -------------------------------

export class Invitation extends XApiStatement {
    readonly token: string;
    readonly programId: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.token = this.object.definition.name["en-US"];
        this.programId = extensions[PREFIX_PEBL_EXTENSION + "programId"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "invited");
    }
}

// -------------------------------

export class ProgramAction extends XApiStatement {
    readonly thread: string;
    readonly programId: string;
    readonly action: string;
    readonly previousValue?: any;
    readonly newValue?: any;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.thread = this.object.id;

        let extensions = this.object.definition.extensions;

        this.programId = this.object.definition.name["en-US"];
        this.previousValue = extensions[PREFIX_PEBL_EXTENSION + "previousValue"];
        this.newValue = extensions[PREFIX_PEBL_EXTENSION + "newValue"];
        this.action = extensions[PREFIX_PEBL_EXTENSION + "action"];

    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "programLevelUp") || (verb == "programLevelDown") || (verb == "programInvited") || (verb == "programUninvited")
            || (verb == "programExpelled") || (verb == "programJoined") || (verb == "programActivityLaunched")
            || (verb == "programActivityCompleted") || (verb == "programActivityTeamCompleted") || (verb == "programModified")
            || (verb == "programDeleted") || (verb == "programCompleted") || (verb == "programCopied") || (verb == "programDiscussed")
    }
}

// -------------------------------

export class CompatibilityTest extends XApiStatement {
    readonly readerName: string;
    readonly osName: string;
    readonly osVersion: string;
    readonly browserName: string;
    readonly browserVersion: string;
    readonly userAgent: string;
    readonly appVersion: string;
    readonly platform: string;
    readonly vendor: string;
    readonly testResults: { [key: string]: string };

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.readerName = extensions[PREFIX_PEBL_EXTENSION + "readerName"];
        this.osName = extensions[PREFIX_PEBL_EXTENSION + "osName"];
        this.osVersion = extensions[PREFIX_PEBL_EXTENSION + "osVersion"];
        this.browserName = extensions[PREFIX_PEBL_EXTENSION + "browserName"];
        this.browserVersion = extensions[PREFIX_PEBL_EXTENSION + "browserVersion"];
        this.userAgent = extensions[PREFIX_PEBL_EXTENSION + "userAgent"];
        this.appVersion = extensions[PREFIX_PEBL_EXTENSION + "appVersion"];
        this.platform = extensions[PREFIX_PEBL_EXTENSION + "platform"];
        this.vendor = extensions[PREFIX_PEBL_EXTENSION + "vendor"];
        this.testResults = JSON.parse(extensions[PREFIX_PEBL_EXTENSION + "testResults"]);
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "compatibilityTested")
    }
}

// -------------------------------

export class ModuleEvent extends XApiStatement {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }
}

export class ModuleRating extends ModuleEvent {
    readonly rating: string;
    readonly idref: string;
    readonly programId?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.rating = this.object.definition.name["en-US"];

        this.idref = extensions[PREFIX_PEBL_EXTENSION + "idref"];
        this.programId = extensions[PREFIX_PEBL_EXTENSION + "programId"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "moduleRating")
    }
}

export class ModuleFeedback extends ModuleEvent {
    readonly feedback: string;
    readonly willingToDiscuss: string;
    readonly idref: string;
    readonly programId?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.feedback = this.object.definition.name["en-US"];

        this.willingToDiscuss = extensions[PREFIX_PEBL_EXTENSION + "willingToDiscuss"];
        this.idref = extensions[PREFIX_PEBL_EXTENSION + "idref"];
        this.programId = extensions[PREFIX_PEBL_EXTENSION + "programId"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "moduleFeedback")
    }
}

export class ModuleExample extends ModuleEvent {
    readonly example: string;
    readonly description: string;
    readonly idref: string;
    readonly youtubeUrl?: string;
    readonly imageUrl?: string;
    readonly websiteUrl?: string;
    readonly quotedPerson?: string;
    readonly quotedTeam?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.example = this.object.definition.name["en-US"];

        this.description = this.object.definition.description["en-US"];

        this.idref = extensions[PREFIX_PEBL_EXTENSION + "idref"];
        this.youtubeUrl = extensions[PREFIX_PEBL_EXTENSION + "youtubeUrl"];
        this.imageUrl = extensions[PREFIX_PEBL_EXTENSION + "imageUrl"];
        this.websiteUrl = extensions[PREFIX_PEBL_EXTENSION + "websiteUrl"];
        this.quotedPerson = extensions[PREFIX_PEBL_EXTENSION + "quotedPerson"];
        this.quotedTeam = extensions[PREFIX_PEBL_EXTENSION + "quotedTeam"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "moduleExample");
    }
}

export class ModuleExampleRating extends ModuleEvent {
    readonly rating: string;
    readonly idref: string;
    readonly programId?: string;
    readonly exampleId?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.rating = this.object.definition.name["en-US"];

        this.idref = extensions[PREFIX_PEBL_EXTENSION + "idref"];
        this.programId = extensions[PREFIX_PEBL_EXTENSION + "programId"];
        this.exampleId = extensions[PREFIX_PEBL_EXTENSION + "exampleId"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "moduleExampleRating")
    }
}

export class ModuleExampleFeedback extends ModuleEvent {
    readonly feedback: string;
    readonly willingToDiscuss: string;
    readonly idref: string;
    readonly programId?: string;
    readonly exampleId?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.feedback = this.object.definition.name["en-US"];

        this.willingToDiscuss = extensions[PREFIX_PEBL_EXTENSION + "willingToDiscuss"];
        this.idref = extensions[PREFIX_PEBL_EXTENSION + "idref"];
        this.programId = extensions[PREFIX_PEBL_EXTENSION + "programId"];
        this.exampleId = extensions[PREFIX_PEBL_EXTENSION + "exampleId"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "moduleExampleFeedback");
    }
}

export class ModuleRemovedEvent extends ModuleEvent {
    readonly idref: string;
    readonly eventId: string;
    readonly type?: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        let extensions = this.object.definition.extensions;

        this.idref = this.object.definition.name["en-US"];

        this.eventId = this.object.definition.description["en-US"];

        this.type = extensions[PREFIX_PEBL_EXTENSION + "type"];
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "moduleRemovedEvent");
    }
}

export class Notification extends XApiStatement {
    //TODO
}
