import * as React from "react";
import * as ReactDOM from "react-dom";


interface ComponentState {
    progress: string;
}

// Note that this component does not do localization; we expect the progress messages
// to already be localized when they are sent over the websocket.
export default class ProgressBox extends React.Component<{}, ComponentState> {
    constructor(props) {
        super(props);
        let self = this;
        this.state = { progress: "" };
        //get progress messages from c#
        this.getWebSocket().addEventListener("message", event => {
            var e = JSON.parse(event.data);
            if (e.id === "progress") {
                self.setState({ progress: self.state.progress + "<br/>" + e.payload });
                // Scroll the window to the bottom. Must be done AFTER painting once, so we
                // get a real current scroll height.
                window.requestAnimationFrame(() => {
                    let progressDiv = document.getElementById("progress");
                    progressDiv.scrollTop = progressDiv.scrollHeight;
                });
            }
        });
    }

    //TODO: make box messages scroll to bottom whenever a new message arrives
    // (or alternatively, when a new message arrives and the scroll was previously at the bottom).
    render() {
        return (
            <div id="progress" dangerouslySetInnerHTML={{ __html: this.state.progress }} />
        );
    }

    // Enhance: We want to extract this higher up. See http://issues.bloomlibrary.org/youtrack/issue/BL-4804
    private getWebSocket(): WebSocket {
        let kSocketName = "webSocket";
        if (typeof window.top[kSocketName] === "undefined") {
            // Enhance: ask the server for the socket so that we aren't assuming that it is the current port + 1
            let websocketPort = parseInt(window.location.port, 10) + 1;
            window.top[kSocketName] = new WebSocket("ws://127.0.0.1:" + websocketPort.toString());
        }
        return window.top[kSocketName];
    }
}