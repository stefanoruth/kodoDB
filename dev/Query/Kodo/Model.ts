interface HasAttributes {
	attributes?: string[]
}

export interface SoftDeletes {
	//
}

export abstract class Model implements HasAttributes {}
