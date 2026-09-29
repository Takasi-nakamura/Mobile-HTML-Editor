import {basicSetup} from "https://esm.sh/codemirror@6.0.1";
import {EditorView,keymap} from "https://esm.sh/@codemirror/view@6.38.6";
import {EditorState} from "https://esm.sh/@codemirror/state@6.5.2";
import {defaultKeymap,indentWithTab} from "https://esm.sh/@codemirror/commands@6.8.1";
import {html,htmlCompletionSource} from "https://esm.sh/@codemirror/lang-html@6.4.12";
import {autocompletion,startCompletion} from "https://esm.sh/@codemirror/autocomplete@6.19.0";
import {oneDark} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";

const KEY="mobile-html-editor-v7";
const SAMPLE=`<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
    body{font-family:system-ui;max-width:720px;margin:60px auto;padding:20px}
    .card{padding:24px;border-radius:16px;background:#eef2ff}
    .title{color:#2563eb}.button{padding:10px 16px;border:0;border-radius:10px;background:#2563eb;color:white}
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">Hello, HTML!</h1>
    <p>ここから自由に編集できます。</p>
    <button class="button">Click me</button>
  </div>
</body>
</html>`;

const saved=localStorage.getItem(KEY) ?? localStorage.getItem("mobile-html-editor-v6") ?? SAMPLE;
const statusEl=document.querySelector("#status");

function getClassNames(doc){
  const set=new Set(),text=doc.toString();
  for(const m of text.matchAll(/\.([A-Za-z_][\w-]*)/g))set.add(m[1]);
  for(const m of text.matchAll(/class\s*=\s*["']([^"']*)["']/gi))
    for(const n of m[1].trim().split(/\s+/))if(n)set.add(n);
  return [...set].sort();
}
function classCompletion(ctx){
  const before=ctx.state.doc.sliceString(Math.max(0,ctx.pos-400),ctx.pos);
  const inClass=/\bclass\s*=\s*["'][^"']*$/.test(before);
  const afterDot=/\.([\w-]*)$/.test(before);
  if(!inClass&&!afterDot)return null;
  const word=ctx.matchBefore(/[\w-]*/);
  if(!word)return null;
  const options=getClassNames(ctx.state.doc).map(label=>({label,type:"class",detail:"CSS class"}));
  return options.length?{from:word.from,to:ctx.pos,options,validFor:/^[\w-]*$/}:null;
}

const state=EditorState.create({
  doc:saved,
  extensions:[
    basicSetup,oneDark,
    html({autoCloseTags:true,selfClosingTags:true}),
    autocompletion({activateOnTyping:true,override:[classCompletion,htmlCompletionSource],maxRenderedOptions:16}),
    keymap.of([...defaultKeymap,indentWithTab,{key:"Mod-Space",run:v=>(startCompletion(v),true)}]),
    EditorView.theme({
      "&":{backgroundColor:"#090d13"},
      ".cm-content":{padding:"14px 0 70px"},
      ".cm-scroller":{fontFamily:"ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace"}
    }),
    EditorView.updateListener.of(update=>{
      if(!update.docChanged)return;
      localStorage.setItem(KEY,update.state.doc.toString());
      setStatus("保存済み");
      schedulePreview(update.state.doc.toString());
    })
  ]
});
const view=new EditorView({state,parent:document.querySelector("#editor")});

let statusTimer;
function setStatus(text){
  statusEl.textContent=text;
  clearTimeout(statusTimer);
  statusTimer=setTimeout(()=>statusEl.textContent="自動保存",1200);
}
let previewTimer;
function schedulePreview(source){
  clearTimeout(previewTimer);
  previewTimer=setTimeout(()=>document.querySelector("#preview").srcdoc=source,120);
}
schedulePreview(saved);

document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===tab.dataset.view+"View"));
  if(tab.dataset.view==="preview")schedulePreview(view.state.doc.toString());
}));

document.querySelector("#refreshBtn").onclick=()=>schedulePreview(view.state.doc.toString());
document.querySelector("#clearBtn").onclick=()=>{
  if(!confirm("エディターの内容をすべて消しますか？"))return;
  view.dispatch({changes:{from:0,to:view.state.doc.length,insert:""}});
};
document.querySelector("#formatBtn").onclick=()=>{
  const source=view.state.doc.toString();
  const parts=source.replace(/>\s*</g,"><").split(/(<[^>]+>)/g).filter(Boolean);
  let depth=0;const out=[];
  for(let part of parts){
    part=part.trim();if(!part)continue;
    if(/^<\//.test(part))depth=Math.max(0,depth-1);
    out.push("  ".repeat(depth)+part);
    if(/^<[^!/][^>]*>$/.test(part)&&!/^<(input|img|br|hr|meta|link|source|area|base|embed|param|track|wbr)\b/i.test(part)&&!part.endsWith("/>"))depth++;
  }
  view.dispatch({changes:{from:0,to:view.state.doc.length,insert:out.join("\n")}});
};

const menu=document.querySelector("#exportMenu");
document.querySelector("#exportBtn").onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden};
document.addEventListener("click",e=>{
  if(!menu.hidden&&!menu.contains(e.target)&&e.target.id!=="exportBtn")menu.hidden=true;
});
function download(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
document.querySelector("#htmlDownload").onclick=()=>{
  download(new Blob([view.state.doc.toString()],{type:"text/html;charset=utf-8"}),"index.html");
  menu.hidden=true;
};

document.querySelector("#pdfDownload").onclick=async()=>{
  menu.hidden=true;
  const dialog=document.querySelector("#pdfDialog");
  dialog.showModal();
  const parsed=new DOMParser().parseFromString(view.state.doc.toString(),"text/html");
  const holder=document.createElement("div");
  holder.style.cssText="position:fixed;left:-100000px;top:0;width:794px;min-height:1123px;background:#fff;color:#111;padding:48px;font-family:system-ui";
  const styles=[...parsed.querySelectorAll("style")].map(x=>x.textContent).join("\n");
  holder.innerHTML=(styles?"<style>"+styles+"</style>":"")+(parsed.body?.innerHTML||"");
  holder.querySelectorAll("script").forEach(x=>x.remove());
  document.body.append(holder);
  try{
    const canvas=await html2canvas(holder,{scale:2,useCORS:true,backgroundColor:"#fff",windowWidth:794});
    const pdf=new jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
    const width=194,pageHeight=281,pxPerPage=canvas.width*pageHeight/width;
    let y=0,first=true;
    while(y<canvas.height){
      const height=Math.min(pxPerPage,canvas.height-y),slice=document.createElement("canvas");
      slice.width=canvas.width;slice.height=Math.ceil(height);
      slice.getContext("2d").drawImage(canvas,0,y,canvas.width,height,0,0,canvas.width,height);
      if(!first)pdf.addPage();first=false;
      pdf.addImage(slice.toDataURL("image/jpeg",.94),"JPEG",8,8,width,slice.height/canvas.width*width);
      y+=height;
    }
    pdf.save("index.pdf");
  }catch(error){
    console.error(error);
    alert("PDFの作成に失敗しました。プレビューを確認してからもう一度試してください。");
  }finally{
    holder.remove();
    if(dialog.open)dialog.close();
  }
};
document.querySelector("#cancelPdf").onclick=()=>document.querySelector("#pdfDialog").close();

let deferredPrompt;
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();deferredPrompt=event;
  document.querySelector("#installBtn").hidden=false;
});
document.querySelector("#installBtn").onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();await deferredPrompt.userChoice;
  deferredPrompt=null;document.querySelector("#installBtn").hidden=true;
};
if("serviceWorker" in navigator)
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}));
