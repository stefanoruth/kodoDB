export function detectsDeadlocks(error: Error): boolean {
	const codes = [
		'Deadlock found when trying to get lock',
		'deadlock detected',
		'The database file is locked',
		'database is locked',
		'database table is locked',
		'A table in the database is locked',
		'has been chosen as the deadlock victim',
		'Lock wait timeout exceeded; try restarting transaction',
		'WSREP detected deadlock/conflict and aborted the transaction. Try restarting the transaction',
	]

	return codes.some(x => x === error.message)
}
