import { Blueprint } from '../src/Schema/Blueprint'

describe('SchemaBlueprint', () => {
	describe('indexDefaultNames', () => {
		test('unique', () => {
			const blueprint = new Blueprint('users')

			blueprint.unique(['foo', 'bar'])

			expect(blueprint.getCommands()[0].index).toBe('users_foo_bar_unique')
		})

		test('index', () => {
			const blueprint = new Blueprint('users')
			blueprint.index('foo')
			expect(blueprint.getCommands()[0].index).toBe('users_foo_index')
		})

		test('spatialIndex', () => {
			const blueprint = new Blueprint('geo')
			blueprint.spatialIndex('coordinates')
			expect(blueprint.getCommands()[0].index).toBe('geo_coordinates_spatialindex')
		})
	})
})
