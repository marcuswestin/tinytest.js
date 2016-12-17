require('../src/tinytest')

test('sync test should pass', function() {
	assert(true)
})

test('async promise test should pass', function() {
	return greetAfter('Joe', 25).then(function(greeting) {
		assert(greeting == 'Hi Joe!')
	})
})

test('async callback test should pass', function(done) {
	greetAfter('Joe', 25).then(function(greeting) {
		assert(greeting == 'Hi Joe!')
		done()
	})
})

test('sync test should fail', function() {
	assert(false)
})

test('async promise test should fail', function() {
	return greetAfter('Joe', 25).then(function(greeting) {
		assert(greeting != 'Hi Joe!')
	})
})

test('async callback test should fail', function(done) {
	greetAfter('BadJoe', 25).then(function(greeting) {
		if (greeting != 'Hi Joe!') {
			done(new Error('Greeting was not Hi Joe! ('+greeting+')'))
		} else {
			done()
		}
	})
})


function greetAfter(str, duration) {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve('Hi '+str+'!')
		}, duration)
	})
}
