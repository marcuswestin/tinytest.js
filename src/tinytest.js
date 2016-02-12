require('colors')
var defaults = require('lodash').defaults
// global.Promise = require('promise/lib/es6-extensions')

var async
var await
var nextTick = function(fn) { setTimeout(fn, 0) }

if (typeof(process) !== 'undefined' && process.title === 'node' && typeof(await) == 'undefined') {
	// avoid browserify bundling with toString()
	async = require('asyncawait/async'.toString())
	await = require('asyncawait/await'.toString())
	nextTick = process.nextTick
}

module.exports = {
	test: test,
	check: check,
	checkErr: checkErr,
	print: print,
	assert: assert,
	await: await,
	async: async,
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
	print(('Run test: '+currentTest.name).brightWhite)
	var opts = currentTest.opts
	var t0 = new Date()
	var failTimeout = setTimeout(function() { fail('Test timed out') }, opts.timeout)
	if (currentTest.fn.length == 0) {
		var asyncTestFn = async(currentTest.fn)
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
		if (failErr) { throw failErr }
		var durStr = duration+'ms'
		durStr = (duration < 50 ? durStr.green
			: duration < 500 ? durStr.yellow
			: durStr.red)
		print('Pass'.green, durStr)
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
		print('All done!'.green, allTests.length, 'tests passed.')
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
		opts: defaults(opts || {}, {
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

function fail(message) {
	print('Test fail:'.red, currentTest.name+' - message:', message, '\n', new Error().stack)
	failedTests.push(currentTest)
	nextTick(_runNextTest)
	throw new Error(['Test fail:'.red, currentTest.name+' - message:', message].join(' '))
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
