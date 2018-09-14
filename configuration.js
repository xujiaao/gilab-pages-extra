var Preferences = require('preferences');

var _ = require('lodash');
var path = require('path');
var storage = require('./storage');
var randomstring = require("randomstring");

var configuration = {
    properties: initPreferences(new Preferences('gitlab-pages', {}, {
        encrypt: true,
        file: path.join(storage.files, 'configuration.preferences')
    }), {
        port: 10000,
        namespace: '/gitlab-pages',
        token: randomstring.generate(),
        account: {
            username: 'admin',
            password: 'admin123'
        },
        gitlab: {
            url: undefined,
            application: {
                id: undefined,
                secret: undefined
            }
        },
        cookie: {
            secret: randomstring.generate({length: 12, charset: 'alphabetic'}),
            maxAge: 7 * 24 * 60 * 60 * 1000
        }
    }),
    schemas: {
        'port': {
            format: function (value) {
                var intValue = parseInt(value, 10);
                return isNaN(intValue) ? value : intValue;
            }
        },
        'namespace': {
            format: function (value) {
                var trimmedValue = _.trim(value, '_/');
                return trimmedValue ? '/' + trimmedValue : '';
            }
        }
    }
};

function initPreferences(preferences, defaults) {
    return _.chain(preferences).defaultsDeep(defaults).tap(function (preferences) {
        preferences.save()
    }).value();
}

module.exports = {
    get: function (path) {
        return _.get(configuration.properties, path);
    },
    eq: function (path, value) {
        return _.eq(_.get(configuration.properties, path), value);
    },
    set: function (path, value) {
        var schema = configuration.schemas[path];
        if (schema && schema.format) {
            value = schema.format(value);
        }

        return _.set(configuration.properties, path, value);
    },
    merge: function (properties) {
        _.each(configuration.schemas, function (schema, path) {
            if (schema.format) {
                if (_.has(properties, path)) {
                    _.set(properties, path, schema.format(_.get(properties, path)));
                }
            }
        });

        _.merge(configuration.properties, properties);
    },
    flush: function () {
        configuration.properties.save();
    }
};