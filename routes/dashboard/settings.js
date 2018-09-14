var _ = require('lodash');
var router = require('express').Router();
var passport = require('../../middlewares/passport');
var validator = require('validator');
var configuration = require('../../configuration');

// ---------------------------------------------------------------------------------------------------------------------
// GitLab
// ---------------------------------------------------------------------------------------------------------------------

router.get('/gitlab', function (req, res) {
    var successMessage = req.flash('dashboard.settings.gitlab');

    renderGitLab(req, res, {
        successMessage: successMessage,
        gitlab: {
            url: configuration.get('gitlab.url'),
            application: {
                id: configuration.get('gitlab.application.id'),
                secret: configuration.get('gitlab.application.secret')
            }
        }
    });
});

router.post('/gitlab', function (req, res, next) {
    var gitlab = {
        url: _.trim(req.body['gitlab-url']),
        application: {
            id: _.trim(req.body['gitlab-application-id']),
            secret: _.trim(req.body['gitlab-application-secret'])
        }
    };

    var errorMessage;
    if (!validator.isURL(gitlab.url)) {
        errorMessage = 'Invalidate Server Address';
    } else if (validator.isEmpty(gitlab.application.id)) {
        errorMessage = 'Application Id cannot be empty';
    } else if (validator.isEmpty(gitlab.application.id)) {
        errorMessage = 'Secret cannot be empty';
    }

    if (errorMessage) {
        renderGitLab(req, res, {
            gitlab: gitlab,
            errorMessage: errorMessage
        });
    } else {
        configuration.merge({gitlab: gitlab});
        configuration.flush();

        passport.gitlab.invalidate()
            .then(function () {
                req.flash('dashboard.settings.gitlab', 'Update GitLab Configuration Success');
                res.redirect(req.originalUrl);
            })
            .catch(function (err) {
                next(err);
            });
    }
});

function renderGitLab(req, res, data) {
    res.locals.urls = _.merge({
        callback: req.protocol + '://' + req.get('host') + req.urls.generate('/passport/gitlab/callback'),
        testing: req.urls.generate('/passport/gitlab/auth', {
            redirect: req.urls.generate('/dashboard/settings/gitlab/test')
        })
    }, res.locals.urls);

    res.render('pages/dashboard/gitlab', data);
}

// ---------------------------------------------------------------------------------------------------------------------
// GitLab/Test
// ---------------------------------------------------------------------------------------------------------------------

router.get('/gitlab/test', function (req, res) {
    if (req.user) {
        res.send({
            message: 'Success',
            username: req.user.username
        });
    } else {
        res.send({
            message: 'Failure'
        });
    }
});

// ---------------------------------------------------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------------------------------------------------

router.get('/password', function (req, res) {
    var successMessage = req.flash('dashboard.settings.password');

    res.render('pages/dashboard/password', {
        successMessage: successMessage
    });
});

router.post('/password', function (req, res) {
    var oldPassword = req.body['password-old'];
    var newPassword = req.body['password-new'];
    var confirmPassword = req.body['password-confirm'];

    var errorMessage;
    if (!newPassword || !confirmPassword) {
        errorMessage = 'Please input new password';
    } else if (!_.eq(newPassword, confirmPassword)) {
        errorMessage = 'Passwords are not same';
    } else if (!_.eq(oldPassword, configuration.get('account.password'))) {
        errorMessage = 'Invalid password';
    }

    if (errorMessage) {
        res.render('pages/dashboard/password', {
            errorMessage: errorMessage
        });
    } else {
        configuration.set('account.password', newPassword);
        configuration.flush();

        req.flash('dashboard.settings.password', 'Update Password Success');
        res.redirect(req.originalUrl);
    }
});

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = router;