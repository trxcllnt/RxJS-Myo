var Rx = require("rx"),
    getEventPredicate = require("./getEventPredicate"),
    getCommandPredicate = require("./getCommandPredicate"),
    parse = JSON.parse.bind(JSON),
    stringify = JSON.stringify.bind(JSON),
    isArray = Array.isArray;

/**
 * Constructor for the Myo devices Hub, an Rx.Subject wrapper around the underlying WebSocket.
 * If the constructor is invoked without the new keyword, the call is rerouted to Hub.initialize();
 */
function Hub(observer, observable) {
    
    if(!(this instanceof Hub)) { return Hub.initialize.apply(null, arguments); }
    
    this.constructor = Hub;
    this.observer = observer;
    this.observable = observable;
    
    Rx.Subject.call(this);
}

Hub.create = function(observer, observable) {
    return new Hub(observer, observable);
};

Hub.prototype = Object.create(Rx.Observable.create(function(){}), {
    subscribe:   { value: function(x,y,z) { return this.observable.subscribe(x,y,z); }},
    forEach:     { value: function(x,y,z) { return this.observable.forEach(x,y,z);   }},
    onNext:      { value: function(x)     { return this.observer.onNext(x);          }},
    onError:     { value: function(e)     { return this.observer.onError(e);         }},
    onCompleted: { value: function( )     { return this.observer.onCompleted();      }}
});

/**
 * Create and initialize a Hub with the given WebSocket constructor, open handler, url, and API version.
 */
Hub.initialize = function(WebSocket, openObserver, url, version) {
    
    if(typeof WebSocket !== "function") {
        throw new Error("rx-myo-node: WebSocket must be a constructor function.");
    }
    
    if(typeof openObserver === "undefined") { (version = url) && (url = openObserver); } else
    if(typeof openObserver === "object") { openObserver = function(x) { this.onNext(x); }.bind(openObserver); }
    if(typeof url === "undefined") { url = "ws://127.0.0.1:10138/myo/"; }
    if(typeof version === "undefined") { version = 3; }
    
    var socketSubject = Rx.Subject.create(new Rx.ReplaySubject(), Rx.Observable.create(function(observer) {
        if(typeof socketSubject.socket === "undefined") {
            socketSubject.observable = Rx.Observable.create(function(observer) {
                
                socketSubject.socket = WebSocket(url + version);
                socketSubject.socket.onopen = function(openMessage) {
                    
                    var queue = socketSubject.observer;
                    
                    if(!!queue.subscribe) {
                        queue.subscribe(socketSubject.observer = Rx.Observer.create(
                            function onNext     (x) { (
                                socketSubject.socket.readyState === 1) && (
                                socketSubject.socket.send(stringify(x))); },
                            function onError    (e) { socketSubject.socket.close(e); },
                            function onCompleted( ) { socketSubject.socket.close();  }
                        )).dispose();
                    }
                    
                    !!openObserver && openObserver.bind(null, socketSubject);
                }
                socketSubject.socket.onmessage = function(x) { observer.onNext(parse(x.data)); };
                socketSubject.socket.onerror = function(e) { observer.onError(e); };
                socketSubject.socket.onCompleted = function() { observer.onCompleted(); };
                
                return function() {
                    socketSubject.socket.close();
                    socketSubject.socket = undefined;
                    socketSubject.observer = new Rx.ReplaySubject();
                    socketSubject.observable = Rx.Observable.empty();
                };
            }).share();
        }
        return socketSubject.observable.subscribe(observer);
    }));
    
    return Hub.create(socketSubject, socketSubject);
};

Hub.prototype.create = function(observer, observable) {
    return this.constructor.create(observer, observable);
};

var onNext = Hub.prototype.onNext;

/**
 * Override Hub's onNext method to automatically convert commands to Myo's JSON protocol.
 */
Hub.prototype.onNext = function(value) {
    return onNext.call(this, !isArray(value) && ["command", value] || value);
}

/**
 * Override Rx.Observable.let and Rx.Observable.letBind to return Hub instances.
 */
Hub.prototype.let = Hub.prototype.letBind = function(func) {
    return this.create(this, func(this));
}

/**
 * Expose a simple method for sending a command to the WebSocket.
 * @returns The Hub instance the command was sent from.
 */
Hub.prototype.command = function(command, data) {
    data || (data = {});
    data.command || (data.command = command);
    onNext.call(this, ["command", data]);
    return this;
}

// Add each Myo Event to the Hub prototype.
Hub.prototype = ([
        // Events
        ["isPaired", "paired"],
        ["isConnected", "connected"],
        ["isDisconnected", "disconnected"],
        ["isArmSynced", "arm_synced"],
        ["isArmUnsynced", "arm_unsynced"],
        ["isOrientation", "orientation"],
        ["isPose", "pose"],
        ["isEMG", "emg"],
        ["isRSSI", "rssi"]
    ]).reduce(function(proto, names) {
        var predicate = getEventPredicate(names[1]);
        proto[names[0]] = function() {
            return this.filter(predicate);
        };
        return proto;
    }, Hub.prototype);

// Add each Myo Command and Acknowledgement to the Hub prototype.
Hub.prototype = ([
        ["vibrate", "vibrateAcknowledged", "vibrate"],
        ["requestRSSI", "requestRSSIAcknowledged", "request_rssi"],
        ["setStreamEMG", "setStreamEMGAcknowledged", "set_stream_emg"],
        ["setLockingPolicy", "setLockingPolicyAcknowledged", "set_locking_policy"],
        ["lock", "lockAcknowledged", "lock"],
        ["unlock", "unlockAcknowledged", "unlock"],
        ["notifyUserAction", "notifyUserActionAcknowledged", "notify_user_action"]
    ]).reduce(function(proto, names) {
        var predicate = getCommandPredicate(names[2]);
        proto[names[0]] = function(x) {
            return this.command.call(this, names[2], x);
        };
        proto[names[1]] = function( ) {
            return this.filter(predicate);
        };
        return proto;
    }, Hub.prototype);

module.exports = Hub;