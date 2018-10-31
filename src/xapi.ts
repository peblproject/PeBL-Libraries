const PREFIX_PEBL_THREAD = "peblThread://";
const PREFIX_PEBL_EXTENSION = "https://peblproject.org/extension/";

// -------------------------------

abstract class XApiStatement {

    readonly id: string;
    readonly "object": { [key: string]: any };
    readonly actor: { [key: string]: any };
    readonly verb: { [key: string]: any };
    readonly context: { [key: string]: any };
    readonly stored: string;
    readonly timestamp: string;

    constructor(raw: { [key: string]: any }) {
        this.id = raw.id;
        this.actor = raw.actor;
        this.verb = raw.verb;
        this.context = raw.context;
        this.stored = raw.stored;
        this.timestamp = raw.timestamp;
        this["object"] = raw.object;
    }

    abstract toObject(): { [key: string]: any };
}

// -------------------------------

class Reference extends XApiStatement {
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
        if (this.thread.substr(0, PREFIX_PEBL_THREAD.length) == PREFIX_PEBL_THREAD)
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

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "pushed") || (verb == "pulled");
    }
}

// -------------------------------

class Annotation extends XApiStatement {
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

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "commented");
    }
}

// -------------------------------

class GeneralAnnotation extends Annotation {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "shared");
    }
}

// -------------------------------

class Action extends XApiStatement {
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

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "preferred") || (verb == "morphed") || (verb == "interacted");
    }
}

// -------------------------------

class Navigation extends XApiStatement {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

}

// -------------------------------

class Message extends XApiStatement {
    readonly thread: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);

        this.thread = this.object.id;
    }

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "responded");
    }
}

class Voided extends XApiStatement {
    readonly thread: string;
    readonly target: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.thread = this.context.contextActivities.parent[0].id;
        this.target = this.object.id;
    }

    toObject(): { [key: string]: any } {
        throw new Error("Method not implemented.");
    }

    static is(x: XApiStatement): boolean {
        let verb = x.verb.display["en-US"];
        return (verb == "voided");
    }
}
