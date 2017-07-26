'use strict';
const BaseGenerator = require('../generator-base');
const net = require('net');
const path = require('path');
const guid = require('uuid/v4');

const WEB = 'webapp';
const CONSOLE = 'consoleapp';
const CLASSLIBRARY = 'classlibrary';
var applicationTypes = {};
applicationTypes[WEB] = {
    name: 'Web Application',
    defaultName: 'WebApplication',
    projectKey: 'fae04ec0-301f-11d3-bf4b-00c04f79efbc'
};
applicationTypes[CONSOLE] = {
    name: 'Console Application',
    defaultName: 'ConsoleApplication'
};
applicationTypes[CLASSLIBRARY] = {
    name: 'Class Library',
    defaultName: 'ClassLibrary'
};
var Generator = class extends BaseGenerator {
    constructor(args, opts) {
        super(args, opts);

        this.argument('type', {
            desc: 'the type of project to create',
            required: false,
            type: String
        });
        this.argument('projName', {
            desc: 'the name of creating project',
            required: false,
            type: String
        });
    }
};
module.exports = Generator;

const validProjectTypes = [WEB, CONSOLE, CLASSLIBRARY];
Generator.prototype.askProjectType = function () {
    if (this.options.type) {
        this.options.type = this.options.type.toLowerCase();
        if (validProjectTypes.indexOf(this.options.type) === -1) {
            this.log(this.options.type + ' project type is not supported.');
            delete this.options.type;
        }
        else {
            return;
        }
    }

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
    }]).then(answer => {
        this.options.type = answer.type;
    });
};

Generator.prototype.askProjectName = function () {
    if (this.options.projName) {
        return;
    }
    return this.prompt([{
        name: 'projname',
        message: 'Project name:' + (this.options.projectNamePrefix ? ' ' + this.options.projectNamePrefix : ''),
        default: applicationTypes[this.options.type].defaultName
    }]).then(answer => {
        this.options.projName = answer.projname;
    });
};
Generator.prototype.adjustProjectName = function () {
    if (this.options.projectNamePrefix) {
        this.options.projName = this.options.projectNamePrefix + this.options.projName;
    }
};

Generator.prototype.askCompanyName = BaseGenerator.prototype.askCompanyName;

Generator.prototype.askFrameworkVersion = function () {
    return this.prompt([{
        type: 'list',
        name: 'framework',
        message: 'Which .NET Framework version to use?',
        choices: ['4.0', '4.5', '4.5.1', '4.5.2', '4.6', '4.6.1'],
        default: '4.6.1'
    }]).then(answers => {
        this.options.framework = answers.framework;

        this.templateData.framework = answers.framework;
        // integer representation of framework version
        var frameworkNumber = answers.framework.replace(/\./g, '');
        this.templateData.shortFrameworkNumber = frameworkNumber;
        // add trailing zeros to have 3 digits
        frameworkNumber = (frameworkNumber + '000').substring(0, 3);
        frameworkNumber = parseInt(frameworkNumber);
        this.templateData.frameworkNumber = frameworkNumber;
    });
};

var getRandomPort = function () {
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
};

Generator.prototype.askWebSpecific = function() {
    if (this.options.type != WEB) {
        return;
    }

    let done = this.async();
    getRandomPort()
        .then(port => {
            this.port = port;
            done();
        });
};

Generator.prototype.configureTemplate = function () {
    this.templateData.type = this.options.type;

    this.templateData.projectTypeKey = applicationTypes[this.options.type].projectKey;
    this.templateData.projName = this.options.projName;
    this.templateData.port = this.port;
    this.templateData.guid = guid();
};

Generator.prototype.configureGeneric = function () {
    this.projectFolder = this.options.projName + '/';
};

var appendLine = function(source, replace, searchingRegex) {
    var match = searchingRegex.exec(source);

    var replaceResult = source.substring(0, searchingRegex.lastIndex)
        + replace
        + source.substring(searchingRegex.lastIndex);
    return replaceResult;
};

Generator.prototype._addProjectToSolution = function(projectPath) {
    if (!this.options.solutionFilePath) {
        return;
    }
    if (!this.fs.exists(this.options.solutionFilePath)) {
        this.log.error('Solution file not found: ' + this.options.solutionFilePath);
    }

    this.log('Adding proj file to solution.');
    this.invokeVSCommand('Add-Project -SolutionPath \'' + this.options.solutionFilePath + '\' -ProjectPath \'' + projectPath + '\'');
};

Generator.prototype.writing = function () {
    this.fs.copyTpl(this.templatePath('packages.config'), this.destinationPath(this.projectFolder + 'packages.config'), this.templateData);
    this.fs.copyTpl(this.templatePath('AssemblyInfo.cs'), this.destinationPath(this.projectFolder + 'Properties/AssemblyInfo.cs'), this.templateData);
    
    this.sourceRoot(path.join(__dirname, './templates/' + this.options.type));
    var projFilePath;
    switch (this.options.type) {
        case (WEB):
        projFilePath = this.destinationPath(this.projectFolder + this.options.projName + '.csproj');
        this.fs.copyTpl(this.templatePath('Project.csproj'), projFilePath, this.templateData);
        this.fs.copyTpl(this.templatePath('Project.csproj.user'), this.destinationPath(this.projectFolder + this.options.projName + '.csproj.user'), this.templateData);
        this.fs.copyTpl(this.templatePath('Web.config'), this.destinationPath(this.projectFolder + 'Web.config'), this.templateData);
        this.fs.copy(this.templatePath('Web.Debug.config'), this.destinationPath(this.projectFolder + 'Web.Debug.config'));
        this.fs.copy(this.templatePath('Web.Release.config'), this.destinationPath(this.projectFolder + 'Web.Release.config'));
        break;
    }
    this.projectFilePath = projFilePath;
};

Generator.prototype.install = function() {
    this._addProjectToSolution(this.projectFilePath);
    this.log('Installing nuget dependencies for ' + this.projectFilePath);
    // install nuget packages
    this.invokeNugetCommand('Invoke-NugetRestore ' + this.projectFilePath);
};