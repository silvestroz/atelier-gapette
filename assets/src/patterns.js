// One pigment sampler drives both the swatches and the photographed panels.
export const patterns=[
  {id:'peloton',name:'Peloton'},{id:'stripe',name:'Rayures'},
  {id:'check',name:'Damier'},{id:'dot',name:'Pois'},
  {id:'chevron',name:'Échappée'},{id:'plain',name:'Uni'},
  {id:'breton',name:'Marinière'},{id:'wave',name:'Ondulations'},
  {id:'confetti',name:'Confettis'},{id:'tartan',name:'Tartan'},
  {id:'sprint',name:'Sprint'},{id:'contour',name:'Topographie'}
];
// Palette ids are stable (used by the UI and analytics, not by the order data,
// which stores the five resolved colors).
export const palettes=[
  {id:'encre-citron',name:'Encre & citron',base:'#17343d',accent:'#d7ed71',light:'#f6f4e8'},
  {id:'bleu-creme',name:'Bleu & crème',base:'#294cba',accent:'#f0c775',light:'#fff8e9'},
  {id:'rouge-rose',name:'Rouge & rose',base:'#b52f3e',accent:'#ffc3cc',light:'#fff0e5'},
  {id:'noir-blanc',name:'Noir & blanc',base:'#272929',accent:'#f5f5ed',light:'#929a93'},
  {id:'retro-course',name:'Rétro course',base:'#692a3d',accent:'#eb9b40',light:'#f5e6be'},
  {id:'foret',name:'Forêt',base:'#164f43',accent:'#d3d38b',light:'#f5f3dc'},
  {id:'riviera',name:'Riviera',base:'#126f93',accent:'#f68f65',light:'#fff0d2'},
  {id:'ultraviolet',name:'Ultraviolet',base:'#3e227e',accent:'#dd80ec',light:'#c6f676'}
];
const fract=x=>x-Math.floor(x);
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
export function samplePattern(pattern,u,v,region,colors){
  if(pattern==='plain')return colors.base;
  if(pattern==='peloton'){
    if(region===1||(region===0&&(u<.35||u>.65)))return colors.base;
    return u<.371||u>.629?colors.light:colors.accent;
  }
  if(pattern==='breton'){
    const band=fract(v*9);
    return band<.20?colors.accent:band>.68&&band<.76?colors.light:colors.base;
  }
  if(pattern==='wave'){
    const band=fract(v*7+.3*Math.sin(u*15));
    return band<.25?colors.accent:band>.46&&band<.56?colors.light:colors.base;
  }
  if(pattern==='confetti'){
    const sx=u*13,sy=v*11,cx=Math.floor(sx),cy=Math.floor(sy);
    const seed=hash(cx,cy),x=fract(sx)-.5,y=fract(sy)-.5;
    const angle=seed*Math.PI*2,dx=x*Math.cos(angle)+y*Math.sin(angle),dy=-x*Math.sin(angle)+y*Math.cos(angle);
    const inside=seed<.5?Math.abs(dx)<.13&&Math.abs(dy)<.31:dy>-.25&&dy<.27&&Math.abs(dx)<(.27-dy)*.55;
    return inside?(seed<.5?colors.accent:colors.light):colors.base;
  }
  if(pattern==='tartan'){
    const x=fract(u*7),y=fract(v*7);
    if(Math.abs(x-.5)<.022||Math.abs(y-.5)<.022)return colors.light;
    if(x<.22||y<.22)return colors.accent;
    return colors.base;
  }
  if(pattern==='sprint'){
    const lane=fract((u-v*.7)*5);
    return lane<.30?colors.accent:lane>.40&&lane<.46?colors.light:colors.base;
  }
  if(pattern==='contour'){
    const field=2.2*Math.sin(u*8)+1.2*Math.cos(v*7)+.7*Math.sin((u+v)*11);
    const ring=fract(field*2.1);
    return ring<.07?(Math.floor(field*2.1)%3===0?colors.light:colors.accent):colors.base;
  }
  let on=false;
  if(pattern==='stripe')on=fract((u-v*.45)*8)<.43;
  else if(pattern==='check')on=(Math.floor(u*10)+Math.floor(v*10))%2===0;
  else if(pattern==='dot'){
    const row=Math.floor(v*9),dx=fract(u*10+(row%2)*.5)-.5,dy=fract(v*9)-.5;
    on=dx*dx+dy*dy<.045;
  }else if(pattern==='chevron')on=fract(v*7-Math.abs(fract(u*3)-.5)*1.5)<.36;
  return on?colors.accent:colors.base;
}
export function drawPattern(ctx,id,p,width,height){
  const colors=Object.fromEntries(['base','accent','light'].map(key=>[key,[1,3,5].map(i=>parseInt(p[key].slice(i,i+2),16))]));
  const image=ctx.createImageData(width,height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const color=samplePattern(id,x/width,y/width,0,colors),i=(y*width+x)*4;
    image.data[i]=color[0];image.data[i+1]=color[1];image.data[i+2]=color[2];image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);
}
