(function () {
    //import java.math.*;
    "use strict";
    /*global window,document,Float32Array,Uint16Array,mat4,vec3,snoise*/
    /*global getShaderSource,createWebGLContext,createProgram*/

    //main
    var message = document.getElementById("message");
    var canvas = document.getElementById("canvas");
    var gl = createWebGLContext(canvas, message);


    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
        return;
    }

    ///////////////////////////////////////////////////////////////////////////

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

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
	
	var textures;
	
    //Vertex Shader
    var VertexLocation;
    var u_veyeLocation;
    var u_vInvMPLocation;

    //Fragment Shader
    var currobjnum = 0;
    var maxobjnum = 10;
    var u_numsLocation;
    var u_eyeLocation;
    var u_timeLocation;
	var u_itrLocation;
    var u_objcolorsLocation = [];
    var u_objtypesLocation = []; //type, textureType
    var u_objmat1Location = []; //reflective,refractive,reflectivity
    var u_objmat2Location = []; //indexOfRefraction,subsurfaceScatter, emittance
    var u_objmodelviewLocation = [];
    var u_objinvmodelviewLocation = [];
    var u_objinvtransmodelviewLocation = [];
	
	
	//render shader
	var renderProgram;
	var renderVertexAttribute;
	var vertexPositionBuffer;
	var frameBuffer;

    //Added
    var stats;
	
	(function initBuffers() {
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
		for(var i = 0; i < 2; i++) {
			textures.push(gl.createTexture());
			gl.bindTexture(gl.TEXTURE_2D, textures[i]);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 512, 512, 0, gl.RGB, type, null);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		
		
    })();
	
	function compileSource(source, type) {
	  var shader = gl.createShader(type);
	  gl.shaderSource(shader, source);
	  gl.compileShader(shader);
	  return shader;
	}

	function compileShader(vertexSource, fragmentSource) {
	  var shaderProgram = gl.createProgram();
	  gl.attachShader(shaderProgram, compileSource(vertexSource, gl.VERTEX_SHADER));
	  gl.attachShader(shaderProgram, compileSource(fragmentSource, gl.FRAGMENT_SHADER));
	  gl.linkProgram(shaderProgram);
	  return shaderProgram;
	}

    (function initializeShader() {
		//create render shader
		var renderVs = getShaderSource(document.getElementById("vs_render"));
		var renderFs = getShaderSource(document.getElementById("fs_render"));
		
		//renderProgram = compileShader(renderVs, renderFs);
		renderProgram = createProgram(gl, renderVs, renderFs, message);
		renderVertexAttribute = gl.getAttribLocation(renderProgram, 'aVertex');
		gl.enableVertexAttribArray(renderVertexAttribute);
		
		
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

        //uniforms for objects
        for (var i = 0; i < maxobjnum; i++) {
            u_objcolorsLocation.push(gl.getUniformLocation(shaderProgram, "u_objcolors[" + i.toString(10) + "]"));
            u_objtypesLocation.push(gl.getUniformLocation(shaderProgram, "u_objtypes[" + i.toString(10) + "]"));
            u_objmat1Location.push(gl.getUniformLocation(shaderProgram, "u_objmat1[" + i.toString(10) + "]"));
            u_objmat2Location.push(gl.getUniformLocation(shaderProgram, "u_objmat2[" + i.toString(10) + "]"));
            u_objmodelviewLocation.push(gl.getUniformLocation(shaderProgram, "u_objmodelview[" + i.toString(10) + "]"));
            u_objinvmodelviewLocation.push(gl.getUniformLocation(shaderProgram, "u_objinvmodelview[" + i.toString(10) + "]"));
            u_objinvtransmodelviewLocation.push(gl.getUniformLocation(shaderProgram, "u_objinvtransmodelview[" + i.toString(10) + "]"));
        }
        gl.useProgram(shaderProgram);
		
		
    })();

    var Datas = [];


    (function DefaultScene() {
        var DefaultDatas = [];
        //Walls
        var WallScale = 10.0;
        var WallTrans = 5.0;
        Datas.push({
            obj_pos: [0.0, 0.0, -WallTrans],
            obj_scale: [WallScale, WallScale, 0.1],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [0.0, 1.0, 0.0],
            obj_type: 2,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 0,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);

        //Walls
        Datas.push({
            obj_pos: [WallTrans, 0.0, 0.0],
            obj_scale: [0.1, WallScale, WallScale],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [1.0, 1.0, 0.0],
            obj_type: 2,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 0,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);


        //Walls
        Datas.push({
            obj_pos: [-WallTrans, 0.0, 0.0],
            obj_scale: [0.1, WallScale, WallScale],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [1.0, 1.0, 0.0],
            obj_type: 2,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 0,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);

        //Walls
        Datas.push({
            obj_pos: [0.0, -WallTrans, 0.0],
            obj_scale: [WallScale, 0.1, WallScale],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [0.0, 0.0, 1.0],
            obj_type: 2,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 0,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);


        //Walls
        Datas.push({
            obj_pos: [0.0, WallTrans, 0.0],
            obj_scale: [WallScale, 0.1, WallScale],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [0.0, 0.0, 1.0],
            obj_type: 2,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 0,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);

        //Sphere
        Datas.push({
            obj_pos: [-3.0, 1.0, 0.0],
            obj_scale: [3.3, 3.3, 3.3],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [0.8, 0.0, 0.0],
            obj_type: 0,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 0,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);

        //Light
        Datas.push({
            obj_pos: [0.0,4.95, 0.0],
            obj_scale: [2.8, 0.1, 1.8],
            obj_rotation: [0.0, 0.0, 0.0],
            obj_color: [1.0, 1.0, 1.0],
            obj_type: 2,
            obj_textureType: 0,
            obj_reflective: 0,
            obj_refractive: 0,
            obj_reflectivity: 1.0,
            obj_indexOfRefraction: 1.0,
            obj_emittance: 15,
            obj_subsurfaceScatter: 0
        });
        DefaultDatas.push(Datas[currobjnum++]);


        //Box
        Datas.push({
            obj_pos: [2.0, 0.0, 0.0],
            obj_scale: [1.8, 1.8, 1.8],
            obj_rotation: [40.0, 40.0, 0.0],
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
        DefaultDatas.push(Datas[currobjnum++]);

        for (var i = 0; i < DefaultDatas.length; i++) {
            gl.uniform3f(u_objcolorsLocation[i], DefaultDatas[i].obj_color[0], DefaultDatas[i].obj_color[1], DefaultDatas[i].obj_color[2]);
            gl.uniform2f(u_objtypesLocation[i], DefaultDatas[i].obj_type, DefaultDatas[i].obj_textureType);
            gl.uniform3f(u_objmat1Location[i], DefaultDatas[i].obj_reflective, DefaultDatas[i].obj_refractive, DefaultDatas[i].obj_reflectivity);
            gl.uniform3f(u_objmat2Location[i], DefaultDatas[i].obj_indexOfRefraction, DefaultDatas[i].obj_subsurfaceScatter, DefaultDatas[i].obj_emittance);

            var modelv = mat4.create();
            mat4.identity(modelv);
            var objtrans = mat4.create();
            var translatev = DefaultDatas[i].obj_pos;
            mat4.translate(modelv, translatev, objtrans);
            var rotangle = DefaultDatas[i].obj_rotation;
            mat4.rotate(objtrans, rotangle[0] * Math.PI / 180.0, [1.0, 0.0, 0.0], objtrans);
            mat4.rotate(objtrans, rotangle[1] * Math.PI / 180.0, [0.0, 1.0, 0.0], objtrans);
            mat4.rotate(objtrans, rotangle[2] * Math.PI / 180.0, [0.0, 0.0, 1.0], objtrans);
            var scalev = DefaultDatas[i].obj_scale;
            mat4.scale(objtrans, scalev, objtrans);

            var inversmodelv = mat4.create();
            mat4.inverse(objtrans, inversmodelv);

            var transinversmodelv = mat4.create();
            mat4.transpose(inversmodelv, transinversmodelv);

            gl.uniformMatrix4fv(u_objmodelviewLocation[i], false, objtrans);
            gl.uniformMatrix4fv(u_objinvmodelviewLocation[i], false, inversmodelv);
            gl.uniformMatrix4fv(u_objinvtransmodelviewLocation[i], false, transinversmodelv);
        }
    })();


    


    var time = 0;
	var iterations = 0;
    var mouseLeftDown = false;
    var mouseRightDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    function handleMouseDown(event) {
        if (event.button == 2) {
            mouseLeftDown = false;
            mouseRightDown = true;
        }
        else {
            mouseLeftDown = true;
            mouseRightDown = false;
        }
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    function handleMouseUp(event) {
        mouseLeftDown = false;
        mouseRightDown = false;
    }

    function handleMouseMove(event) {
        if (!(mouseLeftDown || mouseRightDown)) {
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
        }
        else {
            zoomZ += 0.01 * deltaY;
            zoomZ = Math.min(Math.max(zoomZ, 5.5), 20.0);
        }

        eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
        eye.y = zoomZ * Math.sin(angleX);
        eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);

        lastMouseX = newX;
        lastMouseY = newY;
    }

    canvas.onmousedown = handleMouseDown;
    canvas.oncontextmenu = function (ev) { return false; };
    document.onmouseup = handleMouseUp;
    document.onmousemove = handleMouseMove;

    //Added
    function initStats() {
        stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms

        // Align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';

        document.body.appendChild(stats.domElement);


        return stats;
    }


    // Function called when the window is loaded
    window.onload = function () {
        stats = initStats();
    };


    (function animate() {

        if (stats)
            stats.update();
        ///////////////////////////////////////////////////////////////////////////
        // Update


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

		/*
        //        for (var i = 0; i < 1; i++) {
        //            gl.uniform3f(u_objcolorsLocation[i], 1.0, 0.0, 0.0);
        //            gl.uniform2f(u_objtypesLocation[i], 1.0, 0.0);
        //            gl.uniform3f(u_objmat1Location[i], 0.0, 0.0, 0.0);
        //            gl.uniform3f(u_objmat2Location[i], 1.0, 0.0, 0.0);

        //            var modelv = mat4.create();
        //            mat4.identity(modelv);
        //            var objtrans = mat4.create();
        //            var translatev = [-1.0, 1.0, 0.0];
        //            mat4.translate(modelv, translatev, objtrans);
        //            var rotangle = [0.0, 0.0, 0.0];
        //            mat4.rotate(objtrans, rotangle[0] * Math.PI / 180.0, [1.0, 0.0, 0.0], objtrans);
        //            mat4.rotate(objtrans, rotangle[1] * Math.PI / 180.0, [0.0, 1.0, 0.0], objtrans);
        //            mat4.rotate(objtrans, rotangle[2] * Math.PI / 180.0, [0.0, 0.0, 1.0], objtrans);
        //            var scalev = [2.3, 2.3, 2.3];
        //            mat4.scale(objtrans, scalev, objtrans);

        //            var inversmodelv = mat4.create();
        //            mat4.inverse(objtrans, inversmodelv);

        //            var transinversmodelv = mat4.create();
        //            mat4.transpose(inversmodelv, transinversmodelv);

        //            gl.uniformMatrix4fv(u_objmodelviewLocation[i], false, objtrans);
        //            gl.uniformMatrix4fv(u_objinvmodelviewLocation[i], false, inversmodelv);
        //            gl.uniformMatrix4fv(u_objinvtransmodelviewLocation[i], false, transinversmodelv);
        //        }
*/

        gl.uniformMatrix4fv(u_vInvMPLocation, false, inversemp);
        gl.uniform3f(u_veyeLocation, eye.x, eye.y, eye.z);
        gl.uniform3f(u_eyeLocation, eye.x, eye.y, eye.z);
        gl.uniform1f(u_timeLocation, time);
		gl.uniform1f(u_itrLocation, iterations);
        gl.uniform1i(u_numsLocation, currobjnum);
		
		
		//gl.useProgram(shaderProgram);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, textures[1], 0);
		gl.vertexAttribPointer(VertexLocation, 2, gl.FLOAT, false, 0, 0);
		
		
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		  
		textures.reverse();
		
		gl.useProgram(renderProgram);
		gl.bindTexture(gl.TEXTURE_2D, textures[0]);
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
		gl.vertexAttribPointer(renderVertexAttribute, 2, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		
		
		iterations++;
        time += 1.0;
        window.requestAnimFrame(animate);
    })();

} ());
