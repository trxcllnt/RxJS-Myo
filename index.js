var Rx = require("rx");

Rx.config.longStackTraces = true;

Rx.Myo = function() {
    return Rx.Myo.Hub.initialize.apply(null, arguments);
};

Rx.Myo.Hub = require("./lib/Hub");
Rx.Myo.Device = require("./lib/Myo");
Rx.Myo.Arm = require("./lib/Arm");
Rx.Myo.Events = require("./lib/Events");
Rx.Myo.Commands = require("./lib/Commands");
Rx.Myo.Acknowledgements = require("./lib/Acknowledgements");

module.exports = Rx;