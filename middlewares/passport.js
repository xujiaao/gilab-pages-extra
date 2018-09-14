var Promise = require('bluebird');

var _ = require('lodash');
var rp = require('request-promise');
var express = require('express');
var passport = require('passport');
var configuration = require('../configuration');

// ---------------------------------------------------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------------------------------------------------

passport.serializeUser(function (user, callback) {
    callback(null, user);
});

passport.deserializeUser(function (user, callback) {
    callback(null, user);
});

// ---------------------------------------------------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------------------------------------------------

var middleware = function () {
    var router = express.Router();

    router.use(passport.initialize());
    router.use(passport.session());
    router.use(function (req, res, next) {
        res.locals.user = req.user;

        next();
    });

    return router;
};

// ---------------------------------------------------------------------------------------------------------------------
// Middleware/Admin
// ---------------------------------------------------------------------------------------------------------------------

var admin = middleware.admin = {_initialized: false};

admin.login = function (req, res) {
    if (!admin._initialized) {
        admin._initialized = true;

        passport.use(new (require('passport-local').Strategy)({
            passReqToCallback: true
        }, function (req, username, password, done) {
            if (configuration.eq('account.username', username) && configuration.eq('account.password', password)) {
                done(null, _.merge({}, req.user, {
                    admin: true
                }));
            } else {
                done(null, null, {
                    message: 'Invalid username or password'
                });
            }
        }));
    }

    return new Promise(function (resolve, reject) {
        passport.authenticate('local', function (err, user, info) {
            if (err) {
                return reject(err);
            }

            if (!user) {
                return resolve([null, info && info.message]);
            }

            req.login(user, function (err) {
                if (err) {
                    return reject(err);
                }

                resolve([user, null]);
            });
        })(req, res);
    });
};

// ---------------------------------------------------------------------------------------------------------------------
// Middleware/GitLab
// ---------------------------------------------------------------------------------------------------------------------

var gitlab = middleware.gitlab = {
    _initialized: false,
    _cache: require('lru-cache')({max: 500, maxAge: 5 * 60 * 1000 /* 5 minutes */})
};

gitlab.invalidate = function () {
    middleware.gitlab._initialized = false;

    return Promise.resolve();
};

gitlab.authorize = function (req, res, options) {
    if (!gitlab._initialized) {
        middleware.gitlab._initialized = true;

        passport.use(new (require('passport-gitlab2').Strategy)({
                baseURL: configuration.get('gitlab.url'),
                clientID: configuration.get('gitlab.application.id'),
                clientSecret: configuration.get('gitlab.application.secret'),
                passReqToCallback: true
            }, function (req, accessToken, refreshToken, profile, done) {
                done(null, _.merge({}, req.user, {
                    gitlab: {
                        id: profile.id,
                        name: profile.username,
                        avatar: profile.avatarUrl,
                        token: accessToken,
                        updatedAt: Date.now()
                    }
                }));
            }
        ));
    }

    passport.authenticate('gitlab', {
        scope: ['api'],
        callbackURL: options.callbackURL
    })(req, res);
};

gitlab.handleCallback = function (req, res, options) {
    return new Promise(function (resolve, reject) {
        passport.authenticate('gitlab', {
            callbackURL: options.callbackURL
        }, function (err, user, info) {
            if (err) {
                return reject(err);
            }

            if (!user) {
                return resolve([null, info && info.message]);
            }

            req.login(user, function (err) {
                if (err) {
                    return reject(err);
                }

                resolve([user, null]);
            });
        })(req, res);
    });
};

gitlab.checkUserStatus = function (user) {
    if (!user || !user.gitlab) {
        return Promise.resolve(401);
    }

    if (Date.now() - user.gitlab.updatedAt < 30 * 60 * 1000) {
        return Promise.resolve(200);
    }

    return Promise.resolve(rp({
        method: 'HEAD',
        url: configuration.get('gitlab.url') + '/api/v4/user',
        qs: {
            access_token: user.gitlab.token
        },
        json: true
    })).then(function () {
        user.gitlab.updatedAt = Date.now();

        return 200;
    }).catch(function (err) {
        var status = err.statusCode;
        if (status === 401) {
            delete user.gitlab; // token expired, logout.

            return status;
        }

        throw err;
    });
};

gitlab.checkProjectStatus = function (user, project) {
    if (!project) {
        return Promise.resolve(404);
    }

    return gitlab.checkUserStatus(user)
        .then(function (status) {
            if (status !== 200) {
                return status;
            }

            var key = user.gitlab.token + ':' + project;

            status = gitlab._cache.get(key);
            if (status) {
                return Promise.resolve(status);
            }

            return Promise.resolve(rp({
                method: 'HEAD',
                url: configuration.get('gitlab.url') + '/api/v4/projects/' + encodeURIComponent(project),
                qs: {
                    access_token: user.gitlab.token
                },
                json: true
            })).then(function () {
                gitlab._cache.set(key, 200);

                return 200;
            }).catch(function (err) {
                var status = err.statusCode;
                if (status) {
                    gitlab._cache.set(key, status);

                    return status;
                }

                throw err;
            });
        });
};

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = middleware;