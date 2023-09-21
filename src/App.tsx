import { memo, useState, useEffect } from 'react'
import * as BABYLON from 'babylonjs'
import ControlPanel from './Components/ControlPanel'
import Canvas from './Components/Renderer3D'
import Warning from './Components/Warning'
import { setupMaze } from './Components/maze'
import './App.css'

const MemoizedCanvas = memo(Canvas)

function Instructions() {
	return(
		<div id="instructions">Select a start point and end goal<br/>then click on TRAIN</div>
	)
}

function App() {
	const [scene3D, setScene3D] = useState<BABYLON.Scene|null>(null)
	const [showInstructions, setShowInstructions] = useState(true)

	useEffect(() => {
		setTimeout(() => {
			setShowInstructions(false)
		}, 5000)
	})

	function sceneLoaded(scene: BABYLON.Scene) {
		console.log("Scene loaded")
		setScene3D(scene)
		setupMaze()
	}

	return (
		<div className="App">
			{ showInstructions &&
				<Instructions/>
			}
			<ControlPanel activateButtons={!!scene3D}/>
			<div id="mainScreen">
				<Warning/>
				<MemoizedCanvas onLoaded={sceneLoaded}/>
			</div>
		</div>
	)
}

export default App;
