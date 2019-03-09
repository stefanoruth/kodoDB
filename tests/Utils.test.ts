import { tap, dateFormat, Str } from '../src/Utils'

describe('Utils', () => {
	describe('Str', () => {
		test('Studly case', () => {
			expect(Str.studly('laravel_p_h_p_framework')).toBe('LaravelPHPFramework')
			expect(Str.studly('laravel_php_framework')).toBe('LaravelPhpFramework')
			expect(Str.studly('laravel-phP-framework')).toBe('LaravelPhPFramework')
			expect(Str.studly('laravel  -_-  php   -_-   framework   ')).toBe('LaravelPhpFramework')
		})
	})

	describe('Tap', () => {
		test('Returns same object as first param, but can be modified', () => {
			const obj = new class MyObj {
				id = 1
			}()

			expect(tap(obj)).toBe(obj)

			expect(
				tap(obj, value => {
					expect(value).toBe(obj)
					value.id = 2
				}).id
			).toBe(2)
		})
	})

	describe('Date', () => {
		test('It can format it correctly', () => {
			expect(dateFormat(new Date('2019-2-19 22:58:19'))).toEqual('2019_02_19_225819')
			expect(dateFormat(new Date('2019-2-19 00:00:00'))).toEqual('2019_02_19_000000')
			expect(dateFormat(new Date('2019-2-19 09:00:00'))).toEqual('2019_02_19_090000')
			expect(dateFormat(new Date('2019-2-19 00:09:00'))).toEqual('2019_02_19_000900')
			expect(dateFormat(new Date('2019-2-19 00:00:09'))).toEqual('2019_02_19_000009')
		})
	})
})
