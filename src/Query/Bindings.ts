export interface Bindings {
	select: string[]
	from: string[]
	join: string[]
	where: string[]
	having: string[]
	order: string[]
	union: string[]
}

export const BindingKeys = ['select', 'from', 'join', 'where', 'having', 'order', 'union']
export type BindingType = 'select' | 'from' | 'join' | 'where' | 'having' | 'order' | 'union'
