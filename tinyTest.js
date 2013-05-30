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
	waitForEl:waitForEl,
	// defaults
	timeout: 250
}

// Setup
var allTests = []
var currentScenarioName
function makeScenario(scenarioName, fn) {
	currentScenarioName = scenarioName
	fn()
}
function then(testName, fn) {
	if (fn.length != 1) { throw new Error("Test function "+testName+" must take a `done` function argument") }
	allTests.push({ name:testName, scenario:currentScenarioName, fn:fn })
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
	
	var totalTime = 0
	var scenarioTime = 0
	runNextTest()
	function runNextTest() {
		if (run.failed) { return }
		if (!allTests.length) { return run.reporter.onAllDone(totalTime) }
		var test = allTests.shift()
		
		if (run.currentScenario != test.scenario) {
			if (run.currentScenario) {
				run.reporter.onScenarioDone(run.currentScenario, scenarioTime)
			}
			scenarioTime = 0
			run.reporter.onScenarioStart(test.scenario)
		}
		
		run.currentTest = test
		run.currentScenario = test.scenario
		run.reporter.onTestStart(test.name, test.scenario)
		
		var startTime = now()
		test.didFinish = false
		test.timeout = tinyTest.timeout
		test.fn.call(test, function(err) {
			test.didFinish = true
			clearTimeout(test.timer)
			check(err)
			var testDuration = now() - startTime
			run.reporter.onTestDone(test.name, testDuration, test.scenario)
			totalTime += testDuration
			scenarioTime += testDuration
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
	run.reporter.onTestFail(run.currentTest.scenario, run.currentTest.name, err)
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
	onScenarioStart:function(scenario) {
		console.log(('*** Scenario: '+scenario+' ***').black.bgWhite)
	},
	onTestStart:function(test) {
		console.log("*** Test:".white, test.white)
	},
	onTestDone: function(test, duration) {
		var durationStr = duration < 50 ? (duration+'ms').greenLight
			: duration < 200 ? (duration+'ms').yellowLight
			: (duration+'ms').redLight
		console.log('Test done:'.greenLight, durationStr)
	},
	onScenarioDone: function(scenario, duration) {
		console.log(('Scenario done: '+duration+'ms').green)
	},
	onTestFail: function(scenario, test, err) {
		console.error("Test FAIL".red, scenario.red, test.red, err)
	},
	onAllDone: function(duration) {
		console.log("\n*** All Done:".green, (duration+'ms').green)
		process.exit(0)
	}
}


;(function colorizeNode(){
	'use strict'
	var colors = {
		white:1, black:30, blue:34, pink:35, cyan:36,
		
		red:31, redLight:91,
		green:32, greenLight:92,
		yellow:33, yellowLight:93,
		gray:90, grayLight:37,
		
		bgRed:41, bgRedLight:101,
		bgGreen:42, bgGreenLight:102,
		bgYellow:43, bgYellowLight:103,
		bgBlue:44, bgLightBlue:104,
		bgPink:45, bgPinkLight:105,
		bgCyan:46, bgCyanLight:106,
		bgGray:100, bgGrayLight:47,
		bgWhite:107,
		
		underline:4, inverse:7
	}
	for (var colorName in colors) {
		addPrototypeProperty(colorName, colors[colorName])
	}
	
	function addPrototypeProperty(name, code) {
		var prefix = '\u001b['
		var reset = '\u001b[0m'
		if (String.prototype[name]) { return }
		Object.defineProperty(String.prototype, name, {
			get: function() { return prefix + code + 'm' + this + reset }
		})
	}
}())
