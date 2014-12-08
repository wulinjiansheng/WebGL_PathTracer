window.onload = runGL;

"use strict";

var gl;
var canvas;
var message;

var shaderProgram;
var angleX = 0;
var angleY = 0;
var zoomZ = 15.5;

var eye = { x: 0.0, y: 0.0, z: 0.0 };
var center = { x: 0.0, y: 0.0, z: 0.0 };
var up = { x: 0.0, y: 1.0, z: 0.0 };
var FOVY = 45.0;

eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
eye.y = zoomZ * Math.sin(angleX);
eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);

//Texture
var textures;
var objattrtex;

//Vertex Shader
var VertexLocation;
var u_veyeLocation;
var u_vInvMPLocation;

//Fragment Shader
var u_numsLocation;
var u_eyeLocation;
var u_timeLocation;
var u_itrLocation;
var u_textureLocation;
var u_attrtextureLocation;
var u_texsizeLocation;
var u_attrtexsizeLocation;
var u_SSAALocation;
var u_texLocations = [];

//Added for attrtexture
//width and height must be pow(2,n)
var attw = 1024;  //width
var atth = 2; //height
var attributes = new Uint8Array(attw * atth * 4);
//bool for SSAA
var SSAA = 0;

//render shader
var renderProgram;
var renderVertexAttribute;
var vertexPositionBuffer;
var frameBuffer;
var u_textureLocationc;

var time = 0;
var iterations = 0;

var Datas = [];
var DefaultDatas = [];
var defaultSize = 6;

//Added
var stats = initStats();

///////////////////////////////////////////////////////////////////////////

function runGL() {
	var begin = Date.now();
	initGL();
	var end = Date.now();
	document.getElementById("time").innerHTML +=  "Initialize WebGL: " + (end-begin).toString() + " ms<br/>";
	
	begin = end;
	initializeShader();
	initBuffers();
	
	end = Date.now();
	document.getElementById("time").innerHTML +=  "Initialize Shader: " + (end-begin).toString() + " ms<br/>";
	
	initGUI();
	
	begin = end;
	initDfaultScene();
	end = Date.now();
	document.getElementById("time").innerHTML += "Load Scene: " + (end-begin).toString() + " ms";

	animate();
	
	//register
	canvas.onmousedown = handleMouseDown;
	canvas.oncontextmenu = function (ev) { return false; };
	document.onmouseup = handleMouseUp;
	document.onmousemove = handleMouseMove;
	document.onkeydown = handleKeyDown;
}

///////////////////////////////////////////////////////////////////////////

function initGL(){
	message = document.getElementById("message");
	canvas = document.getElementById("canvas");
	gl = createWebGLContext(canvas, message);
	
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
		return;
	}
	gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
}

function initBuffers() {
	vertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
	var vertices = [
	 1.0, 1.0,
	-1.0, 1.0,
	 1.0, -1.0,
	-1.0, -1.0,
	];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	gl.vertexAttribPointer(VertexLocation, 2, gl.FLOAT, false, 0, 0);


	frameBuffer = gl.createFramebuffer();
	var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

	textures = [];
	for (var i = 0; i < 2; i++) {
		textures.push(gl.createTexture());
		gl.bindTexture(gl.TEXTURE_2D, textures[i]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);
	}
	gl.bindTexture(gl.TEXTURE_2D, null);

	objattrtex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, objattrtex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);
}


