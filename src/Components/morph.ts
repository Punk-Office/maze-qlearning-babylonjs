import * as BABYLON from 'babylonjs'
import * as MATERIALS from 'babylonjs-materials'

let scene: BABYLON.Scene
let morphTarget: BABYLON.MorphTarget
let morphDefault: BABYLON.Texture
let morphBlink: BABYLON.Texture
let morphAmount = 0
let isEyeClosing = true

export function setupMorphs(_scene: BABYLON.Scene) {
	scene = _scene
	loadAtlas()
	window["morph" as any] = updateMorph as any
}

function loadAtlas() {
	morphDefault = new BABYLON.Texture("assets/avatar/whole.jpg", scene, true, true, 3, () => {
		morphBlink = new BABYLON.Texture("assets/avatar/blink.jpg", scene, true, true, 3, () => {
			setupSkin()
			setupBlinking()
			blinkLoop()
		})
	})
}

function setupBlinking() {
	const meshHead = scene.getMeshByName("head")
	morphTarget = meshHead!.morphTargetManager?.getTarget(0)!
}

function blink() {	
	const morphDiff = 0.2
	setTimeout(() => {
		if (isEyeClosing) {
			let influence = morphTarget.influence += morphDiff
			if (influence > 1) influence = 1
			updateMorph(influence)
			if (influence === 1) {
				isEyeClosing = false
			}
			blink()
		} else {
			let influence = morphTarget.influence -= morphDiff
			if (influence < 0) influence = 0
			updateMorph(influence)
			if (influence === 0) {
				blinkLoop()
			} else {
				blink()
			}
		}
	}, 10)
}

function blinkLoop() {
	setTimeout(() => {
		isEyeClosing = true
		blink()
	}, Math.random() * 3000 + 2000)
}

function updateMorph(amount: number) {
	morphTarget.influence = amount
	morphAmount = amount
}

function setupSkin() {
	const meshHead = scene.getMeshByName("head")
	var matCustom = new MATERIALS.CustomMaterial("skin",scene)
	matCustom.AddUniform('texDefault','sampler2D',null) 
	matCustom.AddUniform('texBlink','sampler2D',null) 
	matCustom.AddUniform('percentBlink','float',0)

	matCustom.Fragment_Definitions(`      
	vec4 getTextureFromAtlasMap(sampler2D txtRef_0,vec2 pos,vec2 vuv){

	vec2 size = vec2(4096.,4096.);
	vec2 SIZE = vec2(8192.,8192.);
	float uv_w = size.x / SIZE.x;  
	float uv_h = size.y / SIZE.y;   
	float uv_x = pos.x / SIZE.x ;    
	float uv_y = 1.- pos.y / SIZE.y -uv_h; 

	vec2 newUvAtlas = vec2( mod( vuv.x*uv_w, uv_w )+uv_x, mod(vuv.y*uv_h, uv_h)+uv_y  ); 
	vec4 color  = texture2D(txtRef_0 ,newUvAtlas.xy*vec2(1.,1.)+vec2(0.,0.));

	return color ;
	} `)

	matCustom.diffuseTexture = morphDefault    
	matCustom.specularColor = BABYLON.Color3.Black()
	matCustom.emissiveColor = BABYLON.Color3.White()

	matCustom.onBindObservable.add(function () { 
		matCustom.getEffect().setTexture('texDefault', morphDefault)
		matCustom.getEffect().setTexture('texBlink', morphBlink)
		matCustom.getEffect().setFloat('percentBlink', morphAmount)
	});

	matCustom.Fragment_Before_FragColor(`
		vec4 colDefault = texture2D(texDefault, vDiffuseUV);
		vec4 colBlink = texture2D(texBlink, vDiffuseUV);

		color = colBlink*percentBlink + (1.-percentBlink)*colDefault;
	`);
	(meshHead!.material as any).subMaterials[1] = matCustom
}