var colour = require('colour')

var tinytest = module.exports = {
	runTests: runTests,
	test: test,
	assert: assert,
	print: print,
	noConflict: noConflict
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
		debugger
		throw new Error('assert failed' + (msg ? ': ' + msg : ''))
	}
}

function print() {
	var args = Array.prototype.slice.call(arguments, 0)
	
	// First, print into browser DOM
	if (isBrowser) {
		if (!opts.outputEl) {
			opts.outputEl = document.createElement('div')
			opts.outputEl.style = 'font-family:monaco,sans-serif; font-size:12px; padding:10px; background-color:black; color:white;'
			document.body.appendChild(opts.outputEl)
		}
		var messageHTML = args.join(' ').replace(/\n/g, '<br/>')
		opts.outputEl.appendChild(document.createElement('div')).innerHTML = messageHTML
		
		// Remove HTML from args for console.log
		for (var key in args) {
			args[key] = colour.strip(args[key])
		}
	}
	
	// Then, print to console
	console.log.apply(console, args)
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
	maxDuration: 150
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
			print(grey('Skip: '+runner.current.name))
			runner._runNextTest()
			return
		}
		
		print(grey('Run: '+runner.current.name))
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
					promise.then(function() {
						runner._onTestDone(null)
					}).catch(function(err) {
						runner._onTestDone(err)
					})

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
			print(red('Error during tests setup:'), '\n', err.stack ? err.stack : err.toString())
			_exit(1)
			return
		}
		clearTimeout(runner.failTimeout)
		var duration = new Date() - runner.current.t0
		if (runner.skipCurrentTest) {
			runner.current.skipped = true
			
		} else if (err) {
			assert(!runner.current.result)
			var message = (err.stack ? err.stack : err.toString())
			runner.current.result = false
			runner.current.message = message
			runner.current.duration = duration
			print(red('Fail ' + duration+'ms'), '\n', message)
			if (opts.failFast) {
				runner._finish()
				return
			}
			
		} else {
			runner.current.result = true
			runner.current.duration = duration
			var durColour = (duration < 50 ? green : duration < 350 ? yellow : red)
			print(green('Pass'), durColour(duration+'ms'))
		}
		
		runner.skipCurrentTest = false
		nextTick(runner._runNextTest)
	},
	
	_finish: function() {
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
			print(yellow('Exited without running '+numMissed+' tests'))
		}
		if (runner.failedTests.length) {
			print(red(runner.failedTests.length + ' tests failed'))
		}
		if (runner.skippedTests.length) {
			print(yellow(runner.skippedTests.length + ' tests skipped'))
		}
		if (runner.failedTests.length) {
			_exit(1)
		} else if (runner.tests.length == 0) {
			print(yellow('No tests'))
			_exit(1)
		} else {
			print(green('All done!'), runner.tests.length, 'tests passed.')
			_exit(0)
		}
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
	var numTests = runner.tests.length
	var numFailed = numFailed
	var numPassed = numTests - numPassed
	global.global_test_results = {
		total: numTests,
		failed: numFailed,
		passed: numPassed,
		duration: new Date() - runner.t0,
		tests: runner.tests
	}

	if (global.process && global.process.exit) {
		process.exit(exitCode)
	}
}