function initializeShader() {
	//create render shader
	var renderVs = getShaderSource(document.getElementById("vs_render"));
	var renderFs = getShaderSource(document.getElementById("fs_render"));

	renderProgram = createProgram(gl, renderVs, renderFs, message);
	renderVertexAttribute = gl.getAttribLocation(renderProgram, 'aVertex');
	gl.enableVertexAttribArray(renderVertexAttribute);

	u_textureLocationc = gl.getUniformLocation(renderProgram, "texture");

	//create path tracer shader
	var vs = getShaderSource(document.getElementById("vs_pathTracer"));
	var fs = getShaderSource(document.getElementById("fs_pathTracer"));

	shaderProgram = createProgram(gl, vs, fs, message);

	//Vertex Shader
	VertexLocation = gl.getAttribLocation(shaderProgram, "aVertex");
	gl.enableVertexAttribArray(VertexLocation);

	u_veyeLocation = gl.getUniformLocation(shaderProgram, "vcameraPos");
	u_vInvMPLocation = gl.getUniformLocation(shaderProgram, "u_vInvMP");

	//Fragment Shader        
	u_timeLocation = gl.getUniformLocation(shaderProgram, "time");
	u_itrLocation = gl.getUniformLocation(shaderProgram, "u_iterations");
	//Don't k why this line doesn't work
	u_numsLocation = gl.getUniformLocation(shaderProgram, "objnums");
	u_eyeLocation = gl.getUniformLocation(shaderProgram, "cameraPos");


	u_textureLocation = gl.getUniformLocation(shaderProgram, "texture");
	u_attrtextureLocation = gl.getUniformLocation(shaderProgram, "attrtexture");
	u_texsizeLocation = gl.getUniformLocation(shaderProgram, "texsize");
	u_attrtexsizeLocation = gl.getUniformLocation(shaderProgram, "attrtexsize");
	u_SSAALocation = gl.getUniformLocation(shaderProgram, "SSAA");
}

