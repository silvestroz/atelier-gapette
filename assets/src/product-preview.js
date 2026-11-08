import { sampleUploadedImage } from './customization.js';
import { samplePattern } from './patterns.js';
// Material-ID photography supplies the fabric, stitching and lighting.
// Only the pigment layer is replaced; no image-generation call occurs in use.
const rgb = hex => [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
// Compose a single curved decal in the visor's own coordinates, then project
// the entire plane. Both glyph shapes and spacing share this homography.
const letteringAreas={
  top:{center:[625.483848007078,683.3437468561909],rotation:-.20,depth:.68,shear:.16,px:.00045,py:-.00035,bend:-.00135},
  bottom:{center:[627.5809293711,505.252610312432],rotation:-.39,depth:.9,shear:.08,px:.00025,py:.0002,bend:.0005}
};
export function projectDecal(view,x,y){
  const a=letteringAreas[view],d=1+a.px*x+a.py*y;
  const u=(x+a.shear*y)/d,v=a.depth*y/d,c=Math.cos(a.rotation),s=Math.sin(a.rotation);
  return {x:a.center[0]+u*c-v*s,y:a.center[1]+u*s+v*c};
}
export function unprojectDecal(view,x,y){
  const a=letteringAreas[view],c=Math.cos(a.rotation),s=Math.sin(a.rotation);
  const dx=x-a.center[0],dy=y-a.center[1],v=(-dx*s+dy*c)/a.depth;
  const u=dx*c+dy*s-a.shear*v,d=1-a.px*u-a.py*v;
  return {x:u/d,y:v/d};
}
// ---------------------------------------------------------------------------
// decal-5 (0.11): the texts are laid out on the FLAT visor, in millimetres —
// the geometry that gets printed (flat view, future print file). Each photo
// view maps that flat visor onto its own decal plane (scale, slight rotation,
// offset, fitted so the flat visor lies on the photographed one); then
// projectDecal() adds the perspective.
// Flat frame: origin at mid-depth on the centre line, x to the right; letters
// stand upright toward −y. Top face: y from the seam (−) to the outer edge (+),
// read with the visor down. Underside (decal-6): the same frame mirrored — outer
// edge (−) up, seam (+) down — as it is read with the visor raised; see faceSign().
// Valento Summit visor measured by Adrien (18/10): 155 mm tip to tip, 55 mm
// deep at the centre. The crescent shape is approximated (tips 15 mm behind
// the seam, not measured). FACE must be refitted whenever VISOR changes:
// _dev/fit2.html?W=155&D=55&S=15 (coverage of the photographed visor: 64 % / 52 %).
// ---------------------------------------------------------------------------
export const VISOR={width:155,depth:55,setback:15,overhang:4,provisional:false};
const FACE={top:{k:3.73,t:-.06,ox:23,oy:-38},bottom:{k:2.39,t:.04,ox:17,oy:-18}};
/** +1 on the top face, −1 on the underside (its flat frame is mirrored: outer edge up). */
export const faceSign=view=>view==='bottom'?-1:1;
/** Font size (em) at 100 %, in mm. */
export const EM_MM=12;
/** Canvas pixels per mm used to measure and draw the flat lettering. */
export const PXMM=8;
const arcR=(chord,h)=>(chord*chord/4+h*h)/(2*h);
/** Outer edge and seam as circle arcs (centre y, radius), flat frame. */
export const VISOR_ARCS=(()=>{
  const {width:W,depth:D,setback:S}=VISOR,ro=arcR(W,D+S),ri=arcR(W,S);
  return {outer:{cy:D/2-ro,r:ro},seam:{cy:-D/2-ri,r:ri}};
})();
/** Closed outline of the flat visor (mm, top-face frame): outer edge, then seam. */
export const visorOutline=(()=>{
  const c=VISOR.width/2,{outer:o,seam:s}=VISOR_ARCS,pts=[],n=90;
  for(let i=0;i<=n;i++){const x=-c+2*c*i/n;pts.push([x,o.cy+Math.sqrt(o.r*o.r-x*x)]);}
  for(let i=n-1;i>0;i--){const x=-c+2*c*i/n;pts.push([x,s.cy+Math.sqrt(s.r*s.r-x*x)]);}
  return pts;
})();
const underOutline=visorOutline.map(([x,y])=>[x,-y]);
/** Outline of the visor in the flat frame of a face (the underside is mirrored). */
export const outlineFor=view=>view==='bottom'?underOutline:visorOutline;
/** Curvature of the centre line parallel to the outer edge: « Arrondi » at 100 % (top face; × faceSign). */
export const EDGE_BEND=-1/(2*(VISOR_ARCS.outer.r-VISOR.depth/2));
export function mmToLocal(view,x,y){const f=FACE[view],c=Math.cos(f.t),s=Math.sin(f.t);return {x:f.ox+f.k*(x*c-y*s),y:f.oy+f.k*(x*s+y*c)};}
export function localToMm(view,x,y){const f=FACE[view],c=Math.cos(f.t),s=Math.sin(f.t),dx=(x-f.ox)/f.k,dy=(y-f.oy)/f.k;return {x:dx*c+dy*s,y:-dx*s+dy*c};}
export const mmToPhoto=(view,x,y)=>{const l=mmToLocal(view,x,y);return projectDecal(view,l.x,l.y);};
export const photoToMm=(view,x,y)=>{const l=unprojectDecal(view,x,y);return localToMm(view,l.x,l.y);};
/**
 * decal-4 → decal-5 (0.11): configurations saved before 0.11 stored positions in
 * the photo's decal plane and sizes for a 41-unit em. Convert them to the flat
 * visor (mm) keeping the same place and printed size. Mirrored in
 * includes/class-ag-schema.php (upgrade_decal4): keep FACE and EM_MM identical.
 */
export function legacyToMm(view,t){
  const f=FACE[view],p=localToMm(view,t.position.x,t.position.y);
  return {
    position:{x:Math.round(p.x),y:Math.round(p.y)},
    size_percent:Math.round(t.size_percent*41/f.k/EM_MM),
    rotation:Math.round(t.rotation-f.t*180/Math.PI),
  };
}
/** Photo pixels (887 space) per mm near the visor centre. */
export const pxPerMm=view=>FACE[view].k;
function insideVisor(x,y){
  let a=false;const p=visorOutline;
  for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)a=!a;}
  return a;
}
function distanceToVisor(x,y){
  let d=Infinity;const p=visorOutline;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const [x1,y1]=p[j],[x2,y2]=p[i],dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy||1)));
    d=Math.min(d,Math.hypot(x-x1-t*dx,y-y1-t*dy));
  }
  return d;
}
/** Point (mm, flat frame of `view`) on the visor; not strict: up to VISOR.overhang mm beyond its edge. */
export function onVisor(x,y,strict=true,view='top'){y*=faceSign(view);return insideVisor(x,y)||(!strict&&distanceToVisor(x,y)<=VISOR.overhang);}
export function curveAt(view,t,offset={x:0,y:0}){
  const x=(t-.5)*120;
  return mmToPhoto(view,x+(offset.x||0),faceSign(view)*EDGE_BEND*x*x+(offset.y||0));
}
export function offsetForDrag(view,offset,dx,dy){
  const anchor=mmToPhoto(view,offset.x,offset.y);
  return photoToMm(view,anchor.x+dx,anchor.y+dy);
}
export function preparePhoto(ctx,image,view){
  const n=887,offset=view==='top'?0:image.width/2;
  ctx.drawImage(image,offset,0,image.width/2,image.height,0,0,n,n);
  const original=ctx.getImageData(0,0,n,n),pixels=original.data;
  const region=new Uint8Array(n*n),shade=new Float32Array(n*n),neutral=new Float32Array(n*n);
  const left=new Float32Array(n).fill(n),right=new Float32Array(n);
  for(let i=0;i<n*n;i++){
    const j=i*4,r=pixels[j],g=pixels[j+1],b=pixels[j+2];
    const lo=Math.min(r,g,b),hi=Math.max(r,g,b),chroma=hi-lo;
    if(chroma<25)continue;
    // Hue families: magenta side panel, green center, cyan bill, yellow piping.
    const material=(g>r*1.35&&g>b*1.35)?2:(r<g*.72&&r<b*.72)?3:(b<r*.72&&b<g*.72)?4:1;
    region[i]=material;
    // Average the active pigment channels to retain woven micro-contrast.
    const active=material===1?(r+b)/2:material===2?g:material===3?(g+b)/2:(r+g)/2;
    shade[i]=clamp((active-lo)/235);
    neutral[i]=lo;
    if(material===2){const y=Math.floor(i/n),x=i%n;left[y]=Math.min(left[y],x);right[y]=Math.max(right[y],x);}
  }
  // Continue the panel behind the curved band and raised bill: visible row
  // extents shrink at occlusion and must not squeeze the printed pattern.
  const smooth=(array,y)=>{
    let sum=0,count=0;
    for(let k=Math.max(70,y-5);k<=Math.min(n-1,y+5);k++){
      if(right[k]>left[k]){sum+=array[k];count++;}
    }
    return count?sum/count:array[y];
  };
  const panelLeft=new Float32Array(n),panelRight=new Float32Array(n);
  const la=smooth(left,430),ls=(la-smooth(left,370))/60;
  const ra=smooth(right,330),rs=(ra-smooth(right,270))/60;
  for(let y=0;y<n;y++){
    panelLeft[y]=y>430?la+(y-430)*ls:smooth(left,y);
    panelRight[y]=y>330?ra+(y-330)*rs:smooth(right,y);
  }
  const u=new Float32Array(n*n),v=new Float32Array(n*n);
  for(let i=0;i<n*n;i++){
    const x=i%n,y=Math.floor(i/n);
    if(region[i]===2){u[i]=.35+.3*(x-panelLeft[y])/Math.max(1,panelRight[y]-panelLeft[y]);v[i]=(y-70)/550;}
    else{
      // Compress motif spacing toward the curved crown boundary and skew with perspective.
      const ny=clamp((y-70)/550),bend=Math.sqrt(Math.max(.12,1-(1-ny)**2));
      u[i]=(x-35)/(730*bend)*.7+ny*.07;
      v[i]=ny+(x/887)*.2;
    }
  }
  const mask=ctx.createImageData(n,n);
  for(let i=0;i<n*n;i++){if(region[i]===3){mask.data[i*4]=mask.data[i*4+1]=mask.data[i*4+2]=255;mask.data[i*4+3]=255;}}
  // decal-4: texts may overhang the visor by OVERHANG px (887 space); the ink
  // itself is still cut at the visor edge (composeLit only paints region 3).
  const brim=new Uint8Array(n*n);for(let i=0;i<n*n;i++)brim[i]=region[i]===3?1:0;
  const near=dilate(brim,n,OVERHANG);
  return {n,original,region,shade,neutral,u,v,mask,near};
}
export const OVERHANG=18;
/** Square dilation (two separable passes with a sliding count). */
function dilate(src,n,r){
  const tmp=new Uint8Array(n*n),out=new Uint8Array(n*n);
  for(let y=0;y<n;y++){
    let count=0;const row=y*n;
    for(let x=0;x<Math.min(r,n);x++)count+=src[row+x];
    for(let x=0;x<n;x++){
      if(x+r<n)count+=src[row+x+r];
      if(x-r-1>=0)count-=src[row+x-r-1];
      tmp[row+x]=count>0?1:0;
    }
  }
  for(let x=0;x<n;x++){
    let count=0;
    for(let y=0;y<Math.min(r,n);y++)count+=tmp[y*n+x];
    for(let y=0;y<n;y++){
      if(y+r<n)count+=tmp[(y+r)*n+x];
      if(y-r-1>=0)count-=tmp[(y-r-1)*n+x];
      out[y*n+x]=count>0?1:0;
    }
  }
  return out;
}
export function buildPatternLayer(photo,pattern){
  const {region,u,v}=photo,layer=new Uint8Array(region.length),indices={base:0,accent:1,light:2};
  for(let i=0;i<region.length;i++)if(region[i]===1||region[i]===2){
    layer[i]=samplePattern(pattern,u[i],v[i],region[i],indices);
  }
  return layer;
}
export function colorPhoto(photo,state,ctx,customImage=null){
  const colors=Object.fromEntries(Object.entries(state.colors).map(([k,c])=>[k,rgb(c)]));
  const output=ctx.createImageData(photo.n,photo.n);output.data.set(photo.original.data);
  const {region,shade,neutral,u,v}=photo;
  // Geometry is fixed: cache each motif once so color changes stay responsive.
  photo.patternLayers??=new Map();
  if(!photo.patternLayers.has(state.pattern))photo.patternLayers.set(state.pattern,buildPatternLayer(photo,state.pattern));
  const layer=photo.patternLayers.get(state.pattern),pigments=[colors.base,colors.accent,colors.light];
  for(let i=0;i<region.length;i++){
    if(!region[i])continue;
    const c=region[i]===3?colors.brim:region[i]===4?colors.trim:state.pattern==='custom'&&customImage?sampleUploadedImage(customImage,u[i],v[i],state.imageSettings,colors.base):pigments[layer[i]];
    const j=i*4;
    for(let k=0;k<3;k++)output.data[j+k]=Math.min(255,c[k]*shade[i]+neutral[i]);
  }
  ctx.putImageData(output,0,0);
  return output;
}
export function letteringLayout(ctx,state,font){
  if(!state.text.trim()||state.placement!==state.view)return {glyphs:[],bounds:null};
  const offset=state.textOffsets?.[state.view]||{x:0,y:0};
  const chars=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(state.text),s=>s.segment):Array.from(state.text);
  const points=[];let length=0;
  // decal-5: everything in mm on the flat visor. Curvature 100 = parallel to the
  // outer edge, 0 = straight, negative = inverted arc; rotation in the visor
  // plane (0 = along the edge, ±90° = along the visor axis).
  const bend=faceSign(state.view)*EDGE_BEND*(Number.isFinite(state.curve)?state.curve:100)/100;
  const rot=(Number.isFinite(state.rotation)?state.rotation:0)*Math.PI/180,rc=Math.cos(rot),rs=Math.sin(rot);
  // the baseline runs well past the visor (±200 mm): fitTextSize() alone keeps
  // the text on the visor, so the size stored in the order is the printed size.
  for(let i=0;i<=600;i++){
    const x0=(i/600-.5)*400,y0=bend*x0*x0,x=x0*rc-y0*rs,y=x0*rs+y0*rc;
    if(i)length+=Math.hypot(x-points[i-1].x,y-points[i-1].y);
    points.push({x,y,length});
  }
  const size=EM_MM*state.size/100,track=size*.035;
  // measured at PXMM px per mm (canvas metrics are unreliable at tiny sizes)
  ctx.save();ctx.font=font.replace('SIZE',size*PXMM);ctx.textAlign='center';ctx.textBaseline='middle';
  const measure=()=>ctx.measureText(state.text).width/PXMM+track*(chars.length-1);
  const centerDistance=points[300].length;
  let distance=centerDistance-measure()/2,prefix='',previous=0;
  const glyphs=[],samples=[],localSamples=[];
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const char of chars){
    prefix+=char;const width=ctx.measureText(prefix).width/PXMM,advance=width-previous;
    const d=distance+advance/2;let i=1;while(i<points.length-1&&points[i].length<d)i++;
    const a=points[i-1],b=points[i],t=clamp((d-a.length)/(b.length-a.length));
    const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,angle=Math.atan2(b.y-a.y,b.x-a.x);
    glyphs.push({char,x,y,angle});
    if(char.trim()){
      const m=ctx.measureText(char),pad=(state.outline?size*.075/2:0)+.3;
      const left=-m.actualBoundingBoxLeft/PXMM-pad,right=m.actualBoundingBoxRight/PXMM+pad;
      const top=-m.actualBoundingBoxAscent/PXMM-pad,bottom=m.actualBoundingBoxDescent/PXMM+pad;
      for(const gx of [left,(left+right)/2,right])for(const gy of [top,(top+bottom)/2,bottom]){
        const lx=x+gx*Math.cos(angle)-gy*Math.sin(angle),ly=y+gx*Math.sin(angle)+gy*Math.cos(angle);
        localSamples.push([lx,ly]);const p=mmToPhoto(state.view,lx+offset.x,ly+offset.y);
        samples.push([p.x,p.y]);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
      }
    }
    previous=width;distance+=advance+track;
  }
  const resolvedFont=ctx.font;ctx.restore();
  // localSamples: flat lettering box points in mm, before the offset
  return {glyphs,samples,localSamples,offset,font:resolvedFont,size,bounds:samples.length?{x:minX,y:minY,width:maxX-minX,height:maxY-minY}:null};
}
/**
 * Draws the glyphs of a layout. Glyph positions are in mm; the drawing is
 * scaled to `scale` px per mm and translated by (tx, ty); `offset` (mm) is
 * added to every glyph (flat view: the text position; decal: none).
 */
