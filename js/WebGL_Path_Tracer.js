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
    var zoomZ = 5.5;

    var eye = { x: 0.0, y: 0.0, z: 0.0 };
    var center = { x: 0.0, y: 0.0, z: 0.0 };
    var up = { x: 0.0, y: 1.0, z: 0.0 };
    var FOVY = 45.0;
    var FOVX = 0.0;

    var yscaled = Math.tan(FOVY * (Math.PI / 180.0));
    var xscaled = (yscaled * canvas.width) / canvas.height;
    FOVX = (Math.atan(xscaled) * 180.0) / Math.PI;

    eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
    eye.y = zoomZ * Math.sin(angleX);
    eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);

    //Vertex Shader
    var VertexLocation;
    var u_veyeLocation;
    var u_vInvMPLocation;

    //Fragment Shader
    var u_eyeLocation;
    var u_timeLocation;

    //Added
    var stats;


    (function initializeShader() {
        var vs = getShaderSource(document.getElementById("vs"));
        var fs = getShaderSource(document.getElementById("fs"));

        shaderProgram = createProgram(gl, vs, fs, message);

        //Vertex Shader
        VertexLocation = gl.getAttribLocation(shaderProgram, "aVertex");
        gl.enableVertexAttribArray(VertexLocation);

        u_veyeLocation = gl.getUniformLocation(shaderProgram, "vcameraPos");
        u_vInvMPLocation = gl.getUniformLocation(shaderProgram, "u_vInvMP");

        //Fragment Shader
        u_eyeLocation = gl.getUniformLocation(shaderProgram, "cameraPos");
        u_timeLocation = gl.getUniformLocation(shaderProgram, "time");

        gl.useProgram(shaderProgram);
    })();



    (function initBuffers() {
        var vertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
        var vertices = [
         1.0, 1.0,
        -1.0, 1.0,
         1.0, -1.0,
        -1.0, -1.0,
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.vertexAttribPointer(VertexLocation, 2, gl.FLOAT, false, 0, 0);
    })();


    var time = 0;
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
            zoomZ = Math.min(Math.max(zoomZ, 2.5), 10.0);
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

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        time += 0.001;
        window.requestAnimFrame(animate);
    })();

} ());
