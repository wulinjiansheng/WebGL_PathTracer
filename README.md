
WebGL PathTracer
================

Members
-------------------
[Bo Zhang](https://www.linkedin.com/pub/bo-zhang/7b/767/815) , [Ying Li](https://www.linkedin.com/in/liying3) <br />

Introduction
-------------------
In this project, we implement a WebGL version path-tracer. Most of computation of path tracer are written in the shader and we also add UI on the webpage which enables users to make their own scene.

####Features implemented:
- Basic path tracer
- Diffuse surfaces
- Diffuse reflection
- Fresnel Based Reflection & Refraction
- Camera interactivity
- Subsurface scattering (Fake)
- Super-Sample Anti alias
- Realtime Add new primitives

Screenshots
-------------------
#### Final Result(5000 iterations):
![Alt text](https://github.com/wulinjiansheng/WebGL_PathTracer/blob/master/Pics/FinalResultFromWebGL.bmp)
<br />
#### Debug views:
- Initray Direction Test<br />
![Alt text](https://github.com/wulinjiansheng/WebGL_PathTracer/blob/master/Pics/DebugRayDir.bmp)
<br /><br />
- Intersection Normal Test<br />
![Alt text](https://github.com/wulinjiansheng/WebGL_PathTracer/blob/master/Pics/DebugIntersectNormal.bmp)
<br /><br />
- Intersection Position Test<br />
![Alt text](https://github.com/wulinjiansheng/WebGL_PathTracer/blob/master/Pics/DebugIntersectPos.bmp)
<br /><br />
- Intersection Geometry Color Test<br />
![Alt text](https://github.com/wulinjiansheng/WebGL_PathTracer/blob/master/Pics/DebugIntersectMatColor.bmp)
<br /><br />
- Intersection Geometry Emittance Test<br />
![Alt text](https://github.com/wulinjiansheng/WebGL_PathTracer/blob/master/Pics/DebugIntersectMatEmit.bmp)
<br /><br />


Demo
-------------------
[WebGL PathTracer](http://wulinjiansheng.github.io/WebGL_PathTracer/)


Implementation Details:
-------------------
####1. WebGL framework
- Ping-pong textures
We use Ping-pong technique to mix each iteration's image with previous result. That we store the previous iteration's image in texture0 and after path tracer computation we mix texture0's color with the new computed result color and store this new iteration's image in texture1. Then we exchange texture0 and texture1 and run the next iteration, so on and so forth. 

- Texture parameters
We store the objects' information in a texture and in the shader we read objects' parameters from this texture. More specifically, every 7 pixels of the texture image store one object's information. This enables us to pass only one uniform to pass all the objects' information, which enables users to add as many objects as they want in the scene. 
<br /><br />
Store Pattern
|Pixel | Object's Parameter
|------|----------
|0| `Color`
|1|  `Objtype,Texturetype`
|2| `Refelective,Refractive`
|3| `IOR,Subsurface Scattering,Emittance`
|4| `Translation`
|5| `Rotation`
|6| `Scale`


###2. Path tracer


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
