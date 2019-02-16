import { TableGuesser } from '../src/Migrations/TableGuesser'

describe('TableGuesser', () => {
	describe('migrationIsProperlyParsed', () => {
		test('create_users_table', () => {
			const result = TableGuesser.guess('create_users_table')
			expect(result.table).toBe('users')
			expect(result.create).toBeTruthy()
		})

		test('add_status_column_to_users_table', () => {
			const result = TableGuesser.guess('add_status_column_to_users_table')
			expect(result.table).toBe('users')
			expect(result.create).toBeFalsy()
		})

		test('change_status_column_in_users_table', () => {
			const result = TableGuesser.guess('change_status_column_in_users_table')
			expect(result.table).toBe('users')
			expect(result.create).toBeFalsy()
		})

		test('drop_status_column_from_users_table', () => {
			const result = TableGuesser.guess('drop_status_column_from_users_table')
			expect(result.table).toBe('users')
			expect(result.create).toBeFalsy()
		})
	})

	describe('migrationIsProperlyParsedWithoutTableSuffix', () => {
		test('create_users', () => {
			const result = TableGuesser.guess('create_users')
			expect(result.table).toBe('users')
			expect(result.create).toBeTruthy()
		})

		test('add_status_column_to_users', () => {
			const result = TableGuesser.guess('add_status_column_to_users')
			expect(result.table).toBe('users')
			expect(result.create).toBeFalsy()
		})

		test('change_status_column_in_users', () => {
			const result = TableGuesser.guess('change_status_column_in_users')
			expect(result.table).toBe('users')
			expect(result.create).toBeFalsy()
		})

		test('drop_status_column_from_users', () => {
			const result = TableGuesser.guess('drop_status_column_from_users')
			expect(result.table).toBe('users')
			expect(result.create).toBeFalsy()
		})
	})
})
