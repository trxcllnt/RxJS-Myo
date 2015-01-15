var Rx = require("rx"),
    Fn = require("./Fn"),
    parse = JSON.parse.bind(JSON),
    stringify = JSON.stringify.bind(JSON),
    isArray = Array.isArray;

/**
 * Constructor for the Myo devices Hub, an Rx.Subject wrapper around the underlying WebSocket.
 * If the constructor is invoked without the new keyword, the call is rerouted to Hub.initialize();
 */
function Hub(observer, observable) {
    
    if(!(this instanceof Hub)) { return Hub.initialize.apply(null, arguments); }
    
    this.observer = observer;
    this.observable = observable;
    this.source = observer.source || this;
    
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
    onCompleted: { value: function( )     { return this.observer.onCompleted();      }},
    constructor: { value: Hub }
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

Hub.prototype.Events = function() {
    return this.letBind(function(Hub) {
        var event = "event";
        return Rx.Observable.create(function(observer) {
            return Hub.source.subscribe(
                function onNext     (xs) {
                    xs[0] === event && observer.onNext(xs[1]);
                },
                function onError    (er) { observer.onError(er); },
                function onCompleted(  ) { observer.onCompleted(); }
            );
        });
    });
};

Hub.prototype.Commands = function() {
    return this.letBind(function(Hub) {
        var command = "command";
        return Rx.Observable.create(function(observer) {
            return Hub.source.subscribe(
                function onNext     (xs) {
                    xs[0] === command && observer.onNext(xs[1]);
                },
                function onError    (er) { observer.onError(er); },
                function onCompleted(  ) { observer.onCompleted(); }
            );
        });
    });
};

Hub.prototype.Acknowledgements = function() {
    return this.letBind(function(Hub) {
        var acknowledgement = "acknowledgement";
        return Rx.Observable.create(function(observer) {
            return Hub.source.subscribe(
                function onNext     (xs) {
                    xs[0] === acknowledgement && observer.onNext(xs[1]);
                },
                function onError    (er) { observer.onError(er); },
                function onCompleted(  ) { observer.onCompleted(); }
            );
        });
    });
};

var onNext = Hub.prototype.onNext;

/**
 * Override Hub's onNext method to automatically convert commands to Myo's JSON protocol.
 */
Hub.prototype.onNext = function(value) {
    return onNext.call(this, !isArray(value) && ["command", value] || value);
};

/**
 * Override Rx.Observable.let and Rx.Observable.letBind to return Hub instances.
 */
Hub.prototype.let = Hub.prototype.letBind = function(func) {
    return this.create(this, func(this));
};

/**
 * Expose a simple method for sending a command to the WebSocket.
 * @returns The Hub instance the command was sent from.
 */
Hub.prototype.command = function(command, data) {
    data || (data = {});
    data.command || (data.command = command);
    onNext.call(this, ["command", data]);
    return this;
};

// Add each Myo Event to the Hub prototype.
Hub.prototype = ([
        // Events
        [      "isPaired" , "paired"      ],
        [   "isConnected" , "connected"   ],
        ["isDisconnected" , "disconnected"],
        [   "isArmSynced" , "arm_synced"  ],
        [ "isArmUnsynced" , "arm_unsynced"],
        [ "isOrientation" , "orientation" ],
        [        "isPose" , "pose"        ],
        [         "isEMG" , "emg"         ],
        [        "isRSSI" , "rssi"        ]
    ]).reduce(function(proto, names, obsName, evtName, predicate) {
        obsName = names[0];
        evtName = names[1];
        predicate = Fn.compareField("type", evtName);
        proto[obsName] = function() {
            return this.letBind(function(Hub) {
                return Hub.filter(predicate);
            });
        };
        return proto;
    }, Hub.prototype);

// Add each Myo Command and Acknowledgement to the Hub prototype.
Hub.prototype = ([
        [         "vibrate" ,              ""                , "vibrate"           ],
        [     "requestRSSI" ,              ""                , "request_rssi"      ],
        [          "setEMG" ,   "setStreamEMGAcknowledged"   , "set_stream_emg"    ],
        ["setLockingPolicy" , "setLockingPolicyAcknowledged" , "set_locking_policy"],
        [            "lock" ,              ""                , "lock"              ],
        [          "unlock" ,              ""                , "unlock"            ],
        ["notifyUserAction" ,              ""                , "notify_user_action"]
    ]).reduce(function(proto, names, cmdName, ackName, evtName, predicate) {
        cmdName = names[0];
        ackName = names[1];
        evtName = names[2];
        predicate = Fn.compareField("command", evtName);
        proto[cmdName] = function(cmd) {
            return this.letBind(function(Hub) {
                return Rx.Observable.create(function(observer) {
                    
                    var disposable = (!ackName ?
                        Hub :
                        Hub[ackName]().take(1).flatMap(Hub)
                    ).subscribe(observer);
                    
                    Hub.command(evtName, cmd);
                    
                    return disposable;
                });
            });
        };
        if(ackName) {
            proto[ackName] = function( ) {
                return this.letBind(function(Hub) {
                    return Hub.Acknowledgements().filter(predicate);
                });
            };
        }
        return proto;
    }, Hub.prototype);

module.exports = Hub;