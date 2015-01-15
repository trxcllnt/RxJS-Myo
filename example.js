var Rx = require("rx"),
    ws = require("ws"),
    Myo = require("./index"),
    Hub = Myo(ws.connect || ws),
    inspect = require("util").inspect,
    emg = Hub
        .Events()
        .groupByArm()
        .flatMap(function(Arm) {
            return Arm
                .setEMG({"type": "enabled"})
                .isEMG();
        });

if(document) {
    var canvas = document.createElement("canvas");
} else {
    emg.forEach(
        function(xs) { console.log(inspect(xs, {depth:null})); },
        function(er) { console.error(er.stack || er.toString()); },
        function(  ) { console.log("completed"); }
    );
}
