import { setAvatarStartingPosition, showAvatar, moveAvatar, Motion } from './avatar'
import * as Renderer from './Renderer3D'
import * as CP from './ControlPanel'
import { BlockType, BlockData } from '../Classes/blocks'
import { showWarning } from './Warning'

const defaultMapSize = 5
const learningRate = 0.8
const discountFactor = 0.8

const spaceCell = 0

// Point system
const reward = 1000
const penalty = -1000
const cliff = -1000
const wall = -1000

const defaultWallRate = 0.3
const howSlowSolverMoves = 0.06
const stopAfterThisManyPathsFound = 5

var isTraining = false

var rowSize: number
var columnSize: number

var isTopCamButtonActive = true

var allTypes: BlockType[]
var gridPos = BABYLON.Vector3.Zero()
var isLoopingMazePuzzle: Boolean = false

type tableCell = {
    block: BlockData,
    north: number,
    south: number,
    east: number,
    west: number
}

var blocks: Array<BlockData> = []
var currentBlock: BlockData
var shortestWayParts: BlockData[] =[]
var rTable: tableCell[][]
var qTable: tableCell[][]

export function toggleTrain() {
	!isTraining ? run() : cancel()
}

export function toggleLoop() {
	isLoopingMazePuzzle = !isLoopingMazePuzzle
}

export function setupMaze() {
	Renderer.setupMouseEvents(setStartPoint, setEndGoal, addWall)
	resetMaze()
}

function resetMaze() {
	Renderer.disposeMaze()
	showAvatar(false)
	blocks = []
	shortestWayParts = []
	rTable = []
	qTable = []

    const rowCount = sizeConfig()[0]
    const columnCount = sizeConfig()[1]
	Renderer.createGrid(columnCount, rowCount)
	Renderer.createSolver(gridPos.y+0.5,gridPos.z)

	let index = 0
	for (let i=0; i<rowCount; i++) {
		for (let j=0; j<columnCount; j++) {
			Renderer.createBlock(index, i, j)
			blocks.push({id:String(index), type:BlockType.EMPTY, row:i, column:j, qAtt:""})	
			index++
		}
	}

	addWallsRandomly()
	Renderer.moveCamera()
}

function sizeConfig() {
    const cpRows = CP.getRows()
	const cpColumns = CP.getColumns()
    rowSize = cpRows !== '' ? Number(cpRows!) : defaultMapSize
    columnSize =  cpColumns !== ''? Number(cpColumns!) : defaultMapSize

    if (rowSize > 15) {
        rowSize = 15
    }
    if (rowSize < 3) {
        rowSize = 3
    }
    if (columnSize > 15) {
        columnSize = 15
    }
    if (columnSize < 3) {
        columnSize = 3
    }
    var size = [rowSize, columnSize]
    return size
}

async function setStartPoint(id: string) {
	if (isTraining) return
	const selectedBlock = blocks.find(block => block.id === id)
	if (selectedBlock) {
		if (selectedBlock.type === BlockType.ENDGOAL || selectedBlock.type === BlockType.WALL) return
		blocks.forEach((block) => {
			if (block.id !== id && block.type === BlockType.STARTPOINT) {
				block.type = BlockType.EMPTY
				Renderer.setBlock(block.id, BlockType.EMPTY)
			}
		})
		currentBlock = selectedBlock
		selectedBlock.type = BlockType.STARTPOINT
		Renderer.setBlock(id,BlockType.STARTPOINT)	
		setAvatarStartingPosition(id)
	}
}

function setEndGoal(id: string) {
	if (isTraining) return
	const selectedBlock = blocks.find(block => block.id === id)
	if (selectedBlock) {
		if (selectedBlock.type === BlockType.STARTPOINT || selectedBlock.type === BlockType.WALL) return
		blocks.forEach((block) => {
			if (block.id !== selectedBlock.id && block.type === BlockType.ENDGOAL) {
				block.type = BlockType.EMPTY
				Renderer.setBlock(block.id, BlockType.EMPTY)
			}
		})
		selectedBlock.type = BlockType.ENDGOAL
		Renderer.setBlock(id,BlockType.ENDGOAL)
	}
}

