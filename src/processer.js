var deasync = require('deasync');
var css2js = require('fis3-preprocessor-css2js');

var rRequire = /(var\s+\w+\s*=\s*)?\brequire\s*\(\s*('|")(.+?)\2\s*\)/g;
var lang = fis.compile.lang;
var core;


module.exports = function (content, file, conf) {
	if (!core) {
		core = require('./initCore')(conf);
	}

	var mode = conf.mode;

	function process(file, hasDeclare) {
		var result;

		fis.compile(file);

		// 无变量声明的, 不进行转化
		if (!hasDeclare) {
			return {
				injectableSource: file.getContent(),
			};
		}

		core.load(file.getContent(), file.url)
			.then(function (obj) {
				result = obj;
			});

		while (!result) {
			deasync.sleep(100);
		}

		file.setContent(result.injectableSource);

		return result;
	}

	return content.replace(rRequire, function (str, declare, quote, value) {
		if (!value) {
			return str;
		}

		var info = fis.project.lookup(value, file);
		var targetFile = info.file;

		if (!targetFile || !targetFile.isCssLike) {
			return str;
		}

		var scopedCSS = process(targetFile, !!declare);

		str = !declare ? '' : (declare + JSON.stringify(scopedCSS.exportTokens) + ';');

		switch (mode) {
			case 'dep':
				// 添加依赖标记
				str += lang.info.wrap(lang.require.wrap(value));
				break;

			case 'inline':
				str += css2js.processCss(scopedCSS.injectableSource);
				break;

			case 'jsRequire':
				var newFile = fis.file.wrap(targetFile.dirname + '/' + targetFile.filename + targetFile.rExt + '.js');

				newFile.setContent(css2js.processCss(scopedCSS.injectableSource));
				newFile.isMod = true;
				newFile.moduleId = newFile.id;
				fis.compile(newFile);

				// 其他文件的require中引用的是moduleId，方便从ret.ids中查找到文件，参考deps-pack打包。
				file.extras = file.extras || {};
				file.extras.derived = file.extras.derived || [];
				file.extras.derived.push(newFile);

				str += 'require(' + quote + (newFile.moduleId || newFile.id) + quote + ')';
				break;
		}

		return str;
	});
};

