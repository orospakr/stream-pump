var log = function(level, component, message) {
    var d = new Date();
    console.log(level + " (" + (d.getTime() / 1000) + "): [" + component + "] " + message);
};

exports.warn = function(component, message) {
    log("WARN", component, message);
};

exports.error = function(component, message) {
    log("ERROR", component, message);
};

exports.info = function(component, message) {
    log("INFO", component, message);
};

exports.debug = function(component, message) {
    log("DEBUG", component, message);
};
