
var slice = Array.prototype.slice;

Function.prototype.let = function(func) {
    var source = this;
    typeof func !== "function" && (func = Fn[func]);
    return function() {
        return func(source.apply(null, arguments));
    }
}

function Fn() {}
Fn.prototype = Fn;
Fn.noop = function() {};

Fn.I = function(x) {
    return x;
};

Fn.K = function(x) {
    return function() {
        return x;
    };
};

Fn.apply = function(f, x) {
    return function() {
        return f.apply(x, arguments);
    };
};

Fn.call = function(f) {
    var a = slice.call(arguments, 1);
    return function(x) {
        return x[f].apply(x, a);
    };
};

Fn.pluck = function(prop) {
    return function(x) {
        return x[prop];
    };
};

Fn.compareTo = function(a, comparer) {
    return function(b) {
        return !!comparer ? comparer(a, b) : a === b;
    }
};

Fn.compareField = function(prop, val) {
    return Fn.compareTo(val, function(val, x) {
        return x[prop] === val;
    });
};

module.exports = Fn;