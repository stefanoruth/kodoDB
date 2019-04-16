import { Model } from './Model'

export class Builder {
	/**
	 * The model being queried.
	 */
	protected model?: Model

	setModel(model: Model) {
		this.model = model

		// @ts-ignore
		this.query.from(model.getTable())

		return this
	}
}
