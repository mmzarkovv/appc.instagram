const sinon = require('sinon')
const test = require('tap').test
const Handler = require('./../../../lib/utility/cehandler/handler')
const mockery = require('mockery')
const fs = require('fs')
const utils = require('./utils.js')

module.exports = function testGetMethods(methodName) {
  //Mock the requester module in the methods under test
  mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false
  });

  var handlerConstructorStub = sinon.stub(Handler, 'constructor')
  mockery.registerMock('../lib/utility/cehandler/handler', handlerConstructorStub)
  
  const method = require('../../../sdk/' + methodName)
  var params = require(process.cwd() + '/conf/config.js')[methodName]
  
  const validOptions = {
    path: params.path,
    method: params.method,
    parameters: params.parameters.filter(param => param.required == true)
  }

  const validUserParams = {}
  validOptions.parameters.forEach(function (param) {
    validUserParams[param.name] = param["x-sample"] ? param["x-sample"] : utils.getType(param)
  });

  test('Generated function should require config.js file', (t) => {
    const path = __dirname.replace('test/unit/default', 'conf/config.js')
    var file
    if (fs.statSync(path)) {
      try {
        file = require(path)
      } catch (E) {
        console.log(E)
        t.end()
      }
    }

    t.ok(file, 'should not be empty')
    t.ok(file[methodName], 'should have the same property as the path name')
    t.ok(file[methodName].uri, 'should have property uri')
    t.equal(typeof file[methodName].uri, 'string')
    t.ok(file[methodName].path, 'should have property path')
    t.equal(typeof file[methodName].path, 'string')
    t.ok(file[methodName].method, 'should have property method')
    t.equal(typeof file[methodName].method, 'string')
    t.ok(file[methodName].response, 'should have property response')
    t.equal(typeof file[methodName].response, 'object')
    t.ok(file[methodName].parameters, 'should have property parameters')
    t.equal(typeof file[methodName].parameters, 'object')
    t.ok(file[methodName].operationId)
    t.equal(typeof file[methodName].operationId, 'string')
    t.equal(typeof file, 'object', 'Should export an object')

    t.end()
  })

  test('Requester module should create and validate an instance if valid options are passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()

    const responseData = {
      resposeData: { body: 'Success' },
      resposeHeaders: { 'content-type': 'application/json' }
    }

    handlerConstructorStub.returns({
      options: validOptions,
      payload: validUserParams,
      makeRequest: function (callback) {
        callback(null, responseData)
      }
    })

    method.call({}, validUserParams, cbSpy, validOptions)

    t.ok(handlerConstructorStub.calledOnce)
    t.ok(cbSpy.calledOnce)
    t.ok(cbSpy.calledWith(null, responseData), 'The callback should be called with correct data')
    sandbox.restore()
    handlerConstructorStub.resetBehavior()
    handlerConstructorStub.reset()
    t.end()
  })

  test('Function should return proper response format', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()
    const responseData = {
      resposeData: { body: 'Success' },
      resposeHeaders: { 'content-type': 'application/json' }
    }

    handlerConstructorStub.returns({
      options: validOptions,
      payload: validUserParams,
      makeRequest: function (callback) {
        callback(null, responseData)
      }
    })

    t.doesNotThrow(function () {
      method.call({}, validUserParams, cbSpy, validOptions)
    }, 'Requester constructor should not throw')

    t.ok(handlerConstructorStub.calledOnce)
    t.ok(cbSpy.calledOnce)
    t.ok(cbSpy.calledWith(null, responseData), 'The callback should be called with correct data')
    
    const response = cbSpy.args[0][1]
    t.equal(typeof response, 'object')
    t.ok(Object.keys(response).length > 0)
    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Request module should throw if required parameters are not passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()
    const invalidUserParams = {
      name: 'Test',
      age: 34
    }

    handlerConstructorStub.throws('Options method and options path should be provided !')

    t.throws(function () {
      method.call({}, invalidUserParams, cbSpy, validOptions)
    }, 'Requester constructor should throw when invalid data is passed')

    t.ok(handlerConstructorStub.calledOnce)

    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Request module should throw if no options are passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()

    handlerConstructorStub.throws(`Handler swagger options should be provided and of type 'object`)

    t.throw(function () {
      method.call({}, validUserParams, cbSpy)
    }, 'Requester should throw if no options are passed')

    t.ok(handlerConstructorStub.calledOnce)

    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Request module should throw if options are not of type object', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()

    handlerConstructorStub.throws(`Handler swagger options should be provided and of type 'object'`)

    t.throw(function () {
      method.call({}, validUserParams, cbSpy, 'options')
    }, 'Requester should throw if no options are passed')

    t.ok(handlerConstructorStub.calledOnce)

    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Request module should not throw if no parameters are passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()
    const error = {
      code: 400,
      message: 'Error message'
    }

    handlerConstructorStub.callsFake((validOptions) => {
      return {
        options: validOptions,
        payload: undefined,
        makeRequest: function (callback) {
          callback(error)
        }
      }
    })

    t.doesNotThrow(function () {
      method.call({}, undefined, cbSpy, validOptions)
    }, 'Should not throw if no parameters are passed')

    t.ok(handlerConstructorStub.calledOnce)
    t.ok(cbSpy.calledOnce)
    t.ok(cbSpy.calledWith(error))

    const resultErr = cbSpy.args[0][0]
    t.equal(typeof resultErr, 'object')
    t.ok(resultErr.code)
    t.equal(resultErr.code, 400)
    t.ok(resultErr.message)
    
    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Functions should return 400 if incorrect parameters are passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()
    const error = {
      code: 400,
      message: 'Error message'
    }

    const invalidParameters = {
      'x-vendor-invalid': 'invalid Base URL',
      'john': 'smith',
      'age': 23
    }

    handlerConstructorStub.callsFake((validOptions, invalidParameters) => {
      return {
        options: validOptions,
        payload: invalidParameters,
        makeRequest: function (callback) {
          callback(error)
        }
      }
    })

    t.doesNotThrow(function () {
      method.call({}, invalidParameters, cbSpy, validOptions)
    }, 'Function should not throw')

    t.ok(handlerConstructorStub.calledOnce)
    t.ok(cbSpy.calledOnce)
    t.ok(cbSpy.calledWith(error))
    
    const resultErr = cbSpy.args[0][0]
    t.equal(typeof resultErr, 'object')
    t.ok(resultErr.code)
    t.equal(resultErr.code, 400)
    t.ok(resultErr.message) 

    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Function should return 401 if no auth param is passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()
    const error = {
      code: 401,
      message: 'Error message'
    }

    const parameters = {
      path: 'path',
      method: 'method'
    }

    handlerConstructorStub.callsFake((validOptions) => {
      return {
        options: validOptions,
        payload: undefined,
        makeRequest: function (callback) {
          callback(error)
        }
      }
    })

    t.doesNotThrow(function () {
      method.call({}, undefined, cbSpy, validOptions)
    }, 'Should not throw if no parameters are passed')

    t.ok(handlerConstructorStub.calledOnce)
    t.ok(cbSpy.calledWith(error))

    const resultErr = cbSpy.args[0][0]
    t.equal(typeof resultErr, 'object')
    t.ok(resultErr.code)
    t.equal(resultErr.code, 401)
    t.ok(resultErr.message)

    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  test('Function should return 404 if invalid path params are passed', (t) => {
    const sandbox = sinon.sandbox.create()
    const cbSpy = sandbox.spy()
    const error = {
      code: 404,
      message: 'Error message'
    }

    const invalidOptions = {
      path: validOptions.path,
      method: validOptions.method,
      parameters: [
        {
          'in': 'home',
          name: 'x-vendor-authorization',
          description: 'The vendor authorization token',
          type: 'string',
          required: true
        },
        {
          'in': 'living room',
          name: 'x-vendor-serverAddress',
          required: true
        },
        {
          'in': 'array',
          name: 'fields',
          type: 'book'
        }
      ]
    }

    const parameters = {
      'x-vendor-serverAddress': 'Base URL',
      'x-vendor-authorization': 'Auth token',
      fields: 'web_id,visibility,name'
    }

    handlerConstructorStub.callsFake((validOptions) => {
      return {
        options: validOptions,
        payload: undefined,
        makeRequest: function (callback) {
          callback(error)
        }
      }
    })

    t.doesNotThrow(function () {
      method.call({}, parameters, cbSpy, invalidOptions)
    }, 'Function should not throw')

    t.ok(handlerConstructorStub.calledOnce)
    t.ok(cbSpy.called)
    t.ok(cbSpy.calledWith(error))

    const resultErr = cbSpy.args[0][0]
    t.equal(typeof resultErr, 'object')
    t.ok(resultErr.code)
    t.equal(resultErr.code, 404)
    t.ok(resultErr.message)

    handlerConstructorStub.reset()
    sandbox.restore()
    t.end()
  })

  handlerConstructorStub.restore()
  mockery.deregisterAll()
  mockery.disable()
}
