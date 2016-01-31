var {test, assert, await} = require('../src/tinytest')

test('foo bar', function() {
	var greeting = await(greetAfter('Joe', 25))
	assert(greeting == 'Hi Joe!')
})

function greetAfter(str, duration) {
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve('Hi '+str+'!')
		}, duration)
	})
}
