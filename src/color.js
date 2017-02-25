// Set up colorization
//////////////////////
var C = module.exports = { // see https://github.com/dcodeIO/colour.js/blob/master/colour.js
	grey:   ['\x1B[90m', '\x1B[39m'],
	green:  ['\x1B[32m', '\x1B[39m'],
	yellow: ['\x1B[33m', '\x1B[39m'],
	red:    ['\x1B[31m', '\x1B[39m']
}
var isBrowser = (typeof global.window != 'undefined')
for (var color in C) {
	if (C.hasOwnProperty(color)) {
		C[color] = (isBrowser ? _getBrowserColorFn(color) : _getNodeColorFn(color))
	}
}
function _getBrowserColorFn(color) {
	return function(text) {
		var escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
		return '<span style="color:'+color+'">'+escaped+'</span>'
	}			
}
function _getNodeColorFn(color) {
	var codes = C[color]
	return function(text) {
		return codes[0]+text+codes[1]
	}
}

