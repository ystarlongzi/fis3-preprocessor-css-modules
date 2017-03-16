var stringHash = require('string-hash');
var processer = require('./processer');

function scopedNameGenerator(name, filename, css) {
	var i = css.indexOf('.' + name);
	var lineNumber = css.substr(0, i).split(/[\r\n]/).length;
	var hash = stringHash(css).toString(36).substr(0, 5);

	return [name, hash, lineNumber].join('_');
}


module.exports = processer;

module.exports.defaultOptions = {
	mode: 'dep',
	scope: scopedNameGenerator,
};

