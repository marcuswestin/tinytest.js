global.Promise = require('bluebird')
require('colors')
var _ = require('lodash')

// var async
// var await
var nextTick = function(fn) { setTimeout(fn, 0) }

// if (typeof(process) !== 'undefined' && process.title === 'node' && typeof(await) == 'undefined') {
// 	// avoid browserify bundling with toString()
// 	async = require('asyncawait/async'.toString())
// 	await = require('asyncawait/await'.toString())
// 	nextTick = process.nextTick
// }

module.exports = {
	test: test,
	check: check,
	checkErr: checkErr,
	print: print,
	assert: assert,
	fail: fail,
	// await: await,
	// async: async,
	nextTick: nextTick,
}

var allTests = []
var failedTests = []
var currentTest
var i = -1
nextTick(_runNextTest)

function _runNextTest() {
	i += 1
	if (i == allTests.length) {
		_finish()
		return
	}
	currentTest = allTests[i]
	var testStr = 'Run test: '+currentTest.name
	print(_.repeat('_', testStr.length).brightWhite)
	print(testStr.brightWhite)
	var opts = currentTest.opts
	var t0 = new Date()
	var failTimeout = setTimeout(function() { fail('Test timed out') }, opts.timeout)
	if (currentTest.fn.length == 0) {
		// var asyncTestFn = async(currentTest.fn)
		var asyncTestFn = currentTest.fn
		asyncTestFn().then(function() {
			_onTestDone(null)
		}).catch(function(failErr) {
			_onTestDone(failErr)
		})
	} else {
		currentTest.fn(function(err) {
			_onTestDone(err)
		})
	}
	
	function _onTestDone(failErr) {
		var duration = new Date() - t0
		clearTimeout(failTimeout)
		if (failErr) {
			fail(failErr.stack ? failErr.stack : failErr.toString())
		}
		var durStr = duration+'ms'
		durStr = (duration < 50 ? durStr.brightGreen
			: duration < 500 ? durStr.yellow
			: durStr.red)
		print('Pass'.brightGreen, durStr)
		process.nextTick(_runNextTest)
	}
}
function _finish() {
	if (failedTests.length) {
		print((failedTests.length + ' tests failed:').red)
		for (var i=0; i<failedTests.length; i++) {
			print(('\t'+failedTests[i].name).red)
		}
	} else {
		var doneStr = ['Done!', allTests.length, 'tests passed'].join(' ')
		print(_.repeat('_', doneStr.length).green)
		print(doneStr.green)
	}
	process.exit(0)
}


function test(name, opts, fn) {
	if (arguments.length == 2 && typeof opts == 'function') {
		fn = opts
		opts = undefined
	}
	allTests.push({
		name: name,
		fn: fn,
		opts: _.defaults(opts || {}, {
			timeout: 1000
		})
	})
}
function assert(ok, msg) {
	if (ok) { return }
	fail('assert failed' + (msg ? ': ' + msg : ''))
}
function check(truthy) {
	if (!truthy) {
		fail('Check failed')
	}
}
function checkErr(err) {
	if (err) {
		fail('checkErr failed: '+err.toString())
	}
}

var exitOnFail = true
function fail(message) {
	failedTests.push(currentTest)
	if (exitOnFail) {
		print('Test fail:'.red, currentTest.name+' - message:', message, '\n', _makeError().stack)
		_finish()
	} else {
		nextTick(_runNextTest)
		throw _makeError('\nTest failed:'.red, (currentTest.name).brightWhite, '\n', message.brightRed, '\n-----------'.red)
	}
}
function _makeError() {
	var args = [].slice.call(arguments)
	var err = new Error(args.join(' '))
	var lines = err.stack.split('\n')
	// Remove all tinytest.js mentions from top of stack trace
	var line0 = lines.shift()
	while (lines[0].match('tinytest.js')) {
		lines.shift()
	}
	lines.unshift(line0)
	err.stack = lines.join('\n')
	return err
}

function print() {
	console.log.apply(console, arguments)
}

function isGenerator(fn) {
    return fn && fn.constructor.name === 'GeneratorFunction';
}
function isPromise(obj) {
	// return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
	return obj && obj.constructor.name == 'Promise'
}