function addWall(id: string) {
	if (isTraining) return
	const selectedBlock = blocks.find(block => block.id === id)
	if (selectedBlock) {
		if (selectedBlock.type === BlockType.STARTPOINT || selectedBlock.type === BlockType.ENDGOAL) return
		if (selectedBlock.type === BlockType.WALL) {
			selectedBlock.type = BlockType.EMPTY
			Renderer.setBlock(id, BlockType.EMPTY)
			return
		}
		selectedBlock.type = BlockType.WALL
		Renderer.setBlock(id, BlockType.WALL)
	}
}

async function addWallsRandomly() {
    var rows = sizeConfig()[0]
    var cols = sizeConfig()[1]

    let rateInput = CP.getWallRate()
    let wallRate = rateInput === '' ? defaultWallRate : (Number(rateInput)/100)
    if (wallRate > 80) wallRate = 80
    if (wallRate < 0) wallRate = 0
    
    var wallNumber = wallRate*rows*cols

    let n = 0
    while (n < wallNumber) {
		let rowIndex = Math.floor(Math.random() * rows)
		let columnIndex = Math.floor(Math.random() * cols)

        let newWall =  blocks[0]
        blocks.forEach((block) => {
            if (block.row === rowIndex && block.column === columnIndex) newWall = block
        })
        if (newWall.type !== BlockType.WALL) {
            newWall.type = BlockType.WALL
			Renderer.setBlock(newWall.id, BlockType.WALL)
            n++
        }
    }
}

function setCurrentPoint(row: number, column: number,placeSolver:Boolean) {
    var currentBlock: BlockData = blocks.find(block => block.row === row && block.column === column)!
    if (placeSolver) {
		Renderer.setSolverPositionToBlock(currentBlock.id)
    }   
    return currentBlock
}

function rTableGenerator() {
    for (let i = 0; i < sizeConfig()[0]; i++) {
        let row = []
        for (let j = 0; j < sizeConfig()[1]; j++) {
            var block = blocks.find(user => user.row === i && user.column === j)!
            let cell: tableCell = {block: block,north:0,south:0,east:0,west:0}
            // Update here to add new actions
            let north = blocks.find(user => user.row === i-1) ? blocks.find(user => user.row === i-1 && user.column === j) : undefined
            let west = blocks.find(user => user.row === i && user.column === j-1)
            let east = blocks.find(user => user.row === i && user.column === j+1)
            let south = blocks.find(user => user.row === i+1) ? blocks.find(user => user.row === i+1 && user.column === j) : undefined

            cell.north = rValue(north!)
            cell.west = rValue(west)
            cell.east = rValue(east)
            cell.south = rValue(south!)

            row.push(cell)
        }
        rTable.push(row)
    }
}

function rValue(block: BlockData | undefined) {
    if (!block) {
        return cliff
    } else if (block.type === BlockType.WALL) {
        return penalty
    } else if (block.type === BlockType.ENDGOAL) {
        return reward
    } else {
        return spaceCell
    }
}

function qTableInit() {
    for (let i = 0; i < sizeConfig()[0]; i++) {
        let row = []
        for (let j = 0; j < sizeConfig()[1]; j++) {
            var block = blocks.find(block => block.row === i && block.column === j)
			if (block) {
				let cell: tableCell = {block: block,north:0,south:0,east:0,west:0}
				if (rTable[i][j].north === cliff) {
					cell.north = cliff
				}
				if (rTable[i][j].east === cliff) {
					cell.east = cliff
				}
				if (rTable[i][j].west === cliff) {
					cell.west = cliff
				}
				if (rTable[i][j].south === cliff) {
					cell.south = cliff
				}
				block.qAtt =`Q Values\nNorth:${cell['north']}\nEast: ${cell['east']}\nSouth: ${cell['south']}\nWest: ${cell['west']}`
				row.push(cell)
			} else {
				console.log("Block at i: "+i+" j: "+j+" missing")
			}
        }
        qTable.push(row)
    }
}

function run() {
    allTypes = blocks.map((block) => block.type)

	rTable = []
	qTable = []
	rTableGenerator()
	qTableInit()

    if (!isTopCamButtonActive) {
		showWarning('Set view to top')
		return
    }
    else if (!allTypes.includes(BlockType.STARTPOINT) && !allTypes.includes(BlockType.ENDGOAL)) {
		showWarning('Set the start and goal point')
		return
    } else if (!allTypes.includes(BlockType.STARTPOINT)) {
        showWarning('Set the start point')
        return
    } else if (!allTypes.includes(BlockType.ENDGOAL)) {
        showWarning('Set the goal point')
        return
    }
    isTraining = true
	CP.setTrainButtonText("CANCEL")

    if (shortestWayParts) {
        shortestWayParts.forEach((block) => {
            if (block.type !== BlockType.STARTPOINT) Renderer.setBlock(block.id,BlockType.EMPTY)
        })
        clearShortestWay()
    } else {
        shortestWayParts = []
    }

    train()
    
    allTypes = []
}

