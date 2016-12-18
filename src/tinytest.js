var colour = require('colour')

var tinytest = module.exports = {
	runTests: runTests,
	test: test,
	assert: assert,
	print: print,
	noConflict: noConflict,
	
	outputEl: null,
	maxDuration: 150
}

function runTests() {
	runner.t0 = new Date()
	runner._runNextTest()
}

function test(name, fn) {
	runner.tests.push({ name:name, fn:fn })
}

function assert(ok, msg) {
	if (!ok) {
		throw new Error('assert failed' + (msg ? ': ' + msg : ''))
	}
}

function print() {
	var args = Array.prototype.slice.call(arguments, 0)
	var msg = args.join(' ')
	console.log.apply(console, arguments)
	if (isBrowser) {
		if (!tinytest.outputEl) {
			tinytest.outputEl = document.createElement('div')
			tinytest.outputEl.style = 'font-family:monaco,sans-serif; font-size:12px; padding:10px; background-color:black; color:white;'
			document.body.appendChild(tinytest.outputEl)
		}
		tinytest.outputEl.appendChild(document.createElement('div')).innerHTML = msg.replace(/\n/g, '<br/>')
	}
}

function noConflict() {
	for (var key in globals) {
		if (key != '_old' && globals.hasOwnProperty(key)) {
			this[key] = globals._old[key]
		}
	}
}
var globals = {
	_old: {},
	assert: assert,
	test: test,
	print: print
}

var global = (function() { return this })();
for (var key in globals) {
	if (key != '_old' && globals.hasOwnProperty(key)) {
		globals._old[key] = global[key]
		global[key] = globals[key]
	}
}

// Internal
///////////

var nextTick = function(fn) { setTimeout(fn, 0) }

var isBrowser = (typeof global.window != 'undefined')
if (isBrowser) {
	colour.mode = 'browser'
	window.addEventListener('error', function (e) {
	    runner._onTestDone(e.error ? e.error : e)
	})
	var oldOnError = (window.onerror || function() {})
	window.onError = function(msg, url, line) {
		runner._onTestDone(new Error(msg+' ('+url+':'+line+')'))
		return oldOnError.apply(this, arguments)
	}
} else {
	colour.mode = 'console'
	process.on('uncaughtException', function (e) {
		runner._onTestDone(e.error ? e.error : e)
	})
}

colour.uninstall()
var grey = colour.grey
var green = colour.green
var yellow = colour.yellow
var red = colour.red

var runner = {
	tests: [],
	failedTests: [],
	current: null,
	testIndex: -1,
	t0: null,
	
	_runNextTest: function() {
		runner.testIndex += 1
		if (runner.testIndex == runner.tests.length) {
			runner._finish()
			return
		}
		
		runner.current = runner.tests[runner.testIndex]
		print(grey('Run: '+runner.current.name))
		runner.current.t0 = new Date()
		runner.failTimeout = setTimeout(function() {
			runner._onTestDone('Test timed out')
		}, tinytest.maxDuration)
		if (runner.current.fn.length == 1) {
			runner.current.fn(function(err) {
				runner._onTestDone(err)
			})
			return
		}
		
		var res = runner.current.fn()
		if (res) {
			res.then(function() {
				runner._onTestDone(null)
			}).catch(function(err) {
				runner._onTestDone(err)
			})
			return
		}
		
		runner._onTestDone(null)
	},
	
	_onTestDone: function(err) {
		if (!runner.current) {
			print(red('Error during tests setup:'), '\n', err.stack ? err.stack : err.toString())
			_exit(1)
		}
		clearTimeout(runner.failTimeout)
		var duration = new Date() - runner.current.t0
		if (err) {
			assert(!runner.current.result)
			var message = (err.stack ? err.stack : err.toString())
			runner.current.result = false
			runner.current.message = message
			runner.current.duration = duration
			print(red('Fail ' + duration+'ms'), '\n', message)
		} else {
			runner.current.result = true
			runner.current.duration = duration
			var durColour = (duration < 50 ? green : duration < 350 ? yellow : red)
			print(green('Pass'), durColour(duration+'ms'))
		}
		nextTick(runner._runNextTest)
	},
	
	_finish: function() {
		for (var i = 0; i < runner.tests.length; i++) {
			if (!runner.tests[i].result) {
				runner.failedTests.push(runner.tests[i])
			}
		}
		
		if (runner.failedTests.length) {
			print(red(runner.failedTests.length + ' tests failed:'))
			for (var i = 0; i < runner.failedTests.length; i++) {
				print(red('\t'+runner.failedTests[i].name))
			}
		} else if (runner.tests.length == 0) {
			print(yellow('No tests found.'))
		} else {
			print(green('All done!'), runner.tests.length, 'tests passed.')
		}
		
		_exit(0)
	}
}

function _exit(exitCode) {
	// Report sauce labs test results
	// https://wiki.saucelabs.com/display/DOCS/Reporting+JavaScript+Unit+Test+Results+to+Sauce+Labs+Using+a+Custom+Framework
	// window.global_test_results = { passed:0, failed:1, total:1, duration:0,
	// 	tests:[{ name:'test', result:false, message:'failed', duration:0 }] }
	for (var i = 0; i < runner.tests.length; i++) {
		delete runner.tests[i].fn
		delete runner.tests[i].t0
	}
	global.global_test_results = {
		total: runner.tests.length,
		failed: runner.failedTests.length,
		passed: runner.tests.length - runner.failedTests.length,
		duration: new Date() - runner.t0,
		tests: runner.tests
	}

	if (global.process && global.process.exit) {
		process.exit(exitCode)
	}
}
