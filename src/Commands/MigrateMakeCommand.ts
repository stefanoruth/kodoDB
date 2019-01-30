import { CommandModule } from 'yargs'

export class MigrateMakeCommand implements CommandModule<{}, {}> {
	command = 'make:migration'
	describe = 'Make migration'

	async handler() {
		// Todo
		console.log('Make migration')
	}
}
