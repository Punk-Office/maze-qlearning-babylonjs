export class Point {

	div: HTMLDivElement|null
	row: number
	column: number

	constructor(div: HTMLDivElement|null, row: number, column: number) {
        this.div = div
        this.row = row
        this.column = column
    }
}
