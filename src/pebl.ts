class PEBL {

    private subscribedEventHandlers: { [eventName: string]: PeblHandler };

    constructor() {
        this.subscribedEventHandlers = {};
    }

    eventListener(event: { [key: string]: any }): void {
        if (this.subscribedEventHandlers[event["name"]]) {
            console.log(this.subscribedEventHandlers[event["name"]]);
        }
    }

    subscribeEvent(eventName: string, callback: (stmts: XApiStatement) => void): void {

    }

    emitEvent(): void {

    }
}

