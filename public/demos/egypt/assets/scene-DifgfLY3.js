import{B as X,a as j,S as Z,N as Y,P as ee,W as te,b as W,c as E,d as oe,G as ae,T as re,M as k,D as se,e as _,f as ne,g as q,A as ie,h as ce,i as le,j as pe,U as ue,O as de,V as I,k as N,l as ve}from"./three-ByGCVJc1.js";import{s as fe}from"./flight-DWMxIXUa.js";const xe=`
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
 const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
 vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
 vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
 vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
 i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
 float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
 vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
 vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
 vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
 vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
 vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
 vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
 vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
 p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
 vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
 m=m*m;return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`,me=`
uniform float uTime,uSize,uDpr;attribute float aSeed;varying float vLight;
${xe}
void main(){
 vec3 p=position;float t=uTime*.055;
 vec3 flow=vec3(p.xy*.17,aSeed*5.0+t);
 p.x=mod(p.x+uTime*(.04+aSeed*.07)+18.0,36.0)-18.0;
 p.y+=snoise(flow)*.8;p.x+=snoise(flow.yzx+7.0)*.65;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=clamp(uSize*uDpr*12.0/max(2.0,-mv.z),1.0,14.0);
 vLight=.55+.45*pow(max(0.0,sin(uTime*.28+aSeed*32.0)),6.0);
}`,he=`
uniform float uOpacity;varying float vLight;
void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
 float a=exp(-r*r*5.0)*(1.0-smoothstep(.65,1.0,r))*uOpacity*vLight;
 gl_FragColor=vec4(vec3(.76,.52,.23),a);
 #include <colorspace_fragment>
}`,ye="varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}",ge=`
#include <packing>
uniform sampler2D tScene,tDepth;
uniform vec2 uResolution;uniform float uBlur,uFlare,uVignette;
varying vec2 vUv;
void main(){
 float depth=texture2D(tDepth,vUv).x;
 float distance=-perspectiveDepthToViewZ(depth,.15,100.0);
 float coc=uBlur*smoothstep(4.0,16.0,distance);
 vec2 texel=1.0/uResolution;
 vec4 color=texture2D(tScene,vUv)*.2;
 for(int i=0;i<8;i++){
  float a=float(i)*.785398;vec2 offset=vec2(cos(a),sin(a))*texel*coc;
  color+=texture2D(tScene,vUv+offset)*.1;
 }
 vec2 sun=vec2(.94,.54);vec2 ray=sun-vUv;
 if(uFlare>.001){
  float light=0.0;
  for(int i=0;i<10;i++){vec3 c=texture2D(tScene,vUv+ray*float(i)*.085).rgb;light+=max(0.0,dot(c,vec3(.21,.72,.07))-.24)*.1;}
  float halo=exp(-length(ray)*3.5);float rays=pow(max(0.0,cos(atan(ray.y,ray.x)*16.0+length(ray)*6.0)),10.0);
  color.rgb+=vec3(1.0,.61,.26)*uFlare*(halo+light*(1.0+rays)*1.9);
 }
 float vignette=1.0-uVignette*smoothstep(.2,.72,length(vUv-.5));
 color.rgb*=vignette;
 gl_FragColor=color;
 #include <colorspace_fragment>
}`;function we({scene:p,count:T=360,reducedMotion:x=!1}){const y=[];let g=9384;const o=()=>(g=g*1664525+1013904223>>>0,g/4294967296);for(const[a,s,n,u]of[[-2,6,.12,.17],[-8,3,.33,.3],[-22,2,.55,.28]]){const r=Math.ceil(T*n),d=new Float32Array(r*3),w=new Float32Array(r);for(let i=0;i<r;i++)d.set([(o()-.5)*36,(o()-.5)*15,a+(o()-.5)*2],i*3),w[i]=o();const c=new X;c.setAttribute("position",new j(d,3)),c.setAttribute("aSeed",new j(w,1));const v=new Z({vertexShader:me,fragmentShader:he,uniforms:{uTime:{value:0},uOpacity:{value:0},uSize:{value:s},uDpr:{value:1}},transparent:!0,depthWrite:!1,depthTest:!1,blending:Y}),l=new ee(c,v);l.frustumCulled=!1,l.renderOrder=10,p.add(l),y.push({points:l,material:v,geometry:c,alpha:u})}return{update(a,s,n,u=1){for(const r of y)r.material.uniforms.uTime.value=x?0:a,r.material.uniforms.uOpacity.value=x?0:n*r.alpha,r.material.uniforms.uDpr.value=u},dispose(){for(const a of y)p.remove(a.points),a.geometry.dispose(),a.material.dispose()}}}async function be({canvas:p,context:T,assets:x,reducedMotion:y,onFallback:g}){const o=new te({canvas:p,context:T,alpha:!0,antialias:!1,powerPreference:"high-performance"});o.setClearColor(0,0),o.outputColorSpace=W;const a=new E,s=new oe(52.25,2.04,.15,100);s.position.z=10;const n=new ae;a.add(n);const u=[],r=[];let d=!1,w=!1,c=!1,v=1,l=1,i=1,m=fe(0),z=0,$=0;const H=new re;let h;try{h=await Promise.all([x.gateway,x.panorama||x.giza].map(async e=>{const t=await H.loadAsync(e);return t.colorSpace=W,r.push(t),t}))}catch(e){throw r.forEach(t=>t.dispose()),o.dispose(),e}const D=(e,t)=>(u.push(e,t),new N(e,t)),B=new k({map:h[0],transparent:!0,alphaTest:.025,color:16777215,side:se}),F=D(new _(20,9.808),B);F.renderOrder=2,n.add(F);const J=24.3*h[1].image.width/h[1].image.height,P=D(new _(J,24.3),new k({map:h[1],color:16777215}));P.position.set(.516,-.273,-20),n.add(P);const S=h[0].clone();S.needsUpdate=!0,S.repeat.set(.16,.8),S.offset.set(.015,.1),r.push(S);const M=new ne({map:S,color:9204569,roughness:1});u.push(M);for(const e of[-8.05,8.05]){const t=D(new q(3.9,9.808,2.5),M);t.position.set(e,0,-1.3),n.add(t)}const U=D(new q(20,.96,2.5),M);U.position.set(0,5.55,-1.3),n.add(U),a.add(new ie(16242349,1.7));const L=new ce(16764286,2.3);L.position.set(8,5,-3),a.add(L);const R=we({scene:a,count:window.innerWidth>900?360:160,reducedMotion:y}),f=new le(1,1,{depthBuffer:!0});f.depthTexture=new pe(1,1,ue);const O=new E,K=new de(-1,1,1,-1,0,1),b=new Z({vertexShader:ye,fragmentShader:ge,uniforms:{tScene:{value:f.texture},tDepth:{value:f.depthTexture},uResolution:{value:new I(1,1)},uBlur:{value:0},uFlare:{value:0},uVignette:{value:0}},depthWrite:!1,depthTest:!1}),A=new N(new _(2,2),b);O.add(A);const V=e=>{e.preventDefault(),d||g("context-lost")};p.addEventListener("webglcontextlost",V);function G(e,t,Q){v=Math.max(1,e),l=Math.max(1,t),i=Math.min(Q||1,1.5),o.setPixelRatio(i),o.setSize(v,l,!1);const C=o.getDrawingBufferSize(new I);f.setSize(C.x,C.y),b.uniforms.uResolution.value.copy(C),s.aspect=v/l,s.fov=ve.radToDeg(2*Math.atan(10/s.aspect/10)),n.scale.y=20/s.aspect/9.808,s.updateProjectionMatrix()}return{setFlight(e){m=e},setAmbient(e){c=e,n.visible=!e},resize:G,setPaused(e){w=e},render(e,t){if(!(d||w)){if(p.dataset.frames=String(++$),t>.027&&t<.2?z+=t:z=Math.max(0,z-t*.25),z>2.5&&i>.85&&(G(v,l,Math.max(.85,i-.2)),z=0),s.position.z=c?10:m.cameraZ,B.opacity=m.portalOpacity,R.update(e,t,c?.42:m.sandOpacity,i),c){o.setRenderTarget(null),o.render(a,s);return}b.uniforms.uBlur.value=m.backgroundBlur,b.uniforms.uFlare.value=m.flare,o.setRenderTarget(f),o.render(a,s),o.setRenderTarget(null),o.render(O,K)}},dispose(){if(!d){d=!0,p.removeEventListener("webglcontextlost",V),R.dispose();for(const e of new Set(u))e.dispose();r.forEach(e=>e.dispose()),f.depthTexture.dispose(),f.dispose(),A.geometry.dispose(),b.dispose(),o.dispose()}}}}export{be as createScene};
