import { Blueprint } from '../src/Schema/Blueprint'
import { MySqlSchemaGrammar } from '../src/Schema/Grammars/MySqlGrammar'
import { Connection } from '../src/Connections/Connection'
import { Mock } from 'ts-mockery'

describe('SchemaBlueprint', () => {
	test('toSqlRunsCommandsFromBlueprint', () => {
		// Todo Mock
	})

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

	describe('indexDefaultNamesWhenPrefixSupplied', () => {
		test('unique', () => {
			const blueprint = new Blueprint('users', undefined, 'prefix_')
			blueprint.unique(['foo', 'bar'])
			const commands = blueprint.getCommands()
			expect('prefix_users_foo_bar_unique').toBe(commands[0].index)
		})

		test('index', () => {
			const blueprint = new Blueprint('users', undefined, 'prefix_')
			blueprint.index('foo')
			const commands = blueprint.getCommands()
			expect('prefix_users_foo_index').toBe(commands[0].index)
		})

		test('unique', () => {
			const blueprint = new Blueprint('geo', undefined, 'prefix_')
			blueprint.spatialIndex('coordinates')
			const commands = blueprint.getCommands()
			expect('prefix_geo_coordinates_spatialindex').toBe(commands[0].index)
		})
	})

	describe('dropIndexDefaultNames', () => {
		test('unique', () => {
			const blueprint = new Blueprint('users')
			blueprint.dropUnique(['foo', 'bar'])
			const commands = blueprint.getCommands()
			expect('users_foo_bar_unique').toBe(commands[0].index)
		})

		test('index', () => {
			const blueprint = new Blueprint('users')
			blueprint.dropIndex(['foo'])
			const commands = blueprint.getCommands()
			expect('users_foo_index').toBe(commands[0].index)
		})

		test('unique', () => {
			const blueprint = new Blueprint('geo')
			blueprint.spatialIndex('coordinates')
			const commands = blueprint.getCommands()
			expect('geo_coordinates_spatialindex').toBe(commands[0].index)
		})
	})

	describe('dropIndexDefaultNamesWhenPrefixSupplied', () => {
		test('unique', () => {
			const blueprint = new Blueprint('users', undefined, 'prefix_')
			blueprint.dropUnique(['foo', 'bar'])
			const commands = blueprint.getCommands()
			expect('prefix_users_foo_bar_unique').toBe(commands[0].index)
		})

		test('index', () => {
			const blueprint = new Blueprint('users', undefined, 'prefix_')
			blueprint.dropIndex(['foo'])
			const commands = blueprint.getCommands()
			expect('prefix_users_foo_index').toBe(commands[0].index)
		})

		test('unique', () => {
			const blueprint = new Blueprint('geo', undefined, 'prefix_')
			blueprint.spatialIndex('coordinates')
			const commands = blueprint.getCommands()
			expect('prefix_geo_coordinates_spatialindex').toBe(commands[0].index)
		})
	})

	describe('dd', () => {
		test('defaultCurrentTimestamp', () => {
			const blueprint = new Blueprint('users', table => {
				table.timestamp('created').useCurrent()
			})

			console.log(blueprint)

			const connection = Mock.of<Connection>()

			expect(blueprint.toSql(connection, new MySqlSchemaGrammar())).toBe([
				'alter table `users` add `created` timestamp default CURRENT_TIMESTAMP not null',
			])
		})
	})
})
