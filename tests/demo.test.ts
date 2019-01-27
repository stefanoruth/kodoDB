import { Capsule } from '../src'

let capsuleObject: Capsule

beforeAll(() => {
	capsuleObject = new Capsule()
})

describe('kodo-db', () => {
	it('Capsule can set instance as global', () => {
		expect(Capsule.instance).not.toBeDefined()
		capsuleObject.setAsGlobal()
		expect(Capsule.instance).toBeDefined()
	})

	it.only('Can connect to mysql', () => {
		capsuleObject.setAsGlobal()

		expect(
			Capsule.table('users')
				.where('email', 'LIKE', 'stefano@example.com')
				.fist()
		).toEqual({
			email: 'stefano@example.com',
		})
	})
})
