var colour = require('colour')

var tinytest = module.exports = {
	print: print,
	assert: assert,
	test: test,
	noConflict: noConflict,

	outputEl: null,
	maxDuration: 150
}

var nextTick = function(fn) { setTimeout(fn, 0) }
var global = (function() { return this })();

function assert(ok, msg) {
	if (!ok) {
		throw new Error('assert failed' + (msg ? ': ' + msg : ''))
	}
}

function test(name, fn) {
	runner.tests.push({ name:name, fn:fn })
}

// Environment specifics
////////////////////////
var isBrowser = (typeof global.window != 'undefined')
if (isBrowser) {
	colour.mode = 'browser'
	window.addEventListener('error', function (err) {
	    runner._onTestDone(e)
	})
	var oldOnError = (window.onerror || function() {})
	window.onError = function(msg, url, line) {
		runner._onTestDone(new Error(msg+' ('+url+':'+line+')'))
		return oldOnError.apply(this, arguments)
	}
} else {
	colour.mode = 'console'
	process.on('uncaughtException', function (err) {
		runner._onTestDone(err)
	})
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

// Exposed globals and noConflict
/////////////////////////////////
var globals = {
	_old: {},
	assert: assert,
	test: test,
	print: print
}
function exposeGlobals() {
	for (var key in globals) {
		if (key != '_old' && globals.hasOwnProperty(key)) {
			globals._old[key] = global[key]
			this[key] = globals[key]
		}
	}
}
function noConflict() {
	for (var key in globals) {
		if (key != '_old' && globals.hasOwnProperty(key)) {
			this[key] = globals._old[key]
		}
	}
}

// Internal
///////////
colour.uninstall()
var grey = colour.grey
var green = colour.green
var yellow = colour.yellow
var red = colour.red

var runner = {
	tests: [],
	current: null,
	testIndex: -1,
	
	_runNextTest: function() {
		runner.testIndex += 1
		if (runner.testIndex == runner.tests.length) {
			runner._finish()
			return
		}
		
		runner.current = runner.tests[runner.testIndex]
		print(grey('Run: '+runner.current.name))
		runner.t0 = new Date()
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
		clearTimeout(runner.failTimeout)
		var duration = new Date() - runner.t0
		if (err) {
			if (!runner.current) {
				throw err
			}
			runner.current.failed = true
			print(red('Fail ' + duration+'ms'), '\n', err.stack ? err.stack : err.toString())
		} else {
			var durColour = (duration < 50 ? green : duration < 350 ? yellow : red)
			print(green('Pass'), durColour(duration+'ms'))
		}
		nextTick(runner._runNextTest)
	},
	
	_finish: function() {
		var failedTests = []
		for (var i = 0; i < runner.tests.length; i++) {
			if (runner.tests[i].failed) {
				failedTests.push(runner.tests[i])
			}
		}
		
		if (failedTests.length) {
			print(red(failedTests.length + ' tests failed:'))
			for (var i = 0; i < failedTests.length; i++) {
				print(red('\t'+failedTests[i].name))
			}
		} else {
			print(green('All done!'), runner.tests.length, 'tests passed.')
		}
		_exit(0)
	}
}

function _exit(exitCode) {
	if (global.process && global.process.exit) {
		process.exit(0)		
	}
}

// Start
exposeGlobals()
nextTick(runner._runNextTest)
