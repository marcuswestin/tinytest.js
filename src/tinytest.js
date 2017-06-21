var C = require('./color')

var tinytest = module.exports = {
	runTests: runTests,
	test: test,
	assert: assert,
	print: print,
	noConflict: noConflict,
	hijackConsoleLog: hijackConsoleLog
}

function runTests(_opts) {
	assign(opts, _opts)
	runner.t0 = new Date()
	runner._runNextTest()
}

function assign(obj, props1, props2, etc) {
	if (!obj) { obj = {} }
	for (var i=1; i<arguments.length; i++) {
		var props = arguments[i]
		for (var key in props) {
			if (props.hasOwnProperty(key)) {
				obj[key] = props[key]
			}
		}
	}
	return obj
}

test.group = function(groupName, fn) {
	var resetGroupName = runner.currentGroup
	runner.currentGroup = (runner.currentGroup ? runner.currentGroup + ' - ' : '') + groupName
	runner.skipGroupStack.push(_shouldSkipCurrentGroup())
	fn()
	runner.skipGroupStack.pop()
	runner.currentGroup = resetGroupName
}

test.skip = function(message) {
	if (runner.current) {
		runner.skipCurrentTest = true
		
	} else if (runner.currentGroup) {
		runner.skipGroupStack[runner.skipGroupStack.length - 1] = true
		
	} else {
		throw new Error('test.skip() called outside of test and group. ("'+message+'")')
	}
}

function _shouldSkipCurrentGroup() {
	return runner.skipGroupStack[runner.skipGroupStack.length - 1]
}

function test(name, fn) {
	if (_shouldSkipCurrentGroup()) {
		runner.tests.push({ name:runner.currentGroup+' - '+name, shouldSkip:true })
		
	} else {
		runner.tests.push({ name:runner.currentGroup+' - '+name, fn:fn })		
	}
}

function assert(ok, msg1, msg2, etc) {
	if (!ok) {
		var msg = Array.prototype.slice.call(arguments, 1).join(' ')
		var text = ('assert failed' + (msg ? ': ' + msg : ''))
		print(C.red(text))
		debugger
		throw new Error(text)
	}
}

function print() {
	// First, print into browser DOM
	if (isBrowser) {
		if (!opts.outputEl) {
			opts.outputEl = document.createElement('div')
			assign(opts.outputEl.style, {
				fontFamily: 'monaco,sans-serif',
				fontSize: '12px',
				padding: '10px',
				background: 'black',
				color: 'white',
				position: 'absolute',
				top: '0px',
				left: '0px'
			})
			document.body.appendChild(opts.outputEl)
		}
		
		var args = Array.prototype.slice.call(arguments, 0)
		for (var i = 0; i<args.length; i++) {
			if (args[i] === undefined) {
				args[i] = 'undefined'
			}
			if (typeof args[i] != 'string') {
				args[i] = JSON.stringify(args[i])
			}
			args[i] = args[i].replace(/\n/g, '<br/>')
		}
		opts.outputEl.appendChild(document.createElement('div')).innerHTML = args.join(' ')
		
		if (!runner.hasFailedTest) {
			document.documentElement.scrollTop = document.body.scrollTop = 99999999			
		}
		
	} else {
		log.apply(this, arguments)
	}
}

function hijackConsoleLog() {
	console.log = function() {
		var args = Array.prototype.slice.call(arguments)
		args.unshift(C.grey('console.log():'))
		print.apply(this, args)
	}
}

var global = (function() { return this })();

