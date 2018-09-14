var Promise = require('bluebird');

var _ = require('lodash');
var pages = require('../middlewares/pages');
var upload = require('../middlewares/upload');
var router = require('express').Router();
var configuration = require('../configuration');

// ---------------------------------------------------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------------------------------------------------

router.post('/', upload.single('pages'), function (req, res, next) {
    req.format = 'json';

    var inputs = {
        token: _.trim(req.body['token']),
        project: _.trim(req.body['project']),
        pages: req.file && req.file.path
    };

    new Promise(function (resolve, reject) {
        if (!inputs.token) {
            return reject('Please input the Upload Token');
        }

        if (!inputs.project) {
            return reject('Please input the GitLab Project Path');
        }

        if (!inputs.pages) {
            return reject('Please select a file to upload');
        }

        if (!_.eq(inputs.token, configuration.get('token'))) {
            return reject('Invalid Upload Token');
        }

        resolve();
    }).then(function () {
        return pages.update(inputs.project, inputs.pages);
    }).then(function () {
        res.send({
            message: 'Upload Pages Success'
        });
    }).catch(function (err) {
        next(err);
    });
});

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = router;