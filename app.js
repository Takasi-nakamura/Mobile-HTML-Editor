import {basicSetup} from "https://esm.sh/codemirror@6.0.1";
import {EditorView,keymap} from "https://esm.sh/@codemirror/view@6.38.6";
import {EditorState} from "https://esm.sh/@codemirror/state@6.5.2";
import {defaultKeymap,indentWithTab} from "https://esm.sh/@codemirror/commands@6.8.1";
import {html,htmlCompletionSource} from "https://esm.sh/@codemirror/lang-html@6.4.12";
import {autocompletion,startCompletion} from "https://esm.sh/@codemirror/autocomplete@6.19.0";
import {oneDark} from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";

const KEY="mobile-html-editor-v6";
const SAMPLE='<!doctype html>\n<html lang="ja">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Page</title>\n  <style>\n    body{font-family:system-ui;max-width:720px;margin:60px auto;padding:20px}\n    .card{padding:24px;border-radius:16px;background:#eef2ff}\n    .title{color:#2563eb}\n    .button{padding:10px 16px;border:0;border-radius:10px;background:#2563eb;color:white}\n  </style>\n</head>\n<body>\n  <div class="card">\n    <h1 class="title">Hello, HTML!</h1>\n    <p>CodeMirror 6でHTMLを書いてみよう。</p>\n    <button class="button">Click me</button>\n  </div>\n</body>\n</html>';
const saved=localStorage.getItem(KEY)||SAMPLE;

function classNames(doc){
  const s=new Set(),t=doc.toString();
  for(const m of t.matchAll(/\.([A-Za-z_][\w-]*)/g))s.add(m[1]);
  for(const m of t.matchAll(/class\s*=\s*"([^"]*)"/gi))for(const n of m[1].split(/\s+/))if(n)s.add(n);
  return [...s].sort();
}
function classCompletion(ctx){
  const before=ctx.state.doc.sliceString(Math.max(0,ctx.pos-300),ctx.pos);
  const inside=/class\s*=\s*"[^"]*$/.test(before);
  const dot=/\.([\w-]*)$/.test(before);
  if(!inside&&!dot)return null;
  const word=ctx.matchBefore(/[\w-]*/);
  if(!word)return null;
  const options=classNames(ctx.state.doc).map(label=>({label,type:"class",detail:"CSS class"}));
  return options.length?{from:word.from,to:ctx.pos,options,validFor:/^[\w-]*$/}:null;
}

const state=EditorState.create({
  doc:saved,
  extensions:[
    basicSetup,oneDark,
    html({autoCloseTags:true,selfClosingTags:true,extraGlobalAttributes:{"class":null,"id":null,"style":null,"data-*":null,"aria-*":null}}),
    autocompletion({activateOnTyping:true,override:[classCompletion,htmlCompletionSource],maxRenderedOptions:14}),
    keymap.of([...defaultKeymap,indentWithTab,{key:"Mod-Space",run:v=>(startCompletion(v),true)}]),
    EditorView.theme({"&":{backgroundColor:"#0d1117"},".cm-content":{padding:"14px 0 80px"}}),
    EditorView.updateListener.of(u=>{
      if(!u.docChanged)return;
      localStorage.setItem(KEY,u.state.doc.toString());
      status("自動保存済み");
      preview(u.state.doc.toString());
    })
  ]
});
const view=new EditorView({state,parent:document.querySelector("#editor")});
function status(t){const e=document.querySelector("#status");e.textContent=t;clearTimeout(status.t);status.t=setTimeout(()=>e.textContent="自動保存",1200)}
let timer;
function preview(s){clearTimeout(timer);timer=setTimeout(()=>document.querySelector("#preview").srcdoc=s,100)}
preview(saved);

document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===tab.dataset.view+"View"));
  if(tab.dataset.view==="preview")preview(view.state.doc.toString());
});
document.querySelector("#refreshBtn").onclick=()=>preview(view.state.doc.toString());
document.querySelector("#clearBtn").onclick=()=>{if(confirm("エディターの内容を空にしますか？"))view.dispatch({changes:{from:0,to:view.state.doc.length,insert:""}})};
document.querySelector("#formatBtn").onclick=()=>{
  const parts=view.state.doc.toString().replace(/>\s*</g,"><").split(/(<[^>]+>)/g).filter(Boolean);
  let d=0,out=[];
  for(let x of parts){x=x.trim();if(!x)continue;if(/^<\//.test(x))d=Math.max(0,d-1);out.push("  ".repeat(d)+x);if(/^<[^!/][^>]*>$/.test(x)&&!/^<(input|img|br|hr|meta|link|source|area|base|embed|param|track|wbr)\b/i.test(x)&&!x.endsWith("/>"))d++}
  view.dispatch({changes:{from:0,to:view.state.doc.length,insert:out.join("\n")}});
};

const menu=document.querySelector("#exportMenu");
document.querySelector("#exportBtn").onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden};
document.addEventListener("click",e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target.id!=="exportBtn")menu.hidden=true});
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),800)}
document.querySelector("#htmlDownload").onclick=()=>{download(new Blob([view.state.doc.toString()],{type:"text/html;charset=utf-8"}),"index.html");menu.hidden=true};

document.querySelector("#pdfDownload").onclick=async()=>{
  menu.hidden=true;
  const dialog=document.querySelector("#pdfDialog");dialog.showModal();
  const doc=new DOMParser().parseFromString(view.state.doc.toString(),"text/html");
  const holder=document.createElement("div");
  holder.style.cssText="position:fixed;left:-100000px;top:0;width:794px;min-height:1123px;background:#fff;color:#111;padding:48px;font-family:system-ui";
  const styles=[...doc.querySelectorAll("style")].map(x=>x.textContent).join("\n");
  holder.innerHTML=(styles?"<style>"+styles+"</style>":"")+(doc.body?.innerHTML||"");
  holder.querySelectorAll("script").forEach(x=>x.remove());
  document.body.append(holder);
  try{
    const canvas=await html2canvas(holder,{scale:2,useCORS:true,backgroundColor:"#fff",windowWidth:794});
    const pdf=new jspdf.jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
    const w=194,h=281,per=canvas.width*h/w;
    let y=0,first=true;
    while(y<canvas.height){
      const sh=Math.min(per,canvas.height-y),slice=document.createElement("canvas");
      slice.width=canvas.width;slice.height=Math.ceil(sh);
      slice.getContext("2d").drawImage(canvas,0,y,canvas.width,sh,0,0,canvas.width,sh);
      if(!first)pdf.addPage();first=false;
      pdf.addImage(slice.toDataURL("image/jpeg",.94),"JPEG",8,8,w,slice.height/canvas.width*w);
      y+=sh;
    }
    pdf.save("index.pdf");
  }finally{holder.remove();if(dialog.open)dialog.close()}
};
document.querySelector("#cancelPdf").onclick=()=>document.querySelector("#pdfDialog").close();

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;document.querySelector("#installBtn").hidden=false});
document.querySelector("#installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;document.querySelector("#installBtn").hidden=true};
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}));
