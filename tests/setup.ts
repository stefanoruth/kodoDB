import { Mock } from 'ts-mockery'

// The argument to configure can be either jest, jasmine, noop, or an object that implements the exported SpyAdapater interface
Mock.configure('jest')
