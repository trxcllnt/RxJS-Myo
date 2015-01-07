var Rx = require('rx'),
    Hub = require('./Hub'),
    getEventPredicate = require('./getEventPredicate'),
    pluck = Rx.helpers.pluck, identity = Rx.helpers.identity;

function Myo(observer, observable) {
    this.constructor = Myo;
    this.observer = observer;
    this.observable = observable;
    this.subscribe = observable.subscribe.bind(observable);
    this.myoID = observable.key || observer.myoID;
}

Myo.create = function(observer, observable) {
    return new Myo(observer, observable);
}

Myo.prototype = Object.create(Hub.prototype);

Myo.prototype.command = function(command, data) {
    data || (data = {});
    data.myo = this.myoID;
    return Hub.prototype.command.call(this, command, data);
}

var isDisconnected = getEventPredicate("disconnected");

/**
 * Group a Hub's Events or Commands by their "myo" key. When an Event comes through
 * with a "myo" ID that hasn't been seen before, a new group is 
 */
Hub.prototype.groupByMyoID = function() {
    return (this
        .groupByUntil(pluck("myo"), identity, function(group) {
            return group.where(isDisconnected);
        })
        .select(Myo.create.bind(null, this)));
}

module.exports = Myo;