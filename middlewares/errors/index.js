var _ = require('lodash');
var pages = require('./pages');
var createError = require('http-errors');

module.exports = function (view) {
    return function (err, req, res, next) {
        switch (typeof err) {
            case 'number':
                err = createError(err);
                break;

            case 'string':
                err = createError(400, err);
                break;

            default:
                err.status = err.status || err.statusCode || 500;

                break;
        }

        if (err.status === 500) {
            console.error(err);
        }

        res.status(err.status);

        if (req.xhr || req.format === 'json' || (req.query && req.query.format === 'json')) {
            res.send(err);
        } else {
            var page = pages[_.toString(err.status)] || pages['500'];

            res.render(view, {
                page: {
                    status: err.status,
                    title: page.title,
                    message: page.message
                }
            });
        }
    };
};