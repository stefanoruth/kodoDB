import { studly } from '../src/Utils/String'
import { tap } from '../src/Utils'

describe('Utils', () => {
	describe('String', () => {
		test('Studly case', () => {
			expect(studly('laravel_p_h_p_framework')).toBe('LaravelPHPFramework')
			expect(studly('laravel_php_framework')).toBe('LaravelPhpFramework')
			expect(studly('laravel-phP-framework')).toBe('LaravelPhPFramework')
			expect(studly('laravel  -_-  php   -_-   framework   ')).toBe('LaravelPhpFramework')
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
})
