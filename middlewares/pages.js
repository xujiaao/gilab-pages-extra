var Promise = require('bluebird');

var _ = require('lodash');
var fs = require('fs-extra');
var path = require('path');
var extract = require('extract-zip');
var storage = require('../storage');

// ---------------------------------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------------------------------

var middleware = {_mtime: null, _pages: null};

middleware.list = function () {
    var dir = path.join(storage.files, 'pages');

    return Promise.resolve(fs.stat(dir))
        .then(function (stat) {
            if (!middleware._pages || !_.eq(stat.mtime, middleware._mtime)) {
                return Promise.resolve(fs.readdir(dir))
                    .then(function (pages) {
                        if (pages) {
                            pages.sort();
                            pages = _.map(pages, function (page) {
                                return {
                                    id: page,
                                    project: middleware.generateProject(page)
                                }
                            });
                        }

                        middleware._mtime = stat.mtime;
                        middleware._pages = pages || [];
                    });
            }
        })
        .then(function () {
            return middleware._pages;
        })
        .catch(function (err) {
            if (err.code === 'ENOENT') {
                return [];
            }

            throw err;
        });
};

middleware.update = function (project, zip) {
    var extracted = zip + '.extracted';

    new Promise(function (resolve, reject) {
        extract(zip, {dir: extracted}, function (err) {
            if (err) {
                return reject('Failed to unzip file');
            }

            Promise.resolve(fs.readdir(extracted)).then(function (files) {
                if (files.length === 0) {
                    return reject('Failed to unzip file');
                }

                resolve(files.length === 1 ? path.join(extracted, files[0]) : extracted);
            });
        });
    }).then(function (sources) {
        var pages = path.join(storage.files, 'pages', _.replace(project, '/', '+'));

        return fs.remove(pages).then(function () {
            return fs.move(sources, pages);
        });
    }).finally(function () {
        return Promise.resolve(fs.remove(extracted)).catchReturn();
    });
};

middleware.remove = function (project) {
    var pages = path.join(storage.files, 'pages', project);

    return Promise.resolve(fs.remove(pages));
};

middleware.generateId = function (project) {
    return _.chain(project).split('/').compact().join('+').value();
};

middleware.generateProject = function (id) {
    return _.chain(id).split('+').compact().join('/').value();
};

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = middleware;