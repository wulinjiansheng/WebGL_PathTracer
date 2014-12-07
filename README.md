
WebGL PathTracer
================

Members
================
[Bo Zhang](https://www.linkedin.com/profile/view?id=285547985&authType=name&authToken=ZYUY&trk=prof-proj-cc-name) , [Ying Li](https://www.linkedin.com/profile/view?id=286055598&authType=NAME_SEARCH&authToken=fn9n&locale=en_US&trk=tyah2&trkInfo=tarId%3A1417916257233%2Ctas%3Aying%20li%2Cidx%3A1-1-1) <br />

INTRODUCTION:
================
In this project, we implement a WebGL version path-tracer. Most of computation of path tracer are written in the shader and we also add UI on the webpage which enables users to make their own scene.

###Features implemented:
- Basic path tracer
- Diffuse surfaces
- Diffuse reflection
- Fresnel Based Reflection & Refraction
- Camera interactivity
- Subsurface scattering (Fake)
- Super-Sample Anti alias

-------------------------------------------------------------------------------
Demo
-------------------------------------------------------------------------------
link to demo
link to page
http://wulinjiansheng.github.io/WebGL_PathTracer/

-------------------------------------------------------------------------------
CONTENTS:
-------------------------------------------------------------------------------
The root directory contains the following subdirectories:
	
* js/ contains the javascript files, including external libraries, necessary.
* assets/ contains the textures that will be used in the second half of the
  assignment.
* resources/ contains the screenshots found in this readme file.

-------------------------------------------------------------------------------
Control:
-------------------------------------------------------------------------------
The keyboard controls are as follows:
WASDRF - Movement (along w the arrow keys)
* W - Zoom in
* S - Zoom out
* A - Left
* D - Right
* R - Up
* F - Down
* ^ - Up
* v - Down
* < - Left
* > - Right

-------------------------------------------------------------------------------
Basic Features:
-------------------------------------------------------------------------------


-------------------------------------------------------------------------------
Implementation Details:
-------------------------------------------------------------------------------
1. WebGL framework
(1)ping pong textures
(2)texture parameters

2.path tracer


3. ui

-------------------------------------------------------------------------------
PERFORMANCE EVALUATION
-------------------------------------------------------------------------------
1. cuda webgl (default scene)
2. webgl (time for each part)
3. number of obj 
4. branch, primitive intersection (load time and run time)
5. unity function (transpose, inverse...)

-------------------------------------------------------------------------------
THIRD PARTY CODE POLICY
-------------------------------------------------------------------------------
* stas.js  
It's a library to visualize realize fps and timing.  
https://github.com/mrdoob/stats.js/
* random noise in GLSL:  
http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/

-------------------------------------------------------------------------------
ACKNOWLEDGEMENTS
-------------------------------------------------------------------------------
