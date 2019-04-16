export abstract class HasAttributes<Attributes> {
	/**
	 * The model's attributes.
	 */
	protected attributes: Partial<Attributes> = {}

	fill(attributes: Partial<Attributes>) {
		this.attributes = attributes

		return this
	}
}
