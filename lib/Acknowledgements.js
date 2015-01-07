var Rx = require('rx'),
    slice = Array.prototype.slice;
function Acknowledgements(Hub) {
    return Hub.letBind(function(Hub) {
        var command = "command", acknowledgement = "acknowledgement";
        return Rx.Observable.create(function(observer) {
            return Hub.subscribe(
                function onNext     (xs) { (
                    xs[0] === command) && (
                    xs[1].type === acknowledgement) && (
                    observer.onNext(xs[1])); },
                function onError    (er) { observer.onError(er); },
                function onCompleted(  ) { observer.onCompleted(); }
            );
        });
    });
}

module.exports = Acknowledgements;