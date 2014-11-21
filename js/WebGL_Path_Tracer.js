(function () {
    //import java.math.*;
    "use strict";
    /*global window,document,Float32Array,Uint16Array,mat4,vec3,snoise*/
    /*global getShaderSource,createWebGLContext,createProgram*/

    /******************************************************utility functions**********************************************************************/
    function cross(v1, v2) {
        return { x: v1.y * v2.z - v2.y * v1.z,
            y: v1.z * v2.x - v2.z * v1.x,
            z: v1.x * v2.y - v2.x * v1.y
        };
    }

    function normalize(v) {
        var l = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        return { x: v.x / l, y: v.y / l, z: v.z / l };
    }

    function add(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
    }

    function subtract(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
    }

    function length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }
    function multiply(v, l) {
        return { x: v.x * l, y: v.y * l, z: v.z * l };
    }


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
    var zoomZ = 2.5;

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
    var PixelLocation;

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

        PixelLocation = gl.getAttribLocation(shaderProgram, "aPixel");
        gl.enableVertexAttribArray(PixelLocation);

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

        //Calculate the position at corners
        var C = subtract(center, eye);
        //finding all the pixels on the screen
        var A = cross(C, up);
        var B = cross(A, C);
        var M = add(eye, C);

        var temp1 = Math.tan(FOVX * (Math.PI / 180.0));
        var temp2 = Math.tan(FOVY * (Math.PI / 180.0));
        var H = (multiply(A, (length(C) * Math.tan(FOVX * (Math.PI / 180.0)) / length(A))));
        var V = (multiply(B, (length(C) * Math.tan(FOVY * (Math.PI / 180.0)) / length(B))));

        //finding the corners of the screen
        var topLeft = add(add(M, V), (H));
        var botLeft = add(subtract(M, V), (H));
        var topRight = subtract(add(M, V), (H));
        var botRight = subtract(subtract(M, V), (H));

        var pixelBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, pixelBuffer);
        var corners = [];
        corners.push(topRight.x, topRight.y, topRight.z);
        corners.push(topLeft.x, topLeft.y, topLeft.z);
        corners.push(botRight.x, botRight.y, botRight.z);
        corners.push(botLeft.x, botLeft.y, botLeft.z);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(corners), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, pixelBuffer);
        gl.vertexAttribPointer(PixelLocation, 3, gl.FLOAT, false, 0, 0);

        gl.uniform3f(u_eyeLocation, eye.x, eye.y, eye.z);
        gl.uniform1f(u_timeLocation, time);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        time += 0.001;
        window.requestAnimFrame(animate);
    })();

} ());
