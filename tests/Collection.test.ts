import { Collection } from '../src/Utils/Collection'

describe('Collection', () => {
	test('FirstReturnsFirstItemInCollection', () => {
		const c = new Collection(['foo', 'bar'])
		expect(c.first()).toEqual('foo')
	})
})
