module.exports = function(event) {
    return function eventPredicate(x) {
        return x.type == event;
    }
}