function cancel() {
    isTraining = false
	CP.setTrainButtonText("TRAIN")
}

function sleepAnimFrame() { 
	return new Promise(requestAnimationFrame)
}

async function train() {
    let blnReachedGoal = false
	let attempts = 0
    let attemptsFirstShortest = 0
	var shortestPathCount = 0
	var startBlock = blocks.find(block => block.type === BlockType.STARTPOINT)
    var goalBlock = blocks.find(block => block.type === BlockType.ENDGOAL)

	Renderer.changeToTopView(true)
	CP.setPathsFoundText('Paths found: ' + shortestPathCount)
	setAvatarStartingPosition(startBlock!.id)
    while (!blnReachedGoal) {        
        while (currentBlock.type !== BlockType.WALL && currentBlock.type !== BlockType.ENDGOAL) {
            if (!isTraining) return
            let posibleActions = findPosibleActions(qTable[currentBlock.row][currentBlock.column])
            if (posibleActions.length === 0) {
                showWarning("Avatar can't move")
				console.log("Avatar can't move")
                isTraining = false            
				CP.setTrainButtonText("TRAIN")
                if (isLoopingMazePuzzle) continueLoop()
            	return
        	}
			let action = posibleActions[Math.floor(Math.random() * posibleActions.length)]

			let nextRow = currentBlock.row + action.rowChanger
			let nextColumn = currentBlock.column + action.columnChanger
			let oldQValue: number
			let r: number

			switch(action.direction) {
				case "north":
					oldQValue = qTable[currentBlock.row][currentBlock.column].north
					r = rTable[currentBlock.row][currentBlock.column].north
					break
				case "east":
					oldQValue = qTable[currentBlock.row][currentBlock.column].east
					r = rTable[currentBlock.row][currentBlock.column].east
					break
				case "south":
					oldQValue = qTable[currentBlock.row][currentBlock.column].south
					r = rTable[currentBlock.row][currentBlock.column].south
					break
				default:
					oldQValue = qTable[currentBlock.row][currentBlock.column].west
					r = rTable[currentBlock.row][currentBlock.column].west
			}

			let nextPossibleActions = findPosibleActions(qTable[nextRow][nextColumn])
			let nextMaximumQValue = Math.max(...nextPossibleActions.map(a => {return Number(a.point)}))

			let newQValue = oldQValue + learningRate * (r + discountFactor * nextMaximumQValue - oldQValue)

			if (r === penalty) newQValue = wall

			switch(action.direction) {
				case "north":
					qTable[currentBlock.row][currentBlock.column].north = newQValue
					break
				case "east":
					qTable[currentBlock.row][currentBlock.column].east = newQValue
					break
				case "south":
					qTable[currentBlock.row][currentBlock.column].south = newQValue
					break
				default:
					qTable[currentBlock.row][currentBlock.column].west = newQValue
				break
		}

        
        if (howSlowSolverMoves > 0) {
			await sleepAnimFrame()
			currentBlock = setCurrentPoint(nextRow, nextColumn,true)
			if (currentBlock.type === BlockType.ENDGOAL) {
				CP.setAttemptsCountColour(getComputedStyle(document.body).getPropertyValue('--goalColor'))
			}
            await sleep(howSlowSolverMoves)
        } else {
            currentBlock = setCurrentPoint(nextRow, nextColumn,true)
        }

		if (currentBlock.type === BlockType.ENDGOAL) {	
			shortestPathCount++
			CP.setPathsFoundText('Paths found: ' + shortestPathCount)
			attemptsFirstShortest = 0
			if (shortestPathCount === stopAfterThisManyPathsFound) {
				blnReachedGoal = true
				break
			}
		}
        if (currentBlock.type === BlockType.STARTPOINT)
            break
        }

		if (shortestPathCount === 0) attemptsFirstShortest++
		attempts++
		if ((attemptsFirstShortest > 100) && (shortestPathCount === 0)) {
			break
		}
        
        if (howSlowSolverMoves > 0) {
			await sleepAnimFrame()
			currentBlock = setCurrentPoint(startBlock!.row, startBlock!.column,false) 
			if (shortestPathCount === 0) CP.set1stPathAttemptsText('1st path attempts: ' + attemptsFirstShortest)
			CP.setAttemptsCountText('Attempts: ' + attempts)
            await sleep(howSlowSolverMoves)
			CP.setAttemptsCountColour('#fff')
        } else {
            currentBlock = setCurrentPoint(startBlock!.row,startBlock!.column,true) 
            CP.setAttemptsCountText('Attempts: ' + attempts)
        }        
    }
	Renderer.setSolverPositionToBlock(goalBlock!.id)

    // After reaching goal
    if (blnReachedGoal) {
    	drawShortestWay()
    }
	console.log("Finishing training")
    isTraining = false
	CP.setTrainButtonText("TRAIN")
    if (!blnReachedGoal) {
		showWarning("Couldn't find path in time")
		continueLoop()
    }
}

