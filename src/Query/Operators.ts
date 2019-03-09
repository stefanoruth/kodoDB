export const Operators = [
	'=',
	'<',
	'>',
	'<=',
	'>=',
	'<>',
	'!=',
	'<=>',
	'like',
	'like binary',
	'not like',
	'ilike',
	'&',
	'|',
	'^',
	'<<',
	'>>',
	'rlike',
	'regexp',
	'not regexp',
	'~',
	'~*',
	'!~',
	'!~*',
	'similar to',
	'not similar to',
	'not ilike',
	'~~*',
	'!~~*',
]

export type OperatorType =
	| '='
	| '<'
	| '>'
	| '<='
	| '>='
	| '<>'
	| '!='
	| '<=>'
	| 'like'
	| 'like binary'
	| 'not like'
	| 'ilike'
	| '&'
	| '|'
	| '^'
	| '<<'
	| '>>'
	| 'rlike'
	| 'regexp'
	| 'not regexp'
	| '~'
	| '~*'
	| '!~'
	| '!~*'
	| 'similar to'
	| 'not similar to'
	| 'not ilike'
	| '~~*'
	| '!~~*'
