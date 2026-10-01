import { enemies,towers } from '../shared/catalog';
const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
let id=100;const uid=()=>`0:${id++}`;
const props=new Map<string,string>();
const strings=['gold','lives','wave','level','status','action','remaining','selection','details','previewTitle','connection','snapshot','command',...towers.map((_,i)=>'towerLabel'+(i+1)),...enemies.flatMap((_,i)=>['enemy'+(i+1),'stats'+(i+1)])];
let s='<Rive version="1" kind="fragment">\n';
for(const [file,name,module] of [['catalog.luau','catalog',true],['game.luau','game',true],['board.luau','board',false]] as const)s+=`<ScriptAsset file="${file}" name="${name}" id="${name==='board'?'0:91':uid()}" isModule="${module}"/>\n`;
s+='<FontAsset file="../../../assets/fonts/FiraSans-Regular.ttf" name="Fira Sans" id="0:30"/><FontAsset file="../../../assets/fonts/FiraSans-Bold.ttf" name="Fira Sans Bold" id="0:31"/>\n';
const towerAssets:string[]=[];
for(const [i,t] of towers.entries()){const aid=uid();towerAssets.push(aid);s+=`<ImageAsset file="../../../assets/sprites/buildings/${t.asset}.png" name="tower${i+1}" id="${aid}" samplerFilter="1"/>\n`;}
s+='<ImageAsset file="../../../assets/sprites/buildings/Blue_Castle.png" name="castle" id="0:61" samplerFilter="1"/>\n';
const portraits:string[]=[];
for(const [i,e] of enemies.entries()){s+=`<ImageAsset file="../../../assets/sprites/enemies/${e.asset}.png" name="enemy${i+1}" id="${uid()}" samplerFilter="1"/>\n`;const p=uid();portraits.push(p);s+=`<ImageAsset file="../../../assets/sprites/enemies/${e.portrait}.png" name="portrait${i+1}" id="${p}" samplerFilter="1"/>\n`;}
s+='<ViewModel name="Defense" id="0:40" defaultInstanceId="0:41">';
for(const name of strings){const p=uid();props.set(name,p);s+=`<ViewModelPropertyString name="${name}" id="${p}"/>`;}
s+='<ViewModelPropertyBoolean name="multiplayer" id="0:42"/><ViewModelInstance name="Default" id="0:41" exports="true"><ViewModelInstanceBoolean propertyValue="false" viewModelPropertyId="0:42"/>';
for(const name of strings)s+=`<ViewModelInstanceString propertyValue="" viewModelPropertyId="${props.get(name)}"/>`;
s+='</ViewModelInstance></ViewModel>\n<Artboard name="Little Keep" id="0:2" width="1440" height="960" styleId="0:5" defaultStateMachineId="0:7" viewModelId="0:40" viewModelInstanceId="0:41"><LayoutComponentStyle name="Artboard Style" id="0:5"/>\n';
function text(label:string,x:number,y:number,size=14,color='FFA6B5AD',bind?:string,width?:number){const style=uid();s+=`<Text name="${esc(label||bind||'Text')}" x="${x}" y="${y}"${width?` width="${width}" sizingValue="autoHeight" wrapValue="wrap"`:''}><TextStylePaint id="${style}" fontSize="${size}" fontAssetId="${size>=18?'0:31':'0:30'}"><Fill><SolidColor colorValue="${color}"/></Fill></TextStylePaint><TextValueRun styleId="${style}" text="${esc(label)}">${bind?`<DataBindContext sourcePathIds="0:40-${props.get(bind)}" propertyKey="268"/>`:''}</TextValueRun></Text>\n`;}
function rect(x:number,y:number,w:number,h:number,color:string){s+=`<Shape x="${x}" y="${y}"><Rectangle width="${w}" height="${h}" originX="0" originY="0" cornerRadiusTL="8"/><Fill><SolidColor colorValue="${color}"/></Fill></Shape>\n`;}
text('LITTLE KEEP',38,26,34,'FFF1E8D0');text('THREE BATTLEFIELDS. ONE TEAM.',40,72,12,'FFD1B878');text('',550,42,20,'FFE8D9B9','level');
text('',40,110,12,'FFD1B878','previewTitle');
for(const [i,e] of enemies.entries()){
 const x=40+(i%5)*208,y=138+Math.floor(i/5)*58;
 s+=`<Image name="${e.name} portrait" assetId="${portraits[i]}" x="${x+24}" y="${y+23}" scaleX="0.16" scaleY="0.16"/>`;
 text('',x+47,y+7,14,'FFF1E8D0','enemy'+(i+1));text('',x+47,y+29,11,'FFA6B5AD','stats'+(i+1));rect(x,y,198,50,'FF263D3C');
}
text('',40,869,18,'FFE8D9B9','status',1020);text('SELECT A TOWER  ·  CLICK A GOLDEN PAD TO BUILD  ·  HOVER TO SEE RANGE',40,918,12,'FF8EA79B');
text('THE DEFENSE',1130,34,14,'FFD1B878');text('',1130,64,11,'FF8EA79B','connection');
text('TEAM GOLD',1130,110,12);text('',1130,135,30,'FFF1E8D0','gold');text('KEEP',1280,110,12);text('',1280,139,24,'FFF1E8D0','lives');
text('WAVE',1130,204,12);text('',1130,230,26,'FFF1E8D0','wave');text('',1130,272,14,'FFA6B5AD','remaining');
for(const [i,t] of towers.entries()){const y=310+i*76;s+=`<Image name="${t.name} tower" assetId="${towerAssets[i]}" x="1160" y="${y+32}" scaleX="0.28" scaleY="0.28"/>`;text('',1192,y+9,18,'FFF1E8D0','towerLabel'+(i+1));text(t.cost+' gold  ·  '+t.effect,1192,y+36,11,'FF'+t.color.slice(1),undefined,205);}
text('',1130,647,18,'FFE4C77E','selection');text('',1130,685,14,'FFA6B5AD','details',270);
text('',1154,776,16,'FF1B302C','action');rect(1130,755,270,60,'FFDCC58B');
text('3 LEVELS  /  12 WAVES',1130,850,13,'FFD1B878');text('19 × 19 tiles on every battlefield',1130,878,12);text('Gold and keep health are shared.',1130,902,12);
rect(1100,0,340,960,'FF21362F');
s+='<LayoutComponent width="1440" height="960" styleId="0:11" name="Playfield"><LayoutComponentStyle layoutWidthScaleType="fill" layoutHeightScaleType="fill" widthUnitsValue="auto" heightUnitsValue="auto" id="0:11"/><ScriptedLayout scriptAssetId="0:91" name="Board"/></LayoutComponent><Fill name="Background"><SolidColor colorValue="FF192D30"/></Fill><StateMachine name="Play" id="0:7"><StateMachineLayer><EntryState><StateTransition stateToId="0:12"/></EntryState><AnimationState x="200" y="0" animationId="0:6" id="0:12"/></StateMachineLayer></StateMachine><LinearAnimation duration="60" name="Idle" id="0:6"/></Artboard></Rive>\n';
await Bun.write(new URL('../../td/scene.rml',import.meta.url),s);
