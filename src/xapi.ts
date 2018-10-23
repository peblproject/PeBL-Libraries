abstract class XApiStatement {
    readonly id: string;

    constructor(raw: { [key: string]: any }) {
        this.id = raw.id;
    }

    abstract toObject(): { [key: string]: any };
}

// -------------------------------

class Reference extends XApiStatement {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    toObject(): { [key: string]: any; } {
        throw new Error("Method not implemented.");
    }

}

// -------------------------------

class Annotation extends XApiStatement {
    readonly book: string;

    constructor(raw: { [key: string]: any }) {
        super(raw);
        this.book = raw.book;
    }

    toObject(): { [key: string]: any; } {
        throw new Error("Method not implemented.");
    }
}

// -------------------------------

class GeneralAnnotation extends Annotation {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    toObject(): { [key: string]: any; } {
        throw new Error("Method not implemented.");
    }
}

// -------------------------------

class xEvent extends XApiStatement {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    toObject(): { [key: string]: any; } {
        throw new Error("Method not implemented.");
    }

}

// -------------------------------

class Message extends XApiStatement {
    constructor(raw: { [key: string]: any }) {
        super(raw);
    }

    toObject(): { [key: string]: any; } {
        throw new Error("Method not implemented.");
    }

}
