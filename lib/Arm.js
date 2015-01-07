var Rx = require("rx"),
    Hub = require("./Hub"),
    Myo = require("./Myo");

function Arm(observer, observable, arm, x_direction) {
    Myo.call(this, observer, observable);
    this.constructor = Arm;
    this.arm = arm;
    this.x_direction = x_direction;
}

Arm.create = function(observer, observable, arm, x_direction) {
    return new Arm(observer, observable, arm, x_direction);
}

Arm.prototype = Object.create(Myo.prototype);

Hub.prototype.groupByArm = function() {
    return this.groupByMyoID().flatMap(function(Myo) {
        
        return Rx.Observable
            .when(Myo.isPaired()
                .and(Myo.isConnected())
                .and(Myo.isArmSynced())
                .thenDo(getArmForMyo))
            .take(1);
        
        function getArmForMyo(paired, connected, synced) {
            var arm = synced.arm, x_direction = synced.x_direction;
            return Arm.create(Myo, Myo.select(function(x) {
                return (x.arm = arm) && (x.x_direction = x_direction) && (x);
            }), arm, x_direction);
        }
    });
}

module.exports = Arm;