export function paintGlyphs(ink,layout,state,outlineColor,scale,tx,ty,offset={x:0,y:0}){
  ink.save();ink.translate(tx,ty);ink.scale(scale/PXMM,scale/PXMM);
  ink.font=layout.font;ink.textAlign='center';ink.textBaseline='middle';ink.fillStyle=state.color;ink.strokeStyle=outlineColor;ink.lineJoin='round';ink.lineWidth=layout.size*.075*PXMM;
  for(const glyph of layout.glyphs){
    ink.save();ink.translate((glyph.x+offset.x)*PXMM,(glyph.y+offset.y)*PXMM);ink.rotate(glyph.angle);
    if(state.outline)ink.strokeText(glyph.char,0,0);ink.fillText(glyph.char,0,0);ink.restore();
  }
  ink.restore();
}
// Rasterize once on the flat visor, then inverse-map every output pixel (photo → mm).
let decalCanvas;
export function drawLettering(ctx,state,font,outlineColor){
  const layout=letteringLayout(ctx,state,font);if(!layout.glyphs.length)return layout;
  decalCanvas??=document.createElement('canvas');
  const pad=1;
  const xs=layout.localSamples.map(p=>p[0]),ys=layout.localSamples.map(p=>p[1]);
  const left=Math.floor(Math.min(...xs))-pad,top=Math.floor(Math.min(...ys))-pad;
  const width=Math.ceil(Math.max(...xs))-left+pad,height=Math.ceil(Math.max(...ys))-top+pad;
  decalCanvas.width=width*PXMM;decalCanvas.height=height*PXMM;
  const ink=decalCanvas.getContext('2d',{willReadFrequently:true});
  paintGlyphs(ink,layout,state,outlineColor,PXMM,-left*PXMM,-top*PXMM);
  const src=ink.getImageData(0,0,decalCanvas.width,decalCanvas.height),sw=src.width,sh=src.height;
  const b=layout.bounds,x0=Math.max(0,Math.floor(b.x)-2),y0=Math.max(0,Math.floor(b.y)-2);
  const w=Math.min(ctx.canvas.width-x0,Math.ceil(b.x+b.width)+2-x0),h=Math.min(ctx.canvas.height-y0,Math.ceil(b.y+b.height)+2-y0);
  if(w<=0||h<=0)return layout;
  const result=ctx.getImageData(x0,y0,w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=photoToMm(state.view,x0+x+.5,y0+y+.5);
    const sx=(p.x-layout.offset.x-left)*PXMM-.5,sy=(p.y-layout.offset.y-top)*PXMM-.5;
    const ix=Math.floor(sx),iy=Math.floor(sy);if(ix<0||iy<0||ix>=sw-1||iy>=sh-1)continue;
    const fx=sx-ix,fy=sy-iy,weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
    const indices=[(iy*sw+ix)*4,(iy*sw+ix+1)*4,((iy+1)*sw+ix)*4,((iy+1)*sw+ix+1)*4];
    let alpha=0;const rgb=[0,0,0];
    for(let n=0;n<4;n++){const a=src.data[indices[n]+3]/255*weights[n];alpha+=a;for(let k=0;k<3;k++)rgb[k]+=src.data[indices[n]+k]*a;}
    if(!alpha)continue;
    const j=(y*w+x)*4,under=result.data[j+3]/255*(1-alpha),out=alpha+under;
    for(let k=0;k<3;k++)result.data[j+k]=(rgb[k]+result.data[j+k]*under)/out;
    result.data[j+3]=out*255;
  }
  ctx.putImageData(result,x0,y0);return layout;
}
// decal-5: "on the visor" is decided on the flat visor (mm), the same test for
// the flat view, the 3/4 view and the print geometry.
function layoutFits(photo,ctx,state,font,offset,strict=false){
  const layout=letteringLayout(ctx,{...state,textOffsets:{...state.textOffsets,[state.view]:offset}},font);
  return (layout.localSamples||[]).every(([x,y])=>onVisor(x+offset.x,y+offset.y,strict,state.view));
}
/** True when part of the text box lies beyond the visor edge (that part is not printed). */
export function overhangs(photo,ctx,state,font,offset){return !layoutFits(photo,ctx,state,font,offset,true);}
export const MIN_SIZE=30;
/**
 * Largest size (≤ requested, ≥ MIN_SIZE) at which the centred text stays on the
 * visor. Needed once the text can be rotated along the (short) visor axis.
 */
