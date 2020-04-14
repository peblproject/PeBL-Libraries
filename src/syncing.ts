// const USER_PREFIX = "user-";
// const GROUP_PREFIX = "group-";
// const PEBL_THREAD_PREFIX = "peblThread://";
// const PEBL_THREAD_REGISTRY = "peblThread://registry";
// const PEBL_THREAD_USER_PREFIX = "peblThread://" + USER_PREFIX;
// const PEBL_THREAD_GROUP_PREFIX = "peblThread://" + GROUP_PREFIX;
// const THREAD_POLL_INTERVAL = 4000;
// const BOOK_POLL_INTERVAL = 6000;
// const MODULE_POLL_INTERVAL = 6000;
// const PRESENCE_POLL_INTERVAL = 120000;
// const LEARNLET_POLL_INTERVAL = 60000;
// const PROGRAM_POLL_INTERVAL = 60000;
// const INSTITUTION_POLL_INTERVAL = 60000;
// const SYSTEM_POLL_INTERVAL = 60000;

import { SyncProcess } from "./adapters";
import { Endpoint } from "./models";
import { PEBL } from "./pebl";
import { UserProfile } from "./models";

export class LLSyncAction implements SyncProcess {

    private endpoint: Endpoint;
    private websocket: any;

    private pebl: PEBL;

    private messageHandlers: { [key: string]: ((userProfile: UserProfile, payload: { [key: string]: any }) => void) }

    constructor(pebl: PEBL, endpoint: Endpoint) {
        var self = this;

        this.pebl = pebl;
        this.endpoint = endpoint;

        console.log(this.endpoint);
        this.messageHandlers = {};
        this.messageHandlers.getNotifications = function(userProfile, payload) {
            for (var notification of payload.data) {
                self.pebl.storage.saveNotification(userProfile, notification);
                self.pebl.emitEvent(self.pebl.events.incomingNotifications, [notification]);
            }
        }

        this.messageHandlers.newNotification = function(userProfile, payload) {
            self.pebl.storage.saveNotification(userProfile, payload.data);
            self.pebl.emitEvent(self.pebl.events.incomingNotifications, [payload.data]);
        }

        this.messageHandlers.getSessions = function(userProfile, payload) {
            console.log('getSessions', payload);
            self.pebl.storage.saveEvent(userProfile, payload.data);
        }

        this.messageHandlers.getThreadedMessages = function(userProfile, payload) {
            self.pebl.storage.saveMessages(userProfile, payload.data);
            if (payload.data.length > 0)
                self.pebl.emitEvent(payload.data[0].thread, payload.data);
        }

        this.messageHandlers.newThreadedMessage = function(userProfile, payload) {
            self.pebl.storage.saveMessages(userProfile, [payload.data]);
            self.pebl.emitEvent(payload.data.thread, [payload.data]);
        }

        this.messageHandlers.getAnnotations = function(userProfile, payload) {
            self.pebl.storage.saveAnnotations(userProfile, payload.data);
            self.pebl.emitEvent(self.pebl.events.incomingAnnotations, payload.data);
        }

        this.messageHandlers.getSharedAnnotations = function(userProfile, payload) {
            self.pebl.storage.saveSharedAnnotations(userProfile, payload.data);
            self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, payload.data);
        }

        this.messageHandlers.newAnnotation = function(userProfile, payload) {
            self.pebl.storage.saveAnnotations(userProfile, [payload.data]);
            self.pebl.emitEvent(self.pebl.events.incomingAnnotations, [payload.data]);
        }

        this.messageHandlers.newSharedAnnotation = function(userProfile, payload) {
            self.pebl.storage.saveSharedAnnotations(userProfile, [payload.data]);
            self.pebl.emitEvent(self.pebl.events.incomingSharedAnnotations, [payload.data]);
        }

        this.websocket = new WebSocket("ws://localhost:8081/message");
        this.websocket.onopen = function() {
            console.log('websocket opened');
        }

        this.websocket.onmessage = function(message: any) {
            self.pebl.user.getUser(function(userProfile) {
                if (userProfile) {
                    console.log('message recieved');
                    var parsedMessage = JSON.parse(message.data);

                    if (self.messageHandlers[parsedMessage.payload.requestType])
                        self.messageHandlers[parsedMessage.payload.requestType](userProfile, parsedMessage.payload);
                }
            });
        }
    }

    push(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        let self = this;
        this.pebl.user.getUser(function(userProfile) {
            if (userProfile && self.websocket.readyState === 1) {
                for (let message of outgoing) {
                    console.log(message);
                    self.websocket.send(JSON.stringify(message));
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    pushActivity(outgoing: { [key: string]: any }[], callback: (result: boolean) => void): void {
        let self = this;

        this.pebl.user.getUser(function(userProfile) {
            if (userProfile && self.websocket.readyState === 1) {
                for (let message of outgoing) {
                    console.log(message);
                    self.websocket.send(JSON.stringify(message));
                }
                callback(true);
            } else {
                callback(false);
            }
        });
    }
}
