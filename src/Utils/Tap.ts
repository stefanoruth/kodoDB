export function tap<T>(value: T, callback: (value: T) => void): T {
	callback(value)

	return value
}

// Laravel internal stuff is Fancy
