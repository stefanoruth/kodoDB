import { CommandModule } from 'yargs'

export class MakeCommand implements CommandModule<{}, {}> {
	command = 'make'
	describe = 'Make migration'

	async handler() {
		// Todo
		console.log('Make migration')
	}
}
