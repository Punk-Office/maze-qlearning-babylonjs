export enum BlockType {
	EMPTY = 1,
	STARTPOINT,
	ENDGOAL,
	WALL,
	SHORTEST
}

export type BlockData = {
	id: string,
	type: BlockType,
    row: number,
    column: number,
    qAtt: string
}
