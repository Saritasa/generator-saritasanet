'use strict';
const path = require('path');
const BaseGenerator = require('../generator-base');

var Generator = class extends BaseGenerator {
    constructor(args, opts) {
        super(args, opts);
    }
}
module.exports = Generator;

Generator.prototype.askCompanyName = BaseGenerator.prototype.askCompanyName;

Generator.prototype.askSolutionName = function () {
    return this.prompt([{
        name: 'solution',
        message: 'Solution name: ' + this.options.companyName + '.',
        validate: function (input) {
            return input != '';
        }
    }]).then(answers => {
        this.options.solution = answers.solution;
        var fullSolutionName = this.options.companyName + '.' + this.options.solution;
        this.options.solutionFilePath = this.destinationPath('src/' + fullSolutionName + '.sln');

        this.composeWith(require.resolve('../app'), {
            companyName: this.options.companyName,
            newRoot: 'src',
            projectNamePrefix: fullSolutionName + '.',
            solutionFilePath: this.options.solutionFilePath
        });
        this.composeWith(require.resolve('generator-psgallery/app'));
    });
};

Generator.prototype.configureTemplate = function () {
    this.templateData.solution = this.options.solution;
};

Generator.prototype.writing = function () {
    this.log('Creating solution file: ' + this.options.solutionFilePath);
    this.invokeVSCommand('Create-Solution ' + this.options.solutionFilePath);
    this.fs.copy(this.templatePath('CHANGELOG.txt'), this.destinationPath('CHANGELOG.txt'));
    this.fs.copy(this.templatePath('INSTALL.md'), this.destinationPath('INSTALL.md'));
};