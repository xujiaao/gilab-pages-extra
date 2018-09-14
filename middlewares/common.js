var querystring = require('querystring');
var configuration = require('../configuration');

var urls = {
    homepage: configuration.get('namespace') || '/',
    generate: function (path, query) {
        var url = (configuration.get('namespace') + path) || '/';
        if (query) {
            url += '?' + querystring.stringify(query);
        }

        return url;
    }
};

module.exports = function () {
    return function (req, res, next) {
        // request.
        req.urls = urls;

        // response.
        res.locals.namespace = configuration.get('namespace');
        res.locals.urls = urls;
        res.locals.query = req.query;
        res.locals.configuration = configuration;

        next();
    };
};