var router = require('express').Router();
var passport = require('../middlewares/passport');

// ---------------------------------------------------------------------------------------------------------------------
// Admin/Login
// ---------------------------------------------------------------------------------------------------------------------

router.get('/admin/login', function (req, res) {
    res.render('pages/login');
});

router.post('/admin/login', function (req, res, next) {
    passport.admin.login(req, res)
        .spread(function (user, message) {
            if (!user) {
                return res.render('pages/login', {
                    errorMessage: message
                });
            }

            res.redirect(req.query.redirect || req.urls.homepage);
        })
        .catch(function (err) {
            next(err);
        });
});

// ---------------------------------------------------------------------------------------------------------------------
// GitLab/Auth
// ---------------------------------------------------------------------------------------------------------------------

router.get('/gitlab/auth', function (req, res) {
    passport.gitlab.authorize(req, res, {
        callbackURL: generateCallbackUrl(req)
    });
});

router.get('/gitlab/callback', function (req, res, next) {
    passport.gitlab.handleCallback(req, res, {
        callbackURL: generateCallbackUrl(req)
    }).spread(function (user, message) {
        if (!user) {
            return next(message || 'Authorization Failed');
        }

        res.redirect(req.query.redirect || req.urls.homepage);
    }).catch(function (err) {
        next(err);
    });
});

function generateCallbackUrl(req) {
    return req.protocol + '://' + req.get('host') + req.urls.generate('/passport/gitlab/callback', {
        redirect: req.query.redirect
    });
}

// ---------------------------------------------------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------------------------------------------------

router.get('/logout', function (req, res) {
    req.logout();
    res.redirect(req.urls.homepage);
});

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = router;