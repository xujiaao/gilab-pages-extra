var Promise = require('bluebird');

var _ = require('lodash');
var pages = require('../../middlewares/pages');
var upload = require('../../middlewares/upload');
var router = require('express').Router();
var randomstring = require("randomstring");
var configuration = require('../../configuration');

// ---------------------------------------------------------------------------------------------------------------------
// Explore
// ---------------------------------------------------------------------------------------------------------------------

router.get('/explore', function (req, res, next) {
    pages.list()
        .then(function (pages) {
            res.render('pages/dashboard/explore', {
                pages: pages
            });
        })
        .catch(function (err) {
            next(err);
        });
});

// ---------------------------------------------------------------------------------------------------------------------
// Remove
// ---------------------------------------------------------------------------------------------------------------------

router.get('/remove/:project', function (req, res, next) {
    pages.remove(req.params['project'])
        .then(function () {
            res.redirect(req.urls.generate('/dashboard/pages/explore'));
        })
        .catch(function (err) {
            next(err);
        });
});

// ---------------------------------------------------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------------------------------------------------

router.get('/upload', function (req, res) {
    var successMessage = req.flash('dashboard.pages.upload');

    renderUpload(req, res, {
        successMessage: successMessage
    });
});

router.post('/upload', upload.single('pages'), function (req, res, next) {
    var inputs = {
        project: _.trim(req.body['project']),
        pages: req.file && req.file.path
    };

    new Promise(function (resolve, reject) {
        if (!inputs.project) {
            return reject('Please input the GitLab Project Path');
        }

        if (!inputs.pages) {
            return reject('Please select a file to upload');
        }

        resolve();
    }).then(function () {
        return pages.update(inputs.project, inputs.pages);
    }).then(function () {
        req.flash('dashboard.pages.upload', 'Upload Pages Success');
        res.redirect(req.originalUrl);
    }).catch(function (err) {
        var message;
        if (typeof err === 'string') {
            message = err;
        } else {
            message = 'Failed to upload pages';
            console.error(err);
        }

        renderUpload(req, res, {
            inputs: inputs,
            errorMessage: message
        });
    }).catch(function (err) {
        next(err);
    });
});

function renderUpload(req, res, data) {
    res.locals.urls = _.merge({
        upload: req.protocol + '://' + req.get('host') + req.urls.generate('/upload')
    }, res.locals.urls);

    res.render('pages/dashboard/upload', data);
}

// ---------------------------------------------------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------------------------------------------------

router.get('/upload-token/reset', function (req, res) {
    configuration.set('token', randomstring.generate());
    configuration.flush();

    res.redirect(req.urls.generate('/dashboard/pages/upload'));
});

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = router;