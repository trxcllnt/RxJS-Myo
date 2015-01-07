var inspect = require('util').inspect,
    Rx = require('./index'),
    Hub = Rx.Myo(require('ws').connect),
    Events = Rx.Myo.Events(Hub),
    Commands = Rx.Myo.Commands(Hub);

Rx.Observable.merge([
    Commands.groupByArm()
        .flatMap(function(Arm) {
            return Arm.setStreamEMGAcknowledged();
        })
        .select(function(x) { return ["command", x]; }),
    
    Events.groupByArm()
        .flatMap(function(Arm) {
            return Arm.setStreamEMG({"type":"enabled"}).isEMG();
        })
        .select(function(x) { return ["emg", x]; })
    ])
    .forEach(
        function(xs) { console.log(xs[0], inspect(xs[1], {depth:null})); },
        function(er) { console.error(er); },
        function(  ) { console.log("completed"); }
    );
