var testCase = require('nodeunit').testCase;

module.exports = testCase({
    setUp: function (callback) {
        this.foo = 'bar';
        callback();
    },
    tearDown: function (callback) {
        callback();
    },
    test1: function (test) {
        test.equals(this.foo, 'bar');
        test.done();
    }
});
