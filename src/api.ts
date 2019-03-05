import { PEBL } from "./pebl";

declare let window: any;

let core: PEBL = new PEBL(window.PeBLConfig, window.PeBLLoaded);

export const install = function(vue: any, options: { [key: string]: any }) {
    vue.prototype.$PeBL = core;
    vue.prototype.$PeBLEvents = core.events;
    vue.prototype.$PeBLUtils = core.utils;
    vue.prototype.$PeBLUser = core.user;
}

if (typeof window !== 'undefined') {
    window.PeBL = core;

    if (window.Vue) {
        window.Vue.use({ install: install });
    }
}