// After training is done
async function drawShortestWay() {
    let block = blocks.find(block => block.type === BlockType.STARTPOINT)!
	Renderer.changeToTopView(false)

    while (block.type !== BlockType.ENDGOAL) {
        let posibleActions = findPosibleActions(qTable[block.row!][block.column!])
        if(posibleActions.length === 0)
            return
        let posibleMaxQActions = findMaxActions(posibleActions)
        if (posibleMaxQActions.every(item => item.block === 0)) {
            showWarning('Not enought training to find a short path')
            return
        }
        let maxQAction = posibleMaxQActions[Math.floor(Math.random() * posibleMaxQActions.length)]

        let block_row = block.row + maxQAction.rowChanger
        let block_column = block.column + maxQAction.columnChanger
        block = blocks.find(user => user.row === block_row && user.column === block_column )!

        if (block.type === BlockType.ENDGOAL) {
            await moveAvatar(block.id, Motion.DANCING)
			Renderer.hideSolver()
            if (isLoopingMazePuzzle) continueLoop()
            return
        }
        
		sleepAnimFrame()
		if (block.type !== BlockType.WALL) {
			shortestWayParts.push(block)
		}
		shortestWayParts.forEach(async (block) => {
			if (block.type !== BlockType.STARTPOINT) Renderer.setBlock(block.id, BlockType.SHORTEST)
		})
		
        await moveAvatar(block.id, Motion.RUNNING)
    }
}

function clearShortestWay() {
    shortestWayParts = []
}
  
function findPosibleActions(point: tableCell) {
    // Update this funtion to add new actions
    let actions = []
    if (point.north !== cliff && point.north !== wall) {
        actions.push(
            {
                direction: 'north',
                point: point.north,
                rowChanger: -1,
                columnChanger: 0
            }
        )
    }
    
    if (point.west !== cliff && point.west !== wall) {
        actions.push(
            {
                direction: 'west',
                point: point.west,
                rowChanger: 0,
                columnChanger: -1
            }
        )
    }
    if (point.east !== cliff && point.east !== wall) {
        actions.push(
            {
                direction: 'east',
                point: point.east,
                rowChanger: 0,
                columnChanger: +1
            }
        )
    }
    if (point.south !== cliff && point.south !== wall) {
        actions.push(
            {
                direction: 'south',
                point: point.south,
                rowChanger: +1,
                columnChanger: 0
            }
        )
    }
    return actions
}

function findMaxActions(posibleActions: any) {
    const maxPoint = Math.max(...posibleActions.map((i: any) => {return i.point} ))

    const optimumActions:Array<any> = []
    posibleActions.forEach((action: any) => action.point === maxPoint?optimumActions.push(action):null)
    return optimumActions
}

async function sleep(time: any) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function continueLoop() {
	const distanceAway = 2
	await sleep(1000)
	resetMaze()
	var startBlock = blocks.find(block => block.type === BlockType.EMPTY)
	if (startBlock) {
		setStartPoint(startBlock.id)		
		var goalBlock = blocks.find(block => block.type === BlockType.EMPTY && block.row > distanceAway && block.column > distanceAway)
		if (goalBlock) {
			setEndGoal(goalBlock.id)
			run()
		}
	}
}