export function fitTextSize(photo,ctx,state,font){
  if(!state.text.trim()||state.placement!==state.view)return state.size;
  const at=size=>layoutFits(photo,ctx,{...state,size},font,{x:0,y:0});
  if(at(state.size))return state.size;
  let lo=MIN_SIZE,hi=state.size;
  if(!at(lo))return lo;
  for(let i=0;i<7;i++){const mid=(lo+hi)/2;if(at(mid))lo=mid;else hi=mid;}
  return Math.max(MIN_SIZE,Math.floor(lo));
}
/** Text position in whole mm, pulled back toward the centre until it fits. */
export function resolveTextPosition(photo,ctx,state,font,requested){
  const candidate={x:Math.round(clamp(requested.x,-100,100)),y:Math.round(clamp(requested.y,-45,45))};
  const fits=offset=>layoutFits(photo,ctx,state,font,offset);
  if(fits(candidate))return candidate;
  let low=0,high=1,safe={x:0,y:0};
  for(let i=0;i<10;i++){
    const t=(low+high)/2,point={x:Math.round(candidate.x*t),y:Math.round(candidate.y*t)};
    if(fits(point)){safe=point;low=t;}else high=t;
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Lit lettering (v0.3). The ink is treated like any other pigment of the
// material-ID photo: out = ink × shade + neutral, so the text inherits the
// visor's folds, stitching and lighting instead of sitting flat on top.
// Embroidery adds a thread relief (bevel from the blurred ink alpha), a fine
// satin texture and a soft contact shadow on the fabric.
// ---------------------------------------------------------------------------
export function composeLit(photo,base,ink,x0,y0){
  // base / ink: ImageData of the same region (x0,y0,w,h); base is modified in place.
  // Printed ink behaves like the fabric pigment: out = ink × shade + neutral.
  const n=photo.n,{region,shade,neutral}=photo,src=ink.data,dst=base.data,w=base.width,h=base.height;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const gi=(y+y0)*n+x+x0;if(region[gi]!==3)continue;
    const j=(y*w+x)*4,a=src[j+3]/255;if(!a)continue;
    const f=shade[gi],nb=neutral[gi];
    for(let k=0;k<3;k++)dst[j+k]=dst[j+k]*(1-a)+Math.min(255,src[j+k]*f+nb)*a;
  }
  return base;
}

export class ProductPreview{
  /**
   * @param {HTMLElement} element  viewer container
   * @param {HTMLElement} error    inline error element
   * @param {Function} onTextMove  called with (view, offset) when the text is moved/clamped
   * @param {{materialsUrl:string}} options
   */
  constructor(element,error,onTextMove=()=>{},options={}){
    this.element=element;this.error=error;this.photos={};this.tinted={};this.tintedData={};this.cache={};this.onTextMove=onTextMove;this.customImage=null;this.imageVersion=0;
    this.onFit=options.onFit||(()=>{});this.effectiveSize={};
    this.editable=options.editable!==false; // 0.11: false = preview only (texts are placed on the flat view)
    this.onPickText=options.onPickText||(()=>{});this.onLayerMove=options.onLayerMove||(()=>{});this.onSelectText=options.onSelectText||(()=>{});this.onBlank=options.onBlank||(()=>{});this.onRender=options.onRender||(()=>{});
    this.abort=new AbortController();
    this.canvas=document.createElement('canvas');this.canvas.width=this.canvas.height=887;this.canvas.setAttribute('aria-hidden','true');element.append(this.canvas);
    this.context=this.canvas.getContext('2d');
    this.scratch=document.createElement('canvas');this.scratch.width=this.scratch.height=887;this.scratchCtx=this.scratch.getContext('2d',{willReadFrequently:true});
    this.bindTextDragging();
    this.element.setAttribute('aria-busy','true');
    const image=this.image=new Image();
    image.onload=()=>{
      if(this.destroyed)return;
      try{
        for(const view of ['top','bottom']){
          const canvas=document.createElement('canvas');canvas.width=canvas.height=887;
          this.photos[view]=preparePhoto(canvas.getContext('2d',{willReadFrequently:true}),image,view);this.tinted[view]=canvas;
        }
        this.ready=true;this.element.removeAttribute('aria-busy');this.render();
        this.warmPatterns();
      }catch(e){this.fail(e);}
    };
    image.onerror=()=>this.fail(new Error('materials'));
    image.src=options.materialsUrl;
    this.observer=new ResizeObserver(()=>this.fit());this.observer.observe(element);
    document.fonts?.ready.then(()=>{if(!this.destroyed)this.invalidate();});
  }
  /** Precompute the motif layers of both views in idle time (first switch becomes instant). */
  warmPatterns(){
    const ids=['peloton','stripe','check','dot','chevron','plain','breton','wave','confetti','tartan','sprint','contour'],jobs=[];
    for(const view of ['top','bottom'])for(const id of ids)jobs.push([view,id]);
    const idle=window.requestIdleCallback||(cb=>setTimeout(()=>cb({timeRemaining:()=>8}),60));
    const step=deadline=>{
      if(this.destroyed)return;
      while(jobs.length&&deadline.timeRemaining()>4){
        const [view,id]=jobs.shift(),photo=this.photos[view];
        photo.patternLayers??=new Map();
        if(!photo.patternLayers.has(id))photo.patternLayers.set(id,buildPatternLayer(photo,id));
      }
      if(jobs.length)this.idle=idle(step);
    };
    this.idle=idle(step);
  }
  /**
   * Oriented box of the current text, in canvas pixels (887 space): the frame
   * follows the text's own rotation, then the visor perspective.
   * Returns null when no text is shown on the current view.
   */
  textFrame(pad=9,index=null){
    // index: another text of the current view (hit testing); default: the active text
    const entry=index===null?null:this.cache[this.state?.view]?.infos?.[index];
    const info=entry?entry.info:this.inkInfo,st=entry?entry.state:this.state;
    if(index!==null&&!entry)return null;
    if(!info?.bounds||!st||st.view!==st.placement||!info.localSamples?.length)return null;
    const rot=(st.rotation||0)*Math.PI/180,c=Math.cos(rot),s=Math.sin(rot),off=info.offset;
    let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
    for(const [x,y] of info.localSamples){const u=x*c+y*s,v=-x*s+y*c;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
    // samples are in mm (decal-5); paddings are given in photo pixels
    const k=pxPerMm(st.view),pm=pad/k;
    u0-=pm;u1+=pm;v0-=pm;v1+=pm;
    const P=(u,v)=>mmToPhoto(st.view,u*c-v*s+off.x,u*s+v*c+off.y);
    return {
      quad:[P(u0,v0),P(u1,v0),P(u1,v1),P(u0,v1)],
      center:P((u0+u1)/2,(v0+v1)/2),
      rotate:P((u0+u1)/2,v0-34/k),topMid:P((u0+u1)/2,v0),
      resize:P(u1,v1),
      local:{u0,u1,v0,v1,offset:{...off}},
    };
  }
  pointInFrame(p,margin=0,index=null){
    const f=this.textFrame(9+margin,index);if(!f)return false;
    // point-in-convex-quad (same sign for all edge cross products)
    let sign=0;
    for(let i=0;i<4;i++){const a=f.quad[i],b=f.quad[(i+1)%4],cr=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);if(cr){if(sign&&Math.sign(cr)!==sign)return false;sign=Math.sign(cr);}}
    return true;
  }
  /** Canvas px → px relative to the viewer element (uses the target layout, not the CSS transition). */
  toViewer(p){
    const st=this.canvas.style,size=parseFloat(st.width)||this.element.clientWidth,k=size/887;
    return {x:(parseFloat(st.left)||0)+p.x*k,y:(parseFloat(st.top)||0)+p.y*k};
  }
  /** Client (pointer) coordinates → flat visor coordinates (mm) of the current view. */
  clientToLocal(clientX,clientY){
    const r=this.canvas.getBoundingClientRect();
    return photoToMm(this.state.view,(clientX-r.left)*887/r.width,(clientY-r.top)*887/r.height);
  }
  /** Forget cached layouts (e.g. once web fonts finish loading). */
  invalidate(){this.cache={};this.fitCache=new Map();this.render();}
  fail(e){
    this.element.removeAttribute('aria-busy');
    if(this.error)this.error.hidden=false;
    if(window.console)console.error('[Atelier Gapette]',e);
  }
  update(state,font,outlineColor){
    this.state={...state,colors:{...state.colors},textOffsets:{top:{...state.textOffsets?.top},bottom:{...state.textOffsets?.bottom}},layers:state.layers?JSON.parse(JSON.stringify(state.layers)):null};this.font=font;this.outlineColor=outlineColor;
    if(!this.pending){this.pending=true;this.raf=requestAnimationFrame(()=>{this.pending=false;this.render();});}
  }
  fit(){
    if(!this.state)return;
    const w=this.element.clientWidth,h=this.element.clientHeight;
    let size=Math.min(w,h)*1.02;
    let x=(w-size)/2,y=(h-size)/2;
    if(this.state.detail){
      size=Math.min(w/.67,h/.43);
      const anchor=curveAt(this.state.view,.5);
      const focus=[anchor.x/887,anchor.y/887];
      x=w/2-focus[0]*size;y=h/2-focus[1]*size;
    }
    Object.assign(this.canvas.style,{width:`${size}px`,height:`${size}px`,left:`${x}px`,top:`${y}px`});
    this.onRender();
  }
  setImage(image){this.customImage=image;this.imageVersion++;this.colorKeys={};}
  bindTextDragging(){
    const signal=this.abort.signal;
    const position=event=>{
      const rect=this.canvas.getBoundingClientRect();
      return {x:(event.clientX-rect.left)*887/rect.width,y:(event.clientY-rect.top)*887/rect.height};
    };
    this.canvas.addEventListener('pointerdown',event=>{
      if(event.button!==0||!this.state)return;
      const onText=this.state.view===this.state.placement&&this.inkInfo?.bounds&&this.pointInFrame(position(event),15);
      if(!this.editable){
        // preview only: a click on another text of this face makes it the active one
        const infos=this.cache[this.state.view]?.infos||{},pt=position(event);
        const other=onText?undefined:Object.keys(infos).map(Number).find(i=>i!==this.activeIndex()&&this.pointInFrame(pt,15,i));
        if(other!==undefined){event.preventDefault();this.onPickText(other);}
        return;
      }
      if(!onText){
        // another text of this face: it becomes the active one
        const infos=this.cache[this.state.view]?.infos||{},pt=position(event);
        const other=Object.keys(infos).map(Number).find(i=>i!==this.activeIndex()&&this.pointInFrame(pt,15,i));
        if(other!==undefined){event.preventDefault();this.onPickText(other);return;}
        if(this.state.moveText)this.onBlank();return;
      }
      // pressing the text selects it (direct editing) and starts a drag
      if(!this.state.moveText){this.state.moveText=true;this.onSelectText();}
      const p=position(event),offset=this.state.textOffsets[this.state.view];
      event.preventDefault();this.drag={pointer:event.pointerId,start:p,offset:{...offset}};this.canvas.setPointerCapture(event.pointerId);
    },{signal});
    this.canvas.addEventListener('pointermove',event=>{
      if(!this.drag||this.drag.pointer!==event.pointerId)return;
      event.preventDefault();const p=position(event);
      this.moveTextTo(offsetForDrag(this.state.view,this.drag.offset,p.x-this.drag.start.x,p.y-this.drag.start.y));
    },{signal});
    const end=event=>{if(this.drag?.pointer===event.pointerId){this.drag=null;if(this.canvas.hasPointerCapture(event.pointerId))this.canvas.releasePointerCapture(event.pointerId);}};
    this.canvas.addEventListener('pointerup',end,{signal});this.canvas.addEventListener('pointercancel',end,{signal});this.canvas.addEventListener('lostpointercapture',()=>{this.drag=null;},{signal});
  }
  moveTextTo(requested){
    if(!this.ready||!this.inkInfo)return;
    const view=this.state.view,sized={...this.state,size:this.cache[view]?.fits?.[this.activeIndex()]??this.state.size};
    const offset=resolveTextPosition(this.photos[view],this.scratchCtx,sized,this.font,requested);
    this.state.textOffsets[view]=offset;this.onTextMove(view,offset);this.render();
  }
  /** Lit composite of one view for the current state (cached). */
  /** Recolour a view only when it is needed (the hidden view waits until shown). */
  tint(view){
    const state=this.state,key=JSON.stringify([state.colors,state.pattern,state.imageSettings,this.imageVersion]);
    this.colorKeys??={};
    if(this.colorKeys[view]!==key){this.tintedData[view]=colorPhoto(this.photos[view],state,this.tinted[view].getContext('2d'),this.customImage);this.colorKeys[view]=key;}
    return key;
  }
  activeIndex(){return this.state?.layers?.length?(this.state.active||0):0;}
  /** Texts shown on a view: the active one comes from the live (flat) state. */
  layersFor(view){
    const st=this.state,list=st.layers?.length?st.layers:[null],active=this.activeIndex();
    return list.map((l,i)=>i===active||l===null?{...st,view,index:i,active:true}:{...st,...l,view,index:i,active:false})
      .filter(l=>l.placement===view&&String(l.text).trim());
  }
  composite(view){
    const colorKey=this.tint(view),photo=this.photos[view],fits={},over={},prepared=[];
    this.fitCache??=new Map();
    for(const L of this.layersFor(view)){
      const font=L.active?this.font:L.fontCanvas,outline=L.active?this.outlineColor:L.outlineColor;
      const fitKey=JSON.stringify([view,L.text,L.size,L.curve,L.rotation,L.outline,font]);
      let size=this.fitCache.get(fitKey);
      if(size===undefined){size=fitTextSize(photo,this.scratchCtx,L,font);if(this.fitCache.size>60)this.fitCache.clear();this.fitCache.set(fitKey,size);}
      const state={...L,size};fits[L.index]=size;
      if(L.active){const k=view+':'+L.index;if(this.effectiveSize[k]!==size){this.effectiveSize[k]=size;this.onFit(view,size,L.index);}}
      let offset=state.textOffsets?.[view];if(!Number.isFinite(offset?.x))offset={x:0,y:0};
      const safe=resolveTextPosition(photo,this.scratchCtx,state,font,offset);
      if(safe.x!==offset.x||safe.y!==offset.y){
        offset=safe;
        if(L.active){this.state.textOffsets[view]=safe;this.onTextMove(view,safe);}else this.onLayerMove(L.index,view,safe);
      }
      state.textOffsets={...state.textOffsets,[view]:offset};
      prepared.push({state,font,outline,offset});
    }
    const key=JSON.stringify([colorKey,view,this.activeIndex(),prepared.map(p=>[p.state.index,p.state.text,p.state.size,p.state.curve,p.state.rotation,p.state.outline,p.state.color,p.font,p.outline,p.offset])]);
    const c=this.cache[view];
    if(c&&c.key===key)return c;
    const ink=this.scratchCtx;
    const canvas=c?.canvas||document.createElement('canvas');canvas.width=canvas.height=887;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(this.tinted[view],0,0);
    const infos={};let activeInfo={glyphs:[],bounds:null};
    for(const p of prepared){
      ink.clearRect(0,0,887,887);
      const info=drawLettering(ink,p.state,p.font,p.outline);
      infos[p.state.index]={info,state:p.state};
      if(p.state.active)activeInfo=info;
      over[p.state.index]=overhangs(photo,this.scratchCtx,p.state,p.font,p.offset);
      const bd=info.bounds;
      if(bd){ // only the lettering region is recomposed
        const x0=Math.max(1,Math.floor(bd.x)-6),y0=Math.max(1,Math.floor(bd.y)-6);
        const w=Math.min(886,Math.ceil(bd.x+bd.width)+6)-x0,h=Math.min(886,Math.ceil(bd.y+bd.height)+6)-y0;
        if(w>0&&h>0){
          const out=composeLit(photo,ctx.getImageData(x0,y0,w,h),ink.getImageData(x0,y0,w,h),x0,y0);
          ctx.putImageData(out,x0,y0);
        }
      }
    }
    return (this.cache[view]={key,canvas,info:activeInfo,infos,fits,over});
  }
  /** Compose both faces so that every text has its fitted size (before reading the configuration). */
  settle(){
    if(!this.ready||!this.state)return null;
    const out={fits:{},over:{}};
    for(const view of ['top','bottom']){const c=this.composite(view);Object.assign(out.fits,c.fits);Object.assign(out.over,c.over);}
    return out;
  }
  render(){
    if(!this.ready||!this.state||this.destroyed)return;
    try{
      const {state}=this;
      const c=this.composite(state.view);this.inkInfo=c.info;
      const ctx=this.context;ctx.clearRect(0,0,887,887);ctx.drawImage(c.canvas,0,0);
      if(this.error)this.error.hidden=true;
      this.element.classList.toggle('moving-text',!!state.moveText&&state.view===state.placement);this.fit();
    }catch(e){this.fail(e);}
  }
  /**
   * Both views side by side, for the order preview (JPEG/PNG data URL).
   * Returns null until the photo is ready.
   */
  snapshot({width=960,type='image/jpeg',quality=.86,views=['top','bottom']}={}){
    if(!this.ready||!this.state)return null;
    const cell=Math.round(width/views.length),out=document.createElement('canvas');
    out.width=cell*views.length;out.height=cell;const ctx=out.getContext('2d');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,out.width,out.height);
    views.forEach((v,i)=>ctx.drawImage(this.composite(v).canvas,i*cell,0,cell,cell));
    if(views.length>1){const names={top:'DESSUS DE LA VISIÈRE',bottom:'DESSOUS DE LA VISIÈRE'};ctx.font=`600 ${Math.round(cell/34)}px Arial, sans-serif`;ctx.fillStyle='#555555';ctx.textAlign='center';views.forEach((v,i)=>ctx.fillText(names[v]||'',i*cell+cell/2,cell-Math.round(cell/30)));}
    return out.toDataURL(type,quality);
  }
  destroy(){
    this.destroyed=true;this.abort.abort();this.observer?.disconnect();
    if(this.raf)cancelAnimationFrame(this.raf);
    if(this.idle){(window.cancelIdleCallback||clearTimeout)(this.idle);}
    if(this.image){this.image.onload=this.image.onerror=null;}
    this.canvas.remove();this.cache={};this.photos={};this.tinted={};this.tintedData={};
  }
}