if (!global.console) {
	console = {}
	hijackConsoleLog()
}
log.consoleLog = console.log
function log() {
	log.consoleLog.apply(console, arguments)
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

var opts = {
	failFast: false,
	outputEl: null,
	maxDuration: 750
}
	

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

// Set up global error handling
///////////////////////////////
if (isBrowser) {
	if (window.addEventListener) {
		window.addEventListener('error', function (e) {
		    runner._onTestDone(e.error ? e.error : e)
		}, false)		
	}
	var oldOnError = (window.onerror || function() {})
	window.onError = function(msg, url, line) {
		runner._onTestDone(new Error(msg+' ('+url+':'+line+')'))
		return oldOnError.apply(this, arguments)
	}
	
} else {
	process.on('uncaughtException', function (e) {
		runner._onTestDone(e.error ? e.error : e)
	})
}

// Test runner
//////////////

var runner = {
	currentGroup: '',
	skipGroupStack: [],
	tests: [],
	failedTests: [],
	skippedTests: [],
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
		if (runner.current.shouldSkip) {
			runner.current.skipped = true
			print(C.grey('Skip: '+runner.current.name))
			runner._runNextTest()
			return
		}
		
		print(C.grey('Run: '+runner.current.name))
		runner.current.t0 = new Date()
		runner.failTimeout = setTimeout(function() {
			runner._onTestDone('Test timed out')
		}, opts.maxDuration)
		
		runner._runTest(runner.current.fn)
	},
	
	_runTest: function(testFn) {
		try {
			if (runner.current.fn.length == 1) {
				runner.current.fn(function(err) {
					runner._onTestDone(err)
				})

			} else {
				var promise = runner.current.fn()
				if (promise) {
					promise.then(runner._onTestDone, runner._onTestDone)

				} else {
					runner._onTestDone()
				}
			}

		} catch(err) {
			runner._onTestDone(err)
		}
	},
	
	_onTestDone: function(err) {
		if (!runner.current) {
			print(C.red('Error during tests setup:'), '\n', this._errorMessage(err))
			_exit(1)
			return
		}
		clearTimeout(runner.failTimeout)
		var duration = new Date() - runner.current.t0
		if (runner.skipCurrentTest) {
			runner.current.skipped = true
			
		} else if (err) {
			assert(!runner.current.result)
			var message = this._errorMessage(err)
			runner.current.result = false
			runner.current.message = message
			runner.current.duration = duration
			print(C.red('Fail ' + duration+'ms'), '\n', message)
			runner.hasFailedTest = true
			if (opts.failFast) {
				runner._finish()
				return
			}
			
		} else {
			runner.current.result = true
			runner.current.duration = duration
			var durColour = (duration < 50 ? C.green : duration < 350 ? C.yellow : C.red)
			print(C.green('Pass'), durColour(duration+'ms'))
		}
		
		runner.skipCurrentTest = false
		nextTick(runner._runNextTest)
	},
	
	_errorMessage: function(err) {
		if (!err) {
			return null
		} else if (err.stack) {
			return err.stack
		} else if (err.message) {
			return err.message
		} else {
			return err.toString()
		}
	},
	
	_finish: function() {
		runner.duration = new Date().getTime() - runner.t0
		var numMissed = (runner.tests.length - runner.testIndex)

		for (var i = 0; i < runner.tests.length; i++) {
			var test = runner.tests[i]
			if (test.skipped) {
				runner.skippedTests.push(test)
				
			} else if (!test.result) {
				runner.failedTests.push(test)
			}
		}
		
		if (numMissed) {
			print(C.yellow('Exited without running '+numMissed+' tests'))
		}
		if (runner.failedTests.length) {
			print(C.red(runner.failedTests.length + ' tests failed'))
		}
		if (runner.skippedTests.length) {
			print(C.yellow(runner.skippedTests.length + ' tests skipped'))
		}
		if (runner.failedTests.length) {
			_exit(1)
		} else if (runner.tests.length == 0) {
			print(C.yellow('No tests'))
			_exit(1)
		} else if (runner.tests.length == runner.skippedTests.length) {
			print(C.yellow('All tests skipped, no tests passed'))
			_exit(0)
		} else {
			var numPassed = runner.tests.length - runner.skippedTests.length - runner.failedTests.length
			print(C.green('All done!'), numPassed, 'tests passed.')
			_exit(0)
		}
	}
}

function _exit(exitCode) {
	_reportGlobalTests()

	if (opts.onDone) {
		opts.onDone(exitCode)
	} else if (global.process && global.process.exit) {
		process.exit(exitCode)
	}
}

function _reportGlobalTests() {
	// Report global test results
	// https://wiki.saucelabs.com/display/DOCS/Reporting+JavaScript+Unit+Test+Results+to+Sauce+Labs+Using+a+Custom+Framework
	// window.global_test_results = { passed:0, failed:1, total:1, duration:0,
	// 	tests:[{ name:'test', result:false, message:'failed', duration:0 }] }

	var numTests = runner.tests.length
	var numFailed = runner.failedTests.length
	var numSkipped = runner.skippedTests.length
	var numPassed = numTests - numFailed - numSkipped
	var tests = []
	for (var i=0; i<runner.tests.length; i++) {
		var test = runner.tests[i]
		if (test.skipped || test.result) {
			// skip it - saucelabs overloads on too many tests reported :/
			continue
		}
		tests.push({
			name: test.name || '',
			result: !!test.result,
			message: test.message || '',
			duration: test.duration || 0
		})
	}
	global.global_test_results = {
		total: numTests,
		failed: numFailed,
		passed: numPassed,
		duration: runner.duration,
		tests: tests
	}
}
