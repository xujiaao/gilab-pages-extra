#!/usr/bin/env node

var Promise = require('bluebird');

var chalk = require('chalk');
var program = require('commander');
var inquirer = require('inquirer');
var configuration = require('../configuration');

// ---------------------------------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------------------------------

var handled;

program
    .command('configure')
    .alias('conf')
    .description('Configure the server')
    .action(function () {
        handled = true;

        inquirer.prompt([{
            type: 'input',
            name: 'values.port',
            message: 'The port to bind',
            default: configuration.get('port')
        }, {
            type: 'input',
            name: 'values.namespace',
            message: 'The namespace to bind',
            default: configuration.get('namespace', '/')
        }]).then(function (answers) {
            configuration.merge(answers['values']);
        }).then(function () {
            console.log(chalk.blue.bold('\n[Success] Please restart server...\n'));
        });
    });

program
    .action(function (command) {
        handled = true;

        console.log(chalk.red('Unknown command: ' + command));
        program.help();
    });

program.parse(process.argv);

if (!handled) {
    Promise.all([
        require('../storage').start()
    ]).then(function () {
        require('../server').start();
    });
}