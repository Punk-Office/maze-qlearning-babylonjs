import { useRef, useState, useEffect } from 'react'
import { toggleLoop, toggleTrain, setupMaze } from './maze'

let btnTrain: HTMLButtonElement
let btnGenerate: HTMLButtonElement
let inputWallRate: HTMLInputElement
let inputRows: HTMLInputElement
let inputColumns: HTMLInputElement
let divAttemptsCount: HTMLDivElement
let div1stPathAttempts: HTMLDivElement
let divPathsFound: HTMLDivElement

function InfoArea() {
	return(
		<div id="infoArea">
			<div className="info">
				<div className="color">
					<input id="startPointColorSelector" type="color" defaultValue="#E91E62"/>
				</div>
				<div className="text">
					<div>Start Point</div>
					<div>(Left-click to select)</div>
				</div>
			</div>
			<div className="info">
				<div className="color">
					<input id="goalPointColorSelector" type="color" defaultValue="#00ff0d"/>
				</div>
				<div className="text">
					<div>Goal Point</div>
					<div>(Right-click/long-press to select)</div>
				</div>
			</div>
			<div className="info">
				<div className="color">
					<input id="wallColorSelector" type="color" defaultValue="#0c3547"/>
				</div>
				<div className="text">
					<div>Wall</div>
					<div>(Middle-click to add)</div>
				</div>
			</div>
		</div>
	)
}

export function getRows() {
	return inputRows.value
} 

export function getColumns() {
	return inputColumns.value
}

function Parameters() {
	const [textRow, setTextRow] = useState("5")
	const [textColumn, setTextColumn] = useState("5")
	const [wallRate, setWallRate] = useState("30")
	const refWallRate = useRef<HTMLInputElement>(null)
	const refRows = useRef<HTMLInputElement>(null)
	const refColumns = useRef<HTMLInputElement>(null)
	
	useEffect(() => {
		inputWallRate = refWallRate.current!
		inputColumns = refColumns.current!
		inputRows = refRows.current!
	},[])
	
	function rowChange(e: React.ChangeEvent<HTMLInputElement>) {
		setTextRow(e.target.value.replace(/[^\d]/,''))
	}

	function columnChange(e: React.ChangeEvent<HTMLInputElement>) {
		setTextColumn(e.target.value.replace(/[^\d]/,''))
	}

	function wallRateChange(e: React.ChangeEvent<HTMLInputElement>) {
		setWallRate(e.target.value.replace(/[^\d]/,''))
	}

	return(
		<div id="parameters">
			<div>Size</div>
			<div>
				<input ref={refRows} type="text" id="row" className="size" placeholder="5" onChange={rowChange} value={textRow}/>
				<input ref={refColumns} type="text" id="column" className="size" placeholder="5" onChange={columnChange} value={textColumn}/>
			</div>
			<div style={{marginTop:"15px"}}>Random Wall Rate</div>
			<div>
				<input ref={refWallRate} type="text" id="wallRate" className="size" placeholder="30" onChange={wallRateChange} value={wallRate}/><span style={{fontSize:"20pt"}}>%</span>
			</div>
		</div>
	)	
}

export function getWallRate() {
	return inputWallRate.value
}

export function setTrainButtonText(btnName: string) {
	btnTrain.innerText = btnName
	btnGenerate.disabled = (btnName === "CANCEL")
}

export function setAttemptsCountColour(colour: string) {
	divAttemptsCount.style.color = colour
}

export function setAttemptsCountText(text: string) {
	divAttemptsCount.innerHTML = text
}

export function setPathsFoundText(text: string) {
	divPathsFound.innerHTML = text
}

export function set1stPathAttemptsText(text: string) {
	div1stPathAttempts.innerHTML = text
}

export default function ControlPanel({ activateButtons }:{activateButtons : boolean}) {
	const refTrain = useRef<HTMLButtonElement>(null)
	const refLoop = useRef<HTMLButtonElement>(null)
	const refGenerate = useRef<HTMLButtonElement>(null)
	const refAttempts = useRef<HTMLDivElement>(null)
	const ref1stPathAttempts = useRef<HTMLDivElement>(null)
	const refPathsFound = useRef<HTMLDivElement>(null)

	useEffect(() => {
		document.addEventListener('contextmenu', event => event.preventDefault())
		btnTrain = refTrain.current!
		btnGenerate = refGenerate.current!
		divAttemptsCount = refAttempts.current!
		div1stPathAttempts = ref1stPathAttempts.current!
		divPathsFound = refPathsFound.current!
	},[activateButtons])

	function btnToggle() {
		toggleLoop()
		if (refLoop.current!.innerText === 'LOOP ON') {
			refLoop.current!.innerText = 'LOOP OFF'
		} else {
			refLoop.current!.innerText = 'LOOP ON'
		}
	}

	return(
		<div id="controlPanel">
			<div id="logo" onClick={()=>{window.open('http://punkoffice.com')}}></div>
			<Parameters/>
			<button ref={refGenerate} id="generate" disabled={!activateButtons} className="able" onClick={setupMaze}>REGENERATE MAP</button>
			<hr style={{marginTop:"20px"}}/>
			<InfoArea/>
			<hr style={{margin:"10px 0 20px 0"}}/>
			<div ref={ref1stPathAttempts} className="hidden" id="firstAttempts" style={{marginTop:"10px"}}>1st path attempts: 0</div>
			<div ref={refAttempts} id="attemptsCount" style={{marginTop:"10px"}}>Total attempts: 0</div>
			<div ref={refPathsFound} className="hidden" id="pathsFound" style={{marginTop:"10px"}}>Paths found: 0</div>
			<button ref={refTrain} className="control" disabled={!activateButtons} id='train' onClick={toggleTrain}>TRAIN</button>
			<button ref={refLoop} onClick={btnToggle} id='auto'>LOOP OFF</button>
		</div>
	)
}