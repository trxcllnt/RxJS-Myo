var Rx = require('rx'),
    slice = Array.prototype.slice;
function Events(Hub) {
    return Hub.letBind(function(Hub) {
        var event = "event";
        return Rx.Observable.create(function(observer) {
            return Hub.subscribe(
                function onNext     (xs) { xs[0] === event && observer.onNext(xs[1]); },
                function onError    (er) { observer.onError(er); },
                function onCompleted(  ) { observer.onCompleted(); }
            );
        });
    });
}

module.exports = Events;