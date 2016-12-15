const generators = require('yeoman-generator');
const net = require('net');
const path = require('path');
const guid = require('uuid/v4');


const WEB = 'webapp';
const CONSOLE = 'consoleapp';
const CLASSLIBRARY = 'classlibrary';
var applicationTypes = {};
applicationTypes[WEB] = {
    name: 'Web Application',
    defaultName: 'WebApplication'
};
applicationTypes[CONSOLE] = {
    name: 'Console Application',
    defaultName: 'ConsoleApplication'
};
applicationTypes[CLASSLIBRARY] = {
    name: 'Class Library',
    defaultName: 'ClassLibrary'
};

module.exports = generators.Base.extend({
    constructor: function () {
        generators.Base.apply(this, arguments);
    },
    _getRandomPort: function () {
        return new Promise((resolve, reject) => {
            try {
                var server = net.createServer();
                server.listen(0, function() {
                    var port = server.address().port;
                    server.close();
                    resolve(port);
                });
            }
            catch (err) {
                reject(err);
            }
        });
    },
    initializing: function () {
        this.templateData = {};
    },
    prompting: function () {
        return this.prompt([{
            type: 'list',
            name: 'type',
            message: 'What type of application to create?',
            choices: [
                {
                    name: applicationTypes[WEB].name,
                    value: WEB
                }
            ]
        }, {
            type: 'list',
            name: 'framework',
            message: 'Which .NET Framework version to use?',
            choices: ['4.0', '4.5', '4.5.1', '4.5.2', '4.6', '4.6.1'],
            default: '4.6.1'
        }]).then(function (answers) {
            this.type = answers.type;
            this.framework = answers.framework;

            return this.prompt([{
                name: 'appname',
                message: 'Application name:',
                default: applicationTypes[this.type].defaultName
            }]).then(function (appNameAnswer) {
                this.appname = appNameAnswer.appname;
            }.bind(this));
        }.bind(this));
    },
    askWebSpecific: function() {
        if (this.type != WEB) {
            return;
        }

        var done = this.async();
        this.prompt([{
            name: 'port',
            message: 'Wich port to use? 0 for random.',
            default: '0',
            validate: function(input) {
                // port number can only be an integer from 0 to 99999
                var intNumber = parseInt(input);
                if (input != intNumber) {
                    return false;
                }
                return intNumber >= 0 && intNumber <= 99999; 
            }
        }]).then(function (portAnswer) {
            this.port = parseInt(portAnswer.port);
            if (this.port == 0) {
                this._getRandomPort()
                    .then(port => {
                        this.port = port;
                        done();
                    });
            } else {
                done();
            }
        }.bind(this));
    },

    configureTemplate: function () {
        this.templateData.type = this.type;
        this.templateData.framework = this.framework;

        // integer representation of framework version
        var frameworkNumber = this.framework.replace(/\./g, '');
        // add trailing zeros to have 3 digits
        frameworkNumber = (frameworkNumber + '000').substring(0, 3);
        frameworkNumber = parseInt(frameworkNumber);
        this.templateData.frameworkNumber = frameworkNumber;

        this.templateData.appname = this.appname;
        this.templateData.port = this.port;
        this.templateData.guid = guid();
    },

    writing: function () {
        this.sourceRoot(path.join(__dirname, './templates/' + this.type));
        var projectFolder = this.appname + '/';
        switch (this.type) {
            case (WEB):

            this.fs.copyTpl(this.templatePath('Project.csproj'), this.destinationPath(projectFolder + this.appname + '.csproj'), this.templateData);
            this.fs.copyTpl(this.templatePath('Web.config'), this.destinationPath(projectFolder + 'Web.config'), this.templateData);
            this.fs.copy(this.templatePath('Web.Debug.config'), this.destinationPath(projectFolder + 'Web.Debug.config'));
            this.fs.copy(this.templatePath('Web.Release.config'), this.destinationPath(projectFolder + 'Web.Release.config'));
            break;
        }
    }
});