module.exports = function(command) {
    return function commandPredicate(x) {
        return x.command == command;
    }
}
