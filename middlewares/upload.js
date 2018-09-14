var path = require('path');
var storage = require('../storage');

module.exports = require('multer')({
    dest: path.join(storage.caches, 'uploads')
});