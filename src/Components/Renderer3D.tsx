import { useRef, useEffect } from 'react'
import { setupAvatar } from './avatar'
import { BlockType } from '../Classes/blocks'
import * as BABYLON from 'babylonjs'

var scene: BABYLON.Scene
var camera: BABYLON.ArcRotateCamera
var canvas: HTMLCanvasElement
var grid: BABYLON.AbstractMesh
var lightDir: BABYLON.DirectionalLight
var avatar: BABYLON.TransformNode
var cellMaterials: { [id: string] : BABYLON.StandardMaterial; } = {}
var animateBetaTo3D: BABYLON.Animation
var gridPos = BABYLON.Vector3.Zero()
var solver: BABYLON.Mesh
var timerPointerDownGround: NodeJS.Timer|null
var consecutiveFPSbelowThreshold = 0
var countBeforeSwitchingToLosRes = 100
var blnHiRes = true
const animationFramerate = 30
const squareSize = 1
const hiResFPSthreshold = 30

export default function Canvas({ onLoaded } : {onLoaded: (scene:BABYLON.Scene)=>void}) {    
	const refCanvas = useRef<HTMLCanvasElement>(null)
	const refFPS = useRef<HTMLDivElement>(null)

	useEffect(() => {
        if (!scene) {
			(async () => { 
				await createScene()
			})()
        }		
	})

	async function createScene() {
		canvas = refCanvas.current!
		const engine = new BABYLON.Engine(canvas, true)
		scene = new BABYLON.Scene(engine)
		scene.clearColor = BABYLON.Color4.FromHexString("#D9D8D7")
		setupLighting() 
		setupCamera()
		const pipeline = new BABYLON.DefaultRenderingPipeline("defaultPipeline", true, scene, [camera])
		pipeline.samples = 8
		pipeline.fxaaEnabled = true
		pipeline.imageProcessingEnabled = false
		engine.setHardwareScalingLevel(0.5)
		await setupAvatar(scene, lightDir)
		avatar = scene.getTransformNodeByName("avatar")!
		avatar.setEnabled(false)
		setupCellMaterials()
        engine.resize()
		engine.runRenderLoop(() => {
			const FPS = engine.getFps()
			if (blnHiRes) {
				if (isFinite(FPS)) {
					if (FPS < hiResFPSthreshold) {
						consecutiveFPSbelowThreshold++
						if (consecutiveFPSbelowThreshold > countBeforeSwitchingToLosRes) {
							engine.setHardwareScalingLevel(1)
							blnHiRes = false
							console.log("Scaling down resolution")
						}
					} else {
						consecutiveFPSbelowThreshold = 0
					}
					//refFPS.current!.innerHTML = FPS.toFixed() + " fps"
				}
			}
			scene.render()
		})
	
		const observer = new ResizeObserver(entries => {
			engine.resize()
			reframeCamera()
		})
		// start listening for size changes
		observer.observe(canvas)
		onLoaded(scene)
	}
    
	function setupLighting() {  
		const lightHemi = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 20, 20), scene)
		lightHemi.intensity = 0.8
		lightDir = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(0.7, -2, 2), scene)
		lightDir.intensity = 0.2
		lightDir.shadowMinZ = -56
		lightDir.shadowMaxZ = 50
		lightDir.shadowOrthoScale = 1
	}
	
	function setupCamera() {
		camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 0, BABYLON.Vector3.Zero(), scene)
		camera.upperBetaLimit = 1.4
		camera.panningSensibility = 0
		camera.minZ = 0.1
		camera.useFramingBehavior = true
		camera.framingBehavior!.framingTime = 0
		camera.framingBehavior!.radiusScale = 0.8	
		setupCameraAnimation()
		window.requestAnimationFrame(() => {
			camera.alpha = 0
			camera.radius = 9
			camera.beta = 0
		})
	}

	function setupCameraAnimation() {
		animateBetaTo3D = new BABYLON.Animation("animRotation","beta",animationFramerate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT)
		let keyframeBeta = []
		keyframeBeta.push({frame:0,value:0})
		keyframeBeta.push({frame:5,value:Math.PI/3})
		animateBetaTo3D.setKeys(keyframeBeta)
	}	

	function setupCellMaterials() {
		cellMaterials.empty = new BABYLON.StandardMaterial("matEmpty")
		cellMaterials.empty.diffuseColor = BABYLON.Color3.White()
		cellMaterials.wall = new BABYLON.StandardMaterial("matWall")
		cellMaterials.wall.diffuseColor = BABYLON.Color3.FromHexString("#162a33")
		cellMaterials.goal = new BABYLON.StandardMaterial("matGoal")	
		cellMaterials.goal.diffuseColor = BABYLON.Color3.FromHexString("#00ff0d")
		cellMaterials.start = new BABYLON.StandardMaterial("matStart")
		cellMaterials.start.diffuseColor = BABYLON.Color3.FromHexString("#ff286f")
		cellMaterials.shortest = new BABYLON.StandardMaterial("matShortest")
		cellMaterials.shortest.diffuseColor = BABYLON.Color3.FromHexString("#ffd900")
		cellMaterials.grid = new BABYLON.StandardMaterial("matGrid")
		cellMaterials.grid.diffuseColor = BABYLON.Color3.FromHexString("#3a3f41")
	}	

	return (
		<>
			<div id="fps" ref={refFPS}></div>
        	<canvas id="map" ref={refCanvas}></canvas>
		</>
    )
}

