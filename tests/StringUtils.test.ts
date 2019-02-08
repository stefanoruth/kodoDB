import { studly } from '../src/Utils/String'

describe('Utils String', () => {
	it('Studly case', () => {
		expect(studly('laravel_p_h_p_framework')).toBe('LaravelPHPFramework')
		expect(studly('laravel_php_framework')).toBe('LaravelPhpFramework')
		expect(studly('laravel-phP-framework')).toBe('LaravelPhPFramework')
		expect(studly('laravel  -_-  php   -_-   framework   ')).toBe('LaravelPhpFramework')
	})
})
