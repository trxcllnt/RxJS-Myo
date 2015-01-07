var Rx = require("rx"),
    slice = Array.prototype.slice;
function Commands(Hub) {
    return Hub.letBind(function(Hub) {
        var command = "command";
        return Rx.Observable.create(function(observer) {
            return Hub.subscribe(
                function onNext     (xs) {
                    xs[0] === command && observer.onNext(xs[1]);
                },
                function onError    (er) { observer.onError(er); },
                function onCompleted(  ) { observer.onCompleted(); }
            );
        });
    });
}

module.exports = Commands;