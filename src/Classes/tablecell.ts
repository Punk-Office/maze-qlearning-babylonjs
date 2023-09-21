export class TableCell {

	row: number
	column: number
	north: number
	east: number
	south: number
	west: number
	
    constructor(row: number, column: number) {
        this.row = row
        this.column = column
        this.north = 0
        this.east = 0
        this.south = 0
        this.west = 0
    }
}