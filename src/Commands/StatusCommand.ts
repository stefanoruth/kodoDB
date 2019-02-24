import { CommandModule } from 'yargs'

export class StatusCommand implements CommandModule<{}, {}> {
	command = 'status'
	describe = 'Database Status'

	async handler() {
		// Todo
		console.log('Status of db')
	}
}
