// import { PEBL } from "./pebl";
import { Membership } from "./xapi";

export class Activity {

    readonly id: string;
    readonly type: string;
    etag?: string;
    identity?: string;

    constructor(raw: { [key: string]: any }) {
        if (!raw.id) {
            /*!
              Excerpt from: Math.uuid.js (v1.4)
              http://www.broofa.com
              mailto:robert@broofa.com
              Copyright (c) 2010 Robert Kieffer
              Dual licensed under the MIT and GPL licenses.
            */
            this.id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        } else
            this.id = raw.id;
        this.etag = raw.etag;
        this.type = raw.type;
    }
}

export class Learnlet extends Activity {
    readonly name: string;
    readonly description: string;
    readonly level: number;
    readonly cfi: string;

    constructor(raw: { [key: string]: any }) {
        raw.type = "learnlet";
        super(raw);

        this.cfi = raw.cfi;
        this.level = raw.level;
        this.name = raw.name;
        this.description = raw.description;
    }
}

// -------------------------------

export class Program extends Activity {
    readonly name: string;
    readonly description: string;
    readonly members: Membership[];

    constructor(raw: { [key: string]: any }) {
        raw.type = "program";
        super(raw);

        this.name = raw.name;
        this.description = raw.description;
        this.members = raw.members;
    }
}

// -------------------------------