export function setupMouseEvents(setStartPoint:(id: string)=>void, setGoalPoint:(id: string)=>void, addWall:(id: string)=>void) {
	scene.onPointerDown = ((pointerInfo) => {
		// Weird that I have to check "isPickable" but for some reason non-pickable meshes are being picked
		var pickResult = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable)	
		if (pickResult.hit) {
			const pickedMesh = pickResult.pickedMesh as BABYLON.Mesh
			switch (pointerInfo.button) {
				case 0:
					timerPointerDownGround = setTimeout(() => {				
						setGoalPoint(pickedMesh.id)
						timerPointerDownGround = null
					},500)					
					break
				case 1: 
					addWall(pickedMesh.id)
					break
				case 2: 
					setGoalPoint(pickedMesh.id)
					break
			}
		}
	})
	scene.onPointerUp = ((pointerInfo) => {
		if (pointerInfo.button === 0) {
			if (timerPointerDownGround) {
				var pickResult = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh.isPickable)	
				if (pickResult.hit) {
					const pickedMesh = pickResult.pickedMesh as BABYLON.Mesh
					setStartPoint(pickedMesh.id)
				}
			}
			clearTimeout(timerPointerDownGround!)
		}
	})
}

export function disposeMaze() {
    const meshList = ["hair", "head", "eye_left", "eye_right", "body"]
	const toDelete = scene.meshes.filter((mesh) => !meshList.includes(mesh.name))
	toDelete.forEach((mesh) => mesh.dispose())
}

export function hideSolver() {
	solver.setEnabled(false)
}

export function moveCamera() {
	const oldAlpha = camera.alpha
	const oldBeta = camera.beta
	camera.setTarget(grid)
	window.requestAnimationFrame(() => {
		camera.position = new BABYLON.Vector3(gridPos.x, 2, gridPos.z)
		camera.alpha = oldAlpha
		camera.beta = oldBeta
	})
}

function reframeCamera() {
	camera.lowerRadiusLimit = camera.upperRadiusLimit = null
	camera.framingBehavior!.zoomOnMesh(grid)
	camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius
}

export function changeToTopView(topView: boolean) {
	if (topView) {
		let currentBeta = camera.beta
		let currentAlpha = camera.alpha
		camera.detachControl()
		let animateBeta = new BABYLON.Animation("animRotation","beta",animationFramerate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT)
		let keyframeBeta = []
		keyframeBeta.push({frame:0,value:currentBeta})
		keyframeBeta.push({frame:5,value:0})
		animateBeta.setKeys(keyframeBeta)
		let animateAlpha = new BABYLON.Animation("animRotation","alpha",animationFramerate,BABYLON.Animation.ANIMATIONTYPE_FLOAT,BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT)
		let keyframeAlpha = []
		keyframeAlpha.push({frame:0,value:currentAlpha})
		if (currentAlpha > Math.PI) {
			keyframeAlpha.push({frame:5,value:Math.PI*2})
		} else {
			keyframeAlpha.push({frame:5,value:0})
		}
		animateAlpha.setKeys(keyframeAlpha)
		camera.animations = [animateAlpha, animateBeta]
		scene.beginAnimation(camera,0,10,false,1, () => {
			camera.alpha = 0
			camera.beta = 0
			camera.radius = 0
		})
	} else {
        camera.animations = [animateBetaTo3D]
        scene.beginAnimation(camera,0,10,false,1)
		camera.attachControl(canvas)
		scene.activeCamera = camera
	}
}

export function createBlock(index: number, rowPos: number, colPos: number) {
	var block = BABYLON.MeshBuilder.CreateBox(`block`+index, {
		width: 0.98,
		height: 0.1,
		depth: 0.98,
	})
	block.receiveShadows = true
	block.id = `${index}`
	block.metadata = "unselected"
	block.material = cellMaterials.empty
	var defaultPosition = new BABYLON.Vector3(rowPos, 0.55, colPos)
	block.position = defaultPosition
}

export function createGrid(depth: number, height: number) {
	grid = BABYLON.MeshBuilder.CreateBox("grid", {depth:depth+1, width:height+1,height:0.1}, scene)
    grid.material = cellMaterials.grid
	grid.receiveShadows = true
	grid.isPickable = false
    solver = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter:0.5}, scene)

    grid.position = new BABYLON.Vector3(
		height/2 - squareSize / 2,
		0.5,
		(depth/2 - squareSize / 2)
    )
    gridPos = grid.position
	window.requestAnimationFrame(() => {
		camera.setTarget(grid)
		reframeCamera()
	})
}

export function createSolver(y: number, z: number) {
    solver.position = new BABYLON.Vector3(grid.position.x,y,z)
    var hl = new BABYLON.HighlightLayer("hl1", scene)
	hl.addMesh(solver, BABYLON.Color3.Blue())
    solver.visibility = 0.5
	solver.isPickable = false
    solver.setEnabled(false)
}

export function setSolverPositionToBlock(id: string) {
	const mesh = scene.getMeshById(id)
	if (mesh) {
		solver.setEnabled(true)
		solver.position = new BABYLON.Vector3(mesh.position.x,mesh.position.y+0.5,mesh.position.z)	
	}
}

export function setBlock(id: string, type: BlockType) {
	const mesh = scene.getMeshById(id)
	if (mesh) {
		switch(type) {
			case BlockType.EMPTY:
				mesh!.material = cellMaterials.empty
				mesh!.scaling.y = 1
				break
			case BlockType.STARTPOINT:
				mesh!.material = cellMaterials.start
				mesh!.scaling.y = 1
				break
			case BlockType.ENDGOAL:
				mesh!.material = cellMaterials.goal
				mesh!.scaling.y = 1
				break
			case BlockType.WALL:
				mesh!.material = cellMaterials.wall
				mesh!.scaling.y = 6
				break
			case BlockType.SHORTEST:
				mesh!.material = cellMaterials.shortest
				mesh!.scaling.y = 1
				break
		}
	}
}