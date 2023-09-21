import * as BABYLON from 'babylonjs'
import { setupMorphs } from './morph'

let scene: BABYLON.Scene
let light: BABYLON.DirectionalLight
let skeleton: BABYLON.Skeleton
let avatarNode: BABYLON.TransformNode
let obsRender: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>>
let posLerpAmount = 0
let isMoving = false
const rotationOffset = Math.PI

export enum Motion {
    IDLE = 1,
    LYING,
    RUNNING,
	DANCING
}

let currentState: Motion

export async function setupAvatar(_scene: BABYLON.Scene, _light: BABYLON.DirectionalLight) {
	scene = _scene
	light = _light
	await loadAvatar()
	setupMorphs(scene)
	setupLashes()
	setupHead()
	setupHair()
	setupShadows()
	setBlendSpeed(0.1)
	setAvatarState(Motion.IDLE)
}

export function showAvatar(toShow: boolean) {
	avatarNode.setEnabled(toShow)
}

export function setAvatarStartingPosition(id: string) {
	const mesh = scene.getMeshById(id)
	if (mesh) {
		avatarNode.setEnabled(true)
		avatarNode.position = new BABYLON.Vector3(mesh!.position.x,0.6,mesh!.position.z)
		setAvatarState(Motion.IDLE)
	}
}

export function setAvatarState(newState: Motion) {
	switch(newState) {
		case Motion.IDLE:
			if (currentState !== Motion.IDLE) {
				skeleton.beginAnimation("idle", true, 1)
				currentState = Motion.IDLE
			}
			break
		case Motion.RUNNING:
			if (currentState !== Motion.RUNNING) {
				skeleton.beginAnimation("run", true, 1)
				currentState = Motion.RUNNING
			}
			break
		case Motion.LYING:
			if (currentState !== Motion.LYING) {
				skeleton.beginAnimation("lie", true, 1)
				currentState = Motion.LYING
			}
			break
		case Motion.DANCING:
			if (currentState !== Motion.DANCING) {
				skeleton.beginAnimation("dance", true, 1)
				currentState = Motion.DANCING
			}
			break
	}
	currentState = newState
}

export function moveAvatar(blockID: string, nextState: Motion, speed: number = 1) {
	return new Promise((resolve) => {
		if (!isMoving) {
			isMoving = true
			avatarNode.position.y = 0.6
			const blockMesh = scene.getMeshById(blockID)
			if (blockMesh) {
				const newDest = new BABYLON.Vector3(blockMesh.position.x, avatarNode.position.y, blockMesh.position.z)
				const distance = BABYLON.Vector3.Distance(avatarNode.position,newDest) 
				const posAvatar = avatarNode.position.clone()
				posLerpAmount = 0
				setAvatarState(Motion.RUNNING)
				const angle = Math.atan2(newDest.x - posAvatar.x, newDest.z - posAvatar.z)
				avatarNode.rotation = new BABYLON.Vector3(0, rotationOffset + angle, 0)
				obsRender = scene.onBeforeRenderObservable.add(() => {
					const newPosition = BABYLON.Vector3.Lerp(posAvatar, newDest, posLerpAmount)		
					posLerpAmount += scene.getEngine().getDeltaTime() / (200 * distance / speed)
					if (posLerpAmount > 1) {
						posLerpAmount = 1
					}
					avatarNode.position = newPosition
					if (posLerpAmount === 1) {
						setAvatarState(nextState)
						obsRender!.remove()
						isMoving = false
						resolve('resolved')
					}
				})
			}
		} else {
			resolve('resolved')
		}
	})
}

async function loadAvatar() {
	const result = await BABYLON.SceneLoader.ImportMeshAsync("", "assets/avatar/", "lamborg.babylon", scene)
	avatarNode = new BABYLON.TransformNode("avatar", scene)
	result.meshes.forEach((mesh: BABYLON.AbstractMesh) => {
		mesh.isPickable = false
		mesh.parent = avatarNode
	})
	skeleton = result.skeletons[0]
	avatarNode.position.y = 0.6
	window["avatar" as any] = avatarNode as any
}

function setBlendSpeed(speed: number) {
	let overrides = new BABYLON.AnimationPropertiesOverride()
	overrides.enableBlending = true
	overrides.blendingSpeed = speed
	skeleton.animationPropertiesOverride = overrides	
}

// Need lighting set up before using this
function setupShadows() {
	let shadowGenerator = new BABYLON.ShadowGenerator(1024, light)
	const meshBody = scene.getMeshByName("body")
	const meshHair = scene.getMeshByName("hair")
	const meshHead = scene.getMeshByName("head")
	shadowGenerator.addShadowCaster(meshBody!, false)
	shadowGenerator.addShadowCaster(meshHair!, false)
	shadowGenerator.addShadowCaster(meshHead!, false)
	shadowGenerator.usePercentageCloserFiltering = true
	shadowGenerator.blurKernel = 1
	shadowGenerator.darkness = 0.1
}

function setupLashes() {
	const matLashes = scene.getMaterialByName("matLashes") as BABYLON.PBRMaterial
	matLashes.backFaceCulling = false
	matLashes.transparencyMode = 1
	matLashes.alphaMode = 2
	matLashes.emissiveColor = new BABYLON.Color3(0.03,0.03,0.03)
	matLashes.needDepthPrePass = true
}

function setupHead() {
	const matHead = scene.getMaterialByName("matHead") as BABYLON.PBRMaterial
	matHead.specularIntensity = 0
}

function setupHair() {
	const matHair = scene.getMaterialByName("matHair") as BABYLON.PBRMaterial
	matHair.backFaceCulling = false
	matHair.transparencyMode = 1
	matHair.alphaMode = 2
	matHair.needDepthPrePass = true
}

