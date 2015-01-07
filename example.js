var inspect = require('util').inspect,
    Rx = require('./index'),
    Hub = Rx.Myo(require('ws').connect),
    Events = Rx.Myo.Events(Hub),
    Commands = Rx.Myo.Commands(Hub),
    Acknowledgements = Rx.Myo.Acknowledgements(Hub);

Rx.Observable.merge([
    Commands.groupByArm().mergeAll()
        .select(function(x) { return ["command", x]; }),
    
    Acknowledgements.groupByArm().mergeAll()
        .select(function(x) { return ["acknowledgement", x]; }),
    
    Events.groupByArm()
        .flatMap(function(Arm) {
            return Arm.command({
                "command": "set_stream_emg",
                "type": "enabled"
            }).isEMGEvent();
        })
        .select(function(x) { return ["emg", x]; })
    ])
    .forEach(
        function(xs) { console.log(xs[0], inspect(xs[1], {depth:null})); },
        function(er) { console.error(er); },
        function(  ) { console.log("completed"); }
    );
