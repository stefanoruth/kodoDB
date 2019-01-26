import { Capsule } from '../src'

let capsule: Capsule

beforeAll(() => {
	capsule = new Capsule()
})

describe('kodo-db', () => {
	it('Capsule can set instance as global', () => {
		expect(Capsule.instance).not.toBeDefined()
		capsule.setAsGlobal()
		expect(Capsule.instance).toBeDefined()
	})
})
