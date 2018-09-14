var fs = require('fs');
var path = require('path');
var express = require('express');
var configuration = require('./configuration');

// ---------------------------------------------------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------------------------------------------------

var server = {};

server.start = function () {
    var port = configuration.get('port');
    var namespace = configuration.get('namespace');

    console.log('Start server:');
    console.log('  - port:     ', port);
    console.log('  - namespace:', namespace);
    console.log('  - index:    ', 'http://localhost:' + port + namespace);
    console.log();

    var app = express();

    // setup.
    app.set('port', port);
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');

    // setup middleware.
    var faviconFile = path.join(__dirname, 'public', 'favicon.ico');
    if (fs.existsSync(faviconFile)) {
        app.use(require('serve-favicon')(faviconFile));
    }

    app.use(require('morgan')('dev'));
    app.use(require('body-parser').json(null));
    app.use(require('body-parser').urlencoded({extended: true}));
    app.use(require('cookie-parser')());
    app.use(require('cookie-session')({
        name: 'session',
        secret: configuration.get('cookie.secret'),
        maxAge: configuration.get('cookie.maxAge')
    }));

    app.use(require('connect-flash')());

    // setup static.
    app.use(namespace + '/assets', express.static(path.join(__dirname, 'public')));

    // setup custom middleware.
    app.use(require('./middlewares/common')());
    app.use(require('./middlewares/passport')());

    // setup custom routers.
    app.use(namespace, require('./routes'));
    app.use(namespace + '/pages', require('./routes/pages'));
    app.use(namespace + '/upload', require('./routes/upload'));
    app.use(namespace + '/passport', require('./routes/passport'));
    app.use(namespace + '/dashboard', require('./routes/dashboard'));
    app.use(namespace + '/dashboard/pages', require('./routes/dashboard/pages'));
    app.use(namespace + '/dashboard/settings', require('./routes/dashboard/settings'));

    // setup error handlers.
    app.use(function (req, res, next) {
        next(404);
    });

    app.use(require('./middlewares/errors')('pages/error'));

    // listen.
    app.listen(port, function () {
        var address = this.address();
        console.log('Listening on ' + (typeof address === 'string'
            ? 'pipe ' + address
            : 'port ' + address.port));
    });
};

// ---------------------------------------------------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------------------------------------------------

module.exports = server;