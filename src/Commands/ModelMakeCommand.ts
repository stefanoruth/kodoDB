import { CommandModule } from 'yargs'

export class ModelMakeCommand implements CommandModule<{}, {}> {
	command = 'make:model'
	describe = 'Make Model'

	async handler() {
		// Todo
		console.log('Make model')
	}
}
