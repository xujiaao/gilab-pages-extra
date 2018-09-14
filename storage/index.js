var Promise = require('bluebird');

var fs = require('fs-extra');
var path = require('path');
var later = require('later');

// ---------------------------------------------------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------------------------------------------------

var storage = {
    files: path.join(__dirname, 'files'),
    caches: path.join(__dirname, 'caches')
};

storage.start = function () {
    later.setInterval(function () {
        storage.cleanup(4 * 60 * 60 * 1000);
    }, later.parse.text('every 8 hours'));

    return storage.cleanup();
};

storage.cleanup = function (maxAge) {
    var expired = maxAge && (Date.now() - maxAge);

    function cleanup(dir) {
        return Promise.resolve(fs.readdir(dir)).each(function (file) {
            file = path.join(dir, file);

            return fs.stat(file).then(function (stat) {
                if (stat.isDirectory()) {
                    return cleanup(file);
                } else {
                    if (!expired || stat.mtime.getTime() <= expired) {
                        return fs.remove(file);
                    }
                }
            });
        });
    }

    return fs.pathExists(storage.caches)
        .then(function (exists) {
            if (exists) {
                return cleanup(storage.caches);
            }
        });
};

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = storage;