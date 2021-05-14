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


