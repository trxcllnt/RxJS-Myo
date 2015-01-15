var inspect = require("util").inspect,
    Rx = require("rx"),
    ws = require("ws"),
    Myo = require("./index"),
    Hub = Myo(ws.connect);

Hub .Events()
    .groupByArm()
    .flatMap(function(Arm) {
        return Arm
            .setEMG({"type": "enabled"})
            .emg();
    })
    .forEach(
        function(xs) { console.log(inspect(xs, {depth:null})); },
        function(er) { console.error(er); },
        function(  ) { console.log("completed"); }
    );