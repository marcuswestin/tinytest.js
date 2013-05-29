var tinyTest = module.exports = {
	// Setup & Run
	makeScenario:makeScenario,
	then:then,
	run:run,
	// Assertion utils
	is:is,
	has:has,
	check:check,
	fail:fail,
	// DOM utils
	tap:tap,
	count:count,
	waitFor:waitFor,
	// defaults
	timeout: 250
}

// Setup
var suites = {}
var scenarioStack = [suites]
function makeScenario(name, fn) {
	var thunk = {}
	scenarioStack[0][name] = thunk
	scenarioStack.unshift(thunk)
	fn()
	scenarioStack.shift()
}
function then(testName, fn) {
	if (fn.length != 1) { throw new Error("Test function "+testName+" must take a `done` function argument") }
	scenarioStack[0][testName] = fn
}

// Run
function now() { return new Date().getTime() }
function run(reporter) {
	if (!reporter) { reporter = defaultReporter }
	for (var key in defaultReporter) {
		reporter[key] = reporter[key] || defaultReporter[key]
	}
	
	run.failed = false
	run.reporter = reporter
	
	var tests = []
	descend([], suites)
	function descend(stack, thunk) {
		for (var name in thunk) {
			if (typeof thunk[name] == 'function') {
				tests.push({ stack:stack.concat(name), fn:thunk[name] })
			} else {
				descend(stack.concat(name), thunk[name])
			}
		}
	}
	
	var totalStartTime = now()
	runNextTest()
	function runNextTest() {
		if (run.failed) { return }
		if (!tests.length) { return run.reporter.onAllDone(now() - totalStartTime) }
		var test = run.currentTest = tests.shift()
		run.reporter.onTestStart(test.stack)
		var startTime = now()
		test.didFinish = false
		test.timeout = tinyTest.timeout
		test.fn.call(test, function(err) {
			test.didFinish = true
			clearTimeout(test.timer)
			check(err)
			run.reporter.onTestDone(test.stack, now() - startTime)
			setTimeout(runNextTest, 0)
		})
		if (test.didFinish) { return }
		if (!test.timeout || test.timeout <= 0) { return }
		test.timer = setTimeout(function() {
			fail(new Error("Timed out after "+test.timeout+"ms"))
		}, test.timeout)
	}
}
function fail(err) {
	if (typeof err == 'string') { err = new Error(err) }
	run.failed = true
	run.reporter.onTestFail(run.currentTest.stack, err)
	throw err
}

var isTouch
try { document.createEvent("TouchEvent"); isTouch = ('ontouchstart' in window) }
catch (e) { isTouch = false }

// Assertion utils
function check(err) { if (err) { fail(err) } }
function is(a, b) {
	var success = (arguments.length == 1 ? !!a : objectIdentical(a, b))
	if (success) { return a }
	fail('"is" failed: '+(a+ ' '+b))
}
function has(obj, props) {
	if (obj == null) { return fail('"has" failed with null object') }
	for (var key in props) {
		if (objectIdentical(obj[key], props[key])) { continue }
		fail('"has" failed on "'+key+'": '+JSON.stringify(obj[key])+' '+JSON.stringify(props[key])+'')
	}
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
	checkNow()
	function checkNow() {
		var $result = $(selector)
		if (!$result.length) { return setTimeout(checkNow, 50) }
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

var defaultReporter = {
	onTestStart:function(stack) { console.log("Test:", stack.join(' | ')) },
	onTestDone: function(stack, duration) { console.log('Done: ', (duration+'ms')) },
	onTestFail: function(stack, err) { console.error("ERROR", stack.join(' | '), err) },
	onAllDone: function(duration) {
		console.log("All Done:", (duration+'ms'))
		process.exit(0)
	}
}
