export function detectsLostConnections(error: Error): boolean {
	const codes = [
		'server has gone away',
		'no connection to the server',
		'Lost connection',
		'is dead or not enabled',
		'Error while sending',
		'decryption failed or bad record mac',
		'server closed the connection unexpectedly',
		'SSL connection has been closed unexpectedly',
		'Error writing data to the connection',
		'Resource deadlock avoided',
		'Transaction() on null',
		'child connection forced to terminate due to client_idle_limit',
		'query_wait_timeout',
		'reset by peer',
		'Physical connection is not usable',
		'TCP Provider: Error code 0x68',
		'php_network_getaddresses: getaddrinfo failed: Name or service not known',
		'ORA-03114',
		'Packets out of order. Expected',
		'Adaptive Server connection failed',
		'Communication link failure',
	]

	return codes.some(x => x === error.message)
}

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
