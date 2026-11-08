export async function decodeImageFile(file){
  if(!file)throw new Error('Choisissez une image.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choisissez une image JPG, PNG ou WebP.');
  if(file.size>10*1024*1024)throw new Error('Cette image dépasse 10 Mo. Choisissez un fichier plus léger.');
  let bitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}
  catch{throw new Error('Cette image ne peut pas être lue. Essayez un autre fichier JPG, PNG ou WebP.');}
  try{
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    return {width:canvas.width,height:canvas.height,data:ctx.getImageData(0,0,canvas.width,canvas.height).data};
  }finally{bitmap.close();}
}
export function sampleUploadedImage(image,u,v,settings,base){
  const zoom=settings.scale/100,side=Math.min(image.width,image.height)/zoom;
  const cx=image.width/2+(settings.x/100)*(image.width-side)/2;
  const cy=image.height/2+(settings.y/100)*(image.height-side)/2;
  const x=Math.max(0,Math.min(image.width-1,cx+(Math.max(0,Math.min(1,u))-.5)*side));
  const y=Math.max(0,Math.min(image.height-1,cy+(Math.max(0,Math.min(1,v))-.5)*side));
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(image.width-1,x0+1),y1=Math.min(image.height-1,y0+1),fx=x-x0,fy=y-y0;
  const samples=[[(y0*image.width+x0)*4,(1-fx)*(1-fy)],[(y0*image.width+x1)*4,fx*(1-fy)],[(y1*image.width+x0)*4,(1-fx)*fy],[(y1*image.width+x1)*4,fx*fy]];
  const result=[0,0,0];
  for(const [i,weight] of samples){
    const alpha=image.data[i+3]/255;
    for(let k=0;k<3;k++)result[k]+=(image.data[i+k]*alpha+base[k]*(1-alpha))*weight;
  }
  return result;
}
export function inkSamples(ctx){
  const {width,height}=ctx.canvas,data=ctx.getImageData(0,0,width,height).data;
  const points=[];let minX=width,minY=height,maxX=0,maxY=0;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>10){
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    if((x+y)%2===0)points.push([x,y]);
  }
  return {points,bounds:points.length?{x:minX,y:minY,width:maxX-minX,height:maxY-minY}:null};
}
export function constrainTextOffset(photo,points,requested,previous={x:0,y:0}){
  const candidate={x:Math.max(-160,Math.min(160,Math.round(requested.x))),y:Math.max(-100,Math.min(100,Math.round(requested.y)))};
  const fits=offset=>points.every(([px,py])=>{
    const x=Math.round(px+offset.x),y=Math.round(py+offset.y),n=photo.n;
    return x>2&&y>2&&x<n-3&&y<n-3&&photo.region[y*n+x]===3&&photo.region[y*n+x-2]===3&&photo.region[y*n+x+2]===3&&photo.region[(y-2)*n+x]===3&&photo.region[(y+2)*n+x]===3;
  });
  if(!points.length)return {x:0,y:0};
  if(fits(candidate))return candidate;
  const start=fits(previous)?previous:{x:0,y:0};
  let low=0,high=1;
  for(let i=0;i<12;i++){
    const t=(low+high)/2,offset={x:start.x+(candidate.x-start.x)*t,y:start.y+(candidate.y-start.y)*t};
    if(fits(offset))low=t;else high=t;
  }
  return {x:Math.round(start.x+(candidate.x-start.x)*low),y:Math.round(start.y+(candidate.y-start.y)*low)};
}
