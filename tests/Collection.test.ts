import { Collection } from '../src/Utils/Collection'

describe('Collection', () => {
	test('Filter', () => {
		expect(
			new Collection([{ id: 1, name: 'Hello' }, { id: 2, name: 'World' }])
				.filter(item => {
					return item.id === 2
				})
				.all()
		).toEqual([{ id: 2, name: 'World' }])

		expect(new Collection(['', 'Hello', '', 'World']).filter().all()).toEqual(['Hello', 'World'])

		// expect(
		// 	new Collection({ id: 1, first: 'Hello', second: 'World' })
		// 		.filter((item, key) => {
		// 			return true
		// 			// return key !== 'id'
		// 		})
		// 		.all()
		// ).toEqual({ first: 'Hello', second: 'World' })
	})
})
