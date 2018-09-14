var Promise = require('bluebird');

var _ = require('lodash');
var path = require('path');
var pages = require('../middlewares/pages');
var express = require('express');
var storage = require('../storage');
var passport = require('../middlewares/passport');

// ---------------------------------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------------------------------

var router = express.Router();
var serveStatic = express.static(path.join(storage.files, 'pages'), {
    'index': ['index.html', 'index.htm']
});

router.use('/', function (req, res, next) {
    if (req.bypass) {
        return serveStatic(req, res, next);
    } else {
        var index = req.path.indexOf('~');
        if (index !== -1 && (req.path.length === index + 1 || req.path[index + 1] === '/')) {
            var id = pages.generateId(decodeURIComponent(req.path.substr(0, index)));
            if (id) {
                if (!req.isAuthenticated() || !req.user.gitlab) {
                    return res.redirect(req.urls.generate('/passport/gitlab/auth', {
                        redirect: req.originalUrl
                    }));
                }

                return passport.gitlab.checkProjectStatus(req.user, pages.generateProject(id))
                    .then(function (status) {
                        if (status === 200) {
                            req.bypass = true;
                            req.url = id + req.url.substr(index + 1);

                            router.handle(req, res, next);
                        } else {
                            next(status);
                        }
                    }).catch(function (err) {
                        next(err);
                    });
            }
        }
    }

    next(404);
});

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = router;