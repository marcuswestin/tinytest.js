module.exports = {
	// Setup & Run
	describe:describe,
	then:then,
	run:run,
	// Assertion utils
	is:is,
	// DOM utils
	tap:tap,
	count:count,
	waitFor:waitFor
}

// Setup
var suites = {}
var setupStack = [suites]
function describe(name, fn) {
	var thunk = {}
	setupStack[0][name] = thunk
	setupStack.unshift(thunk)
	fn()
	setupStack.shift()
}
function then(testName, fn) {
	setupStack[0][testName] = fn
}

// Run
function now() { return new Date().getTime() }
function run(reporter) {
	run.failed = false
	run.reporter = reporter
	
	var tests = []
	descend('', suites)
	function descend(base, thunk) {
		for (var name in thunk) {
			if (typeof thunk[name] == 'function') {
				tests.push({ name:base+' '+name, fn:thunk[name] })
			} else {
				descend(base + ' ' + name, thunk[name])
			}
		}
	}
	
	var totalStartTime = now()
	runNextTest()
	function runNextTest() {
		if (run.failed) { return }
		if (!tests.length) { return reporter.onAllDone(now() - totalStartTime) }
		var test = run.currentTest = tests.shift()
		reporter.onTestStart(test.name)
		var startTime = now()
		test.fn(function(err) {
			if (err) { return fail(err) }
			reporter.onTestDone(test.name, now() - startTime)
			setTimeout(runNextTest, 0)
		})
	}
}
function fail(err) {
	run.failed = true
	run.reporter.onTestFail(run.currentTest.name, err)
	throw err
}

var isTouch
try { document.createEvent("TouchEvent"); isTouch = ('ontouchstart' in window) }
catch (e) { isTouch = false }

// Assertion utils
function is(a, b) {
	var success = (arguments.length == 1 ? !!a : objectIdentical(a, b))
	if (success) { return }
	fail('"is" failed')
}

// Dom utils
function tap(selector, callback) {
	waitFor(selector, function() {
		var events = isTouch ? [$.Event('touchstart'), $.Event('touchend')] : [$.Event('mousedown'), $.Event('mouseup'), $.Event('click')]
		var $el = $(selector)
		events.forEach(function($event) { $el.trigger($event) })
		callback && callback()
	})
}
function count(selector, callback) {
	waitFor(selector, function() {
		callback($(selector).length)
	})
}
function waitFor(selector, callback) {
	check()
	function check() {
		var $result = $(selector)
		if (!$result) { setTimeout(check, 50) }
		callback($result)
	}
}

// Misc
/*	Original script title: "Object.identical.js"; version 1.12
	Copyright (c) 2011, Chris O'Brien, prettycode.org
	http://github.com/prettycode/Object.identical.js

	Permission is hereby granted for unrestricted use, modification, and redistribution of this
	script, only under the condition that this code comment is kept wholly complete, appearing
	directly above the script's code body, in all original or modified non-minified representations
*/
function objectIdentical(a, b) {
	function sort(object) {
		if (typeof object !== "object" || object === null) { return object }
		var result = []
		Object.keys(object).sort().forEach(function(key) {
			result.push({ key:key, value:sort(object[key]) })
		})
		return result
	}
	return JSON.stringify(sort(a)) === JSON.stringify(sort(b))
}
