module.exports = {
	tap: tap,
	count: count,
	waitForEl: waitForEl
}

function tap(selector, callback) {
	waitForEl(selector, function() {
		var events = isTouch ? [$.Event('touchstart'), $.Event('touchend')] : [$.Event('mousedown'), $.Event('mouseup'), $.Event('click')]
		var $el = $(selector)
		events.forEach(function($event) { $el.trigger($event) })
		callback && callback()
	})
}
function count(selector, callback) {
	waitForEl(selector, function() {
		callback($(selector).length)
	})
}
function waitForEl(selector, callback) {
	checkNow()
	function checkNow() {
		var $result = $(selector)
		if (!$result.length) { return setTimeout(checkNow, 50) }
		callback($result)
	}
}