function animate() {

	if (stats)
		stats.update();
	
	message.innerHTML = "Iterations: " + (iterations).toString();

	if (!pause || iterations == 0)
	{
		///////////////////////////////////////////////////////////////////////////
		// Render
		gl.useProgram(shaderProgram);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		var modelview = mat4.create();
		mat4.lookAt([eye.x, eye.y, eye.z], [center.x, center.y, center.z], [up.x, up.y, up.z], modelview);

		var projection = mat4.create();
		mat4.perspective(FOVY, canvas.width / canvas.height, 0.1, 100.0, projection);

		var modelviewprojection = mat4.create();
		mat4.multiply(projection, modelview, modelviewprojection);

		var inversemp = mat4.create();
		mat4.inverse(modelviewprojection, inversemp);
		
		gl.uniformMatrix4fv(u_vInvMPLocation, false, inversemp);
		gl.uniform3f(u_veyeLocation, eye.x, eye.y, eye.z);
		gl.uniform3f(u_eyeLocation, eye.x, eye.y, eye.z);
		gl.uniform1f(u_timeLocation, time);
		gl.uniform1f(u_itrLocation, iterations);
		gl.uniform1i(u_numsLocation, Datas.length);
		gl.uniform1i(u_SSAALocation, SSAA);
		//Added for texture size
		gl.uniform2f(u_texsizeLocation, canvas.width,canvas.height);
		gl.uniform2f(u_attrtexsizeLocation, attw, atth);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.uniform1i(u_textureLocation, 0);


		gl.activeTexture(gl.TEXTURE1);  //attributes for objects
		gl.bindTexture(gl.TEXTURE_2D, objattrtex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, attw, atth, 0, gl.RGBA, gl.UNSIGNED_BYTE, attributes);
		gl.uniform1i(u_attrtextureLocation, 1);


		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[1], 0);
		gl.vertexAttribPointer(VertexLocation, 2, gl.FLOAT, false, 0, 0);
		

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		textures.reverse();

		gl.useProgram(renderProgram);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.uniform1i(u_textureLocationc, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.vertexAttribPointer(renderVertexAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		iterations++;
		time += 1.0;
	
	}
	
	window.requestAnimFrame(animate);
}

///////////////////////////////////////////////////////////////////////////


function AddObjsAttr(i) {
    gl.useProgram(shaderProgram);
    //color:No need for map
    attributes[28 * i + 0] = 255.0 * Datas[i].obj_color[0]; attributes[28 * i + 1] = 255.0 * Datas[i].obj_color[1]; attributes[28 * i + 2] = 255.0 * Datas[i].obj_color[2]; attributes[28 * i + 3] = 255.0;
    //objtype:[0.0,5.0] to [0,255]  texturetype:[0.0,5.0] to [0,255] 
    attributes[28 * i + 4] = 255.0 * Datas[i].obj_type / 5.0; attributes[28 * i + 5] = 255.0 * Datas[i].obj_textureType / 5.0; attributes[28 * i + 6] = 255.0; attributes[28 * i + 7] = 255.0;
    //mat1:No need for map
    attributes[28 * i + 8] = 255.0 * Datas[i].obj_reflective; attributes[28 * i + 9] = 255.0 * Datas[i].obj_refractive; attributes[28 * i + 10] = 255.0 * Datas[i].obj_reflectivity; attributes[28 * i + 11] = 255.0;
    //mat2:IOR[0,3] to [0,255]  emittance [0,25] to [0,255]
    attributes[28 * i + 12] = 255.0/3.0 * Datas[i].obj_indexOfRefraction; attributes[28 * i + 13] = 255.0 * Datas[i].obj_subsurfaceScatter; attributes[28 * i + 14] = 255.0 * Datas[i].obj_emittance/25.0; attributes[28 * i + 15] = 255.0;
    //pos:[-10.0,10.0] to [0,255]
    var mind = -10.0;
    var maxd = 10.0;
    attributes[28 * i + 16] = 255.0 * (Datas[i].obj_pos[0] - mind) / (maxd - mind); attributes[28 * i + 17] = 255.0 * (Datas[i].obj_pos[1] - mind) / (maxd - mind);
    attributes[28 * i + 18] = 255.0 * (Datas[i].obj_pos[2] - mind) / (maxd - mind); attributes[28 * i + 19] = 255.0;
    //rot:[0.0,360.0] to [0,255]
    attributes[28 * i + 20] = 255.0 * Datas[i].obj_rotation[0] / 360.0; attributes[28 * i + 21] = 255.0 * Datas[i].obj_rotation[1] / 360.0; attributes[28 * i + 22] = 255.0 * Datas[i].obj_rotation[2]/360.0; attributes[28 * i + 23] = 255.0;
    //scale:[0.0,10.0] to [0,255]
    attributes[28 * i + 24] = 255.0 * Datas[i].obj_scale[0] / 10.0; attributes[28 * i + 25] = 255.0 * Datas[i].obj_scale[1] / 10.0; attributes[28 * i + 26] = 255.0 * Datas[i].obj_scale[2] / 10.0; attributes[28 * i + 27] = 255.0;

}

var cubeNum = 0;
function addCube() {
    if (Datas.length == 31)
        return;
	Datas.push({
		obj_pos: [Math.random()*10-5, Math.random()*10-5, Math.random()*10-5],
		obj_scale: [1.0, 1.0, 1.0],
		obj_rotation: [Math.random()*360, Math.random()*360, Math.random()*360],
		obj_color: [Math.random(), Math.random(), Math.random()],
		obj_type: 2,
		obj_textureType: 0,
		obj_reflective: 0,
		obj_refractive: 0,
		obj_reflectivity: 1.0,
		obj_indexOfRefraction: 1.0,
		obj_emittance: 0,
		obj_subsurfaceScatter: 0
	});

    AddObjsAttr(Datas.length - 1);

    GUIAddObj("Cube " + ++cubeNum, Datas.length - 1);
		
	iterations = 0;
}

var sphereNum = 3;

function addSphere() {
    if (Datas.length == 31)
        return;
	Datas.push({
		obj_pos: [Math.random()*10-5, Math.random()*10-5, Math.random()*10-5],
		obj_scale: [1.0, 1.0, 1.0],
		obj_rotation: [Math.random()*360, Math.random()*360, Math.random()*360],
		obj_color: [Math.random(), Math.random(), Math.random()],
		obj_type: 0,
		obj_textureType: 0,
		obj_reflective: 0,
		obj_refractive: 0,
		obj_reflectivity: 1.0,
		obj_indexOfRefraction: 1.0,
		obj_emittance: 0,
		obj_subsurfaceScatter: 0
	});

    AddObjsAttr(Datas.length - 1);

    GUIAddObj("Sphere " + ++sphereNum, Datas.length - 1);	

	iterations = 0;
}

function initDfaultScene() {
     
    //Light For Subsurface Scattering,only one light and always at first
    DefaultDatas.push({
        obj_pos: [0.0, 4.95, 0.0],
        obj_scale: [3.8, 0.1, 3.8],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [1.0, 1.0, 1.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 25,
        obj_subsurfaceScatter: 0
    });

    //Walls
    var WallScale = 10.0;
    var WallTrans = 5.0;

    DefaultDatas.push({
        obj_pos: [0.0, 0.0, -WallTrans+0.1],
        obj_scale: [WallScale, 1.0, WallScale],
        obj_rotation: [91.0, 0.0, 0.0],
        obj_color: [1.0, 1.0, 1.0],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [-WallTrans+0.1, 0.0, 0.0],
        obj_scale: [ WallScale,1.0, WallScale],
        obj_rotation: [0.0, 0.0, 271.0],
        obj_color: [0.75, 0.25, 0.25],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [WallTrans-0.1, 0.0, 0.0],
        obj_scale: [WallScale,1.0, WallScale],
        obj_rotation: [0.0, 0.0, 91.0],
        obj_color: [0.25, 0.25, 0.75],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });
    	
    DefaultDatas.push({
        obj_pos: [0.0, WallTrans, 0.0],
        obj_scale: [WallScale, 1.0, WallScale],
        obj_rotation: [180.0, 0.0, 0.0],
        obj_color: [0.75, 0.75, 0.75],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });
    	
    DefaultDatas.push({
        obj_pos: [0.0, -WallTrans, 0.0],
        obj_scale: [WallScale, 1.0, WallScale],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.75, 0.75, 0.75],
        obj_type: 1,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });


    //Sphere1
    DefaultDatas.push({
        obj_pos: [-2.0, 0.0, 0.0],
        obj_scale: [1.8, 1.8, 1.8],
        obj_rotation: [30.0, 4.0, 0.0],
        obj_color: [1.0, 0.0, 0.0],
        obj_type: 0,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    //Sphere2
    DefaultDatas.push({
        obj_pos: [0.0, 0.0, 0.0],
        obj_scale: [1.8, 1.8, 1.8],
        obj_rotation: [30.0, 4.0, 0.0],
        obj_color: [0.95, 0.5, 0.4],
        obj_type: 0,
        obj_textureType: 0,
        obj_reflective: 1,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 1
    });


    //Sphere3
    DefaultDatas.push({
        obj_pos: [2.0, 0.0, 0.0],
        obj_scale: [1.8, 1.8, 1.8],
        obj_rotation: [30.0, 4.0, 0.0],
        obj_color: [1.0, 1.0, 1.0],
        obj_type: 0,
        obj_textureType: 0,
        obj_reflective: 1,
        obj_refractive: 1,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 3.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 1
    });

	//Box
	 DefaultDatas.push({
		 obj_pos: [0.0, -1.5, 0.0],
		 obj_scale: [6.8, 0.2, 4.8],
		 obj_rotation: [0.0, 0.0, 0.0],
		 obj_color: [0.8, 0.8, 0.8],
		 obj_type: 2,
		 obj_textureType: 0,
		 obj_reflective: 0,
		 obj_refractive: 0,
		 obj_reflectivity: 1.0,
		 obj_indexOfRefraction: 1.0,
		 obj_emittance: 0,
		 obj_subsurfaceScatter: 0
     });

    //Legs
    var legpos1 = 3.0, legpos2 = 1.8;
    DefaultDatas.push({
        obj_pos: [legpos1, -3.5, legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [-legpos1, -3.5, legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [legpos1, -3.5, -legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });

    DefaultDatas.push({
        obj_pos: [-legpos1, -3.5, -legpos2],
        obj_scale: [0.3, 4.0, 0.3],
        obj_rotation: [0.0, 0.0, 0.0],
        obj_color: [0.9, 0.4, 0.0],
        obj_type: 2,
        obj_textureType: 0,
        obj_reflective: 0,
        obj_refractive: 0,
        obj_reflectivity: 1.0,
        obj_indexOfRefraction: 1.0,
        obj_emittance: 0,
        obj_subsurfaceScatter: 0
    });
    defaultScene();
}

function defaultScene() {
	Datas.length = 0;
	
	for (var i = 0; i < DefaultDatas.length; i++) {
			Datas[i] = DefaultDatas[i];
			AddObjsAttr(i);
	}
	
	iterations = 0;


	var node = document.getElementById("gui2");
	if (node != null)
		node.parentNode.removeChild(node);
	
	GUIDefaultScene();
}

function resize() {
	canvas.width = width;
	canvas.height = height;
	
	gl.viewport(0, 0, canvas.width, canvas.height);
	
	var type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, textures[0]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);
	
	gl.bindTexture(gl.TEXTURE_2D, textures[1]);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, canvas.width, canvas.height, 0, gl.RGB, type, null);
	
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	iterations = 0;
}



/////////////////////////////////////////////////////////////////////////////

/*************************** performance ***********************************/
function initStats() {
	stats = new Stats();
	stats.setMode(0); // 0: fps, 1: ms

	// Align top-left
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left ='200px';
	stats.domElement.style.top = '0px';

	document.body.appendChild(stats.domElement);


	return stats;
}

///////////////////////////////////////////////////////////////////////////

/************************* interaction ********************************/
var mouseLeftDown = false;
var mouseRightDown = false;
var mouseMidDown = false;
var lastMouseX = null;
var lastMouseY = null;

var pause = false;

function handleMouseDown(event) {
    if (event.button == 2) {
        mouseLeftDown = false;
        mouseRightDown = true;
        mouseMidDown = false;
    }
    else if (event.button == 0) {
        mouseLeftDown = true;
        mouseRightDown = false;
        mouseMidDown = false;
    }
    else if (event.button == 1) {
        mouseLeftDown = false;
        mouseRightDown = false;
        mouseMidDown = true;
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseLeftDown = false;
    mouseRightDown = false;
    mouseMidDown = false;
}

function handleMouseMove(event) {
    if (!(mouseLeftDown || mouseRightDown || mouseMidDown)) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    if (mouseLeftDown) {
        // update the angles based on how far we moved since last time
        angleY -= deltaX * 0.01;
        angleX += deltaY * 0.01;

        // don't go upside down
        angleX = Math.max(angleX, -Math.PI / 2 + 0.01);
        angleX = Math.min(angleX, Math.PI / 2 - 0.01);

        eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
        eye.y = zoomZ * Math.sin(angleX);
        eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);
    }
    else if (mouseRightDown) {
        zoomZ += 0.01 * deltaY;
        zoomZ = Math.min(Math.max(zoomZ, 4.0), 20.0);

        eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
        eye.y = zoomZ * Math.sin(angleX);
        eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);
    }
    else if (mouseMidDown) {
        center.x -= 0.01 * deltaX;
        center.y += 0.01 * deltaY;
        eye.x -= 0.01 * deltaX;
        eye.y += 0.01 * deltaY;
    }

    lastMouseX = newX;
    lastMouseY = newY;

    iterations = 0;
}

function handleKeyDown(event){
	if (event.keyCode == 32)
		pause = !pause;
}

var toHide = true;
function toggleContorller(){
	if (toHide)
	{
		document.getElementById("icon").style.background = 'url("left-arrow.png")';
		document.getElementById("gui-left").style.display = "none";
		document.getElementById("gui-right").style.display = "none";
	}
	else 
	{
		document.getElementById("icon").style.background = 'url("right-arrow.png")';
		document.getElementById("gui-left").style.display = "block";
		document.getElementById("gui-right").style.display = "block";
	}
	toHide = !toHide;
}


/////////////////////////////////////////////////////////////////////////
/*******************************GUI*************************************/
//gui
var gui1;
var guiConfig;

var gui2;
var guiObjs = [];

var width;
var height;

function initGUI() {
	width = canvas.width;
	height = canvas.height;

    //gui  
    gui1 = new dat.GUI({ autoPlace: false });
    var container = document.getElementById('gui-right');
    container.appendChild(gui1.domElement);

    guiConfig = new GUIConfig();

    gui1.add(guiConfig, 'width').onChange(function () {
        width = guiConfig.width;
    });
    gui1.add(guiConfig, 'height').onChange(function () {
        height = guiConfig.height;
    });
	
	gui1.add(guiConfig, 'antiAliasing').onChange(function () {
        SSAA = (guiConfig.antiAliasing == true) ? 1 : 0;
		iterations = 0;
    });
}

function GUIConfig() {
    this.width = width;
    this.height = height;
	
	this.antiAliasing = (SSAA == 1) ? true : false;
}

function GUIDefaultScene(){
	gui2 = new dat.GUI({ autoPlace: false });
	gui2.domElement.id = 'gui2';
    var container = document.getElementById('gui-left');
    container.appendChild(gui2.domElement);

    GUIAddObj("Light", 0);
    GUIAddObj("Sphere 1", defaultSize);
    GUIAddObj("Sphere 2", defaultSize+1);
    GUIAddObj("Sphere 3", defaultSize+2);
}

function GUIObj(id) {
    this.translateX = Datas[id].obj_pos[0];
    this.translateY = Datas[id].obj_pos[1];
    this.translateZ = Datas[id].obj_pos[2];
    this.scaleX = Datas[id].obj_scale[0];
    this.scaleY = Datas[id].obj_scale[1];
    this.scaleZ = Datas[id].obj_scale[2];
    this.rotateX = Datas[id].obj_rotation[0];
    this.rotateY = Datas[id].obj_rotation[1];
    this.rotateZ = Datas[id].obj_rotation[2];
    this.color = [Datas[id].obj_color[0] * 255.0, Datas[id].obj_color[1] * 255.0, Datas[id].obj_color[2] * 255.0];
    this.reflect = (Datas[id].obj_reflective == 1) ? true : false ;
    this.refract = (Datas[id].obj_refractive == 1) ? true : false ;
    this.IOR = Datas[id].obj_indexOfRefraction;
    this.emittance = Datas[id].obj_emittance;
    this.subsurfaceScatter = (Datas[id].obj_subsurfaceScatter == 1) ? true : false ;
};

function GUIAddObj(name, id) {
    var i = guiObjs.length;
    if (Datas.length == 31)
        return;

    guiObjs.push( new GUIObj(id));

    var folder = gui2.addFolder(name);

    folder.add(guiObjs[i], 'translateX').min(-5).max(5).onChange(function () {
        Datas[id].obj_pos[0] = guiObjs[i].translateX;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'translateY').min(-5).max(5).onChange(function () {
        Datas[id].obj_pos[1] = guiObjs[i].translateY;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'translateZ').min(-5).max(5).onChange(function () {
        Datas[id].obj_pos[2] = guiObjs[i].translateZ;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'scaleX').onChange(function () {
        Datas[id].obj_scale[0] = guiObjs[i].scaleX;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'scaleY').onChange(function () {
        Datas[id].obj_scale[1] = guiObjs[i].scaleY;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'scaleZ').onChange(function () {
        Datas[id].obj_scale[2] = guiObjs[i].scaleZ;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'rotateX').onChange(function () {
        Datas[id].obj_rotation[0] = guiObjs[i].rotateX;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'rotateY').onChange(function () {
        Datas[id].obj_rotation[1] = guiObjs[i].rotateY;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'rotateZ').onChange(function () {
        Datas[id].obj_rotation[2] = guiObjs[i].rotateZ;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.addColor(guiObjs[i], 'color').onChange(function () {
        Datas[id].obj_color = [guiObjs[i].color[0] / 255.0, guiObjs[i].color[1] / 255.0, guiObjs[i].color[2] / 255.0];
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'reflect').onChange(function () {
        Datas[id].obj_reflective = guiObjs[i].reflect;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'refract').onChange(function () {
        Datas[id].obj_refractive = guiObjs[i].refract;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'IOR').min(1).onChange(function () {
        Datas[id].obj_indexOfRefraction = guiObjs[i].IOR;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'emittance').onChange(function () {
        Datas[id].obj_emittance = guiObjs[i].emittance;
        AddObjsAttr(id);
        iterations = 0;
    });
    folder.add(guiObjs[i], 'subsurfaceScatter').onChange(function () {
        Datas[id].obj_subsurfaceScatter = guiObjs[i].subsurfaceScatter;
        AddObjsAttr(id);
        iterations = 0;
    });
}