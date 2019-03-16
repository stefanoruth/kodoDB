import {
	ConnectionException,
	JsonEncodingException,
	MassAssignmentException,
	ModelNotFoundException,
	QueryException,
	RelationNotFoundException,
} from '../src/Exceptions'

describe('Exceptions', () => {
	test('ConnectionException', () => {
		expect(new ConnectionException()).toBeInstanceOf(Error)
	})

	test('JsonEncodingException', () => {
		expect(new JsonEncodingException()).toBeInstanceOf(Error)
	})

	test('MassAssignmentException', () => {
		expect(new MassAssignmentException()).toBeInstanceOf(Error)
	})

	test('ModelNotFoundException', () => {
		expect(new ModelNotFoundException()).toBeInstanceOf(Error)
	})

	test('RelationNotFoundException', () => {
		expect(new RelationNotFoundException()).toBeInstanceOf(Error)
	})

	test('QueryException', () => {
		const err = new QueryException('SELECT * FROM test', [1], new Error())

		expect(err).toBeInstanceOf(Error)
		expect(err.getSql()).toBe('SELECT * FROM test')
		expect(err.getBindings()).toEqual([1])
	})
})
