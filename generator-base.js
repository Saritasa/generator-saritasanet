'use strict';
const YoGenerator = require('yeoman-generator');
const path = require('path');

var Generator = class extends YoGenerator {
    constructor(args, opts) {
        super(args, opts);

        this.templateData = {};

        this.argument('companyName', {
            desc: 'the company name',
            required: false,
            type: String
        });

        this.originalSource = this.sourceRoot();
    }
    destinationPath (path) {
        if (this.options.newRoot) {
            path = this.options.newRoot + '/' + path;
        }
        return super.destinationPath(path);
    }
};
module.exports = Generator;

Generator.prototype.askCompanyName = function () {
    if (this.options.companyName) {
        this.templateData.companyName = this.options.companyName;
        return;
    }

    return this.prompt([{
        name: 'company',
        message: 'Company name:',
        default: 'Saritasa'
    }]).then(answer => {
        this.options.companyName = answer.company;
        this.templateData.companyName = answer.company;
    });
};

Generator.prototype.invokePowerShellCommand = function(command) {
    var nugetFunctions = path.join(__dirname, './tools/nuget.ps1');
    this.spawnCommand('powershell', ['-Command', '&{ . ' + nugetFunctions + '; ' + command + ' }']);
};