var Rx = require("rx"),
    Hub = require("./Hub"),
    Fn = require("./Fn");

function Myo(observer, observable) {
    Hub.call(this, observer, observable);
    if("key" in observable) { this.myoID = observable.key; } else
    if("myoID" in observer) { this.myoID = observer.myoID; }
}

Myo.create = function(observer, observable) {
    return new Myo(observer, observable);
};

Myo.prototype = Object.create(Hub.prototype, {
    constructor: { value: Myo },
    command:     { value: function(command, data) {
        data || (data = {});
        data.myo = this.myoID;
        return Hub.prototype.command.call(this, command, data);
    }}
});

var isDisconnected = Fn.compareField("type", "disconnected");

/**
 * Group a Hub's Events or Commands by their "myo" key. When an Event comes through
 * with a "myo" ID that hasn't been seen before, a new group is emitted.
 */
Hub.prototype.groupByMyoID = function() {
    return (this
        .groupByUntil(Fn.pluck("myo"), Fn.I, function(group) {
            return group.where(isDisconnected);
        })
        .select(Myo.create.bind(null, this)));
};

module.exports = Myo;