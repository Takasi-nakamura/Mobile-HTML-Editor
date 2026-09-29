const SAMPLE = \`<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>My Page</title>
  <style>
    body { font-family: system-ui; max-width: 720px; margin: 60px auto; padding: 20px; }
    h1 { color: #2563eb; }
    .card { padding: 20px; border-radius: 16px; background: #f1f5f9; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Hello, HTML!</h1>
    <p>ここにHTMLを書いて、上の「プレビュー」で確認できます。</p>
    <button onclick="alert('Hello!')">Click me</button>
  </div>
</body>
</html>\`;

const STORAGE_KEY = "mobile-html-editor-code";

const HTML_SNIPPETS = [
  {label:"!  HTML5", detail:"HTML5 boilerplate", trigger:"!", template:\`<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${1:ページタイトル}</title>
</head>
<body>
  \${0}
</body>
</html>\`},
  {label:"html  <html>", detail:"HTML document", trigger:"html", template:"<html lang=\\"ja\\">\\n  $0\\n</html>"},
  {label:"head  <head>", detail:"document head", trigger:"head", template:"<head>\\n  $0\\n</head>"},
  {label:"body  <body>", detail:"document body", trigger:"body", template:"<body>\\n  $0\\n</body>"},
  {label:"div  <div>", detail:"block element", trigger:"div", template:"<div>$0</div>"},
  {label:"section  <section>", detail:"section element", trigger:"section", template:"<section>\\n  $0\\n</section>"},
  {label:"header  <header>", detail:"header element", trigger:"header", template:"<header>\\n  $0\\n</header>"},
  {label:"main  <main>", detail:"main element", trigger:"main", template:"<main>\\n  $0\\n</main>"},
  {label:"footer  <footer>", detail:"footer element", trigger:"footer", template:"<footer>\\n  $0\\n</footer>"},
  {label:"nav  <nav>", detail:"navigation", trigger:"nav", template:"<nav>\\n  $0\\n</nav>"},
  {label:"h1  <h1>", detail:"heading", trigger:"h1", template:"<h1>$0</h1>"},
  {label:"p  <p>", detail:"paragraph", trigger:"p", template:"<p>$0</p>"},
  {label:"a  <a>", detail:"link", trigger:"a", template:'<a href="$1">$0</a>'},
  {label:"img  <img>", detail:"image", trigger:"img", template:'<img src="$1" alt="$0">'},
  {label:"button  <button>", detail:"button", trigger:"button", template:"<button type=\\"button\\">$0</button>"},
  {label:"ul  <ul>", detail:"unordered list", trigger:"ul", template:"<ul>\\n  <li>$0</li>\\n</ul>"},
  {label:"ol  <ol>", detail:"ordered list", trigger:"ol", template:"<ol>\\n  <li>$0</li>\\n</ol>"},
  {label:"li  <li>", detail:"list item", trigger:"li", template:"<li>$0</li>"},
  {label:"form  <form>", detail:"form", trigger:"form", template:"<form>\\n  $0\\n</form>"},
  {label:"input  <input>", detail:"text input", trigger:"input", template:'<input type="text" name="$1" placeholder="$0">'},
  {label:"textarea  <textarea>", detail:"multiline input", trigger:"textarea", template:"<textarea rows=\\"4\\">$0</textarea>"},
  {label:"select  <select>", detail:"select box", trigger:"select", template:"<select>\\n  <option>$0</option>\\n</select>"},
  {label:"link  stylesheet", detail:"CSS stylesheet", trigger:"link", template:'<link rel="stylesheet" href="$0">'},
  {label:"script  <script>", detail:"JavaScript", trigger:"script", template:"<script>\\n  $0\\n</script>"},
  {label:"style  <style>", detail:"CSS", trigger:"style", template:"<style>\\n  $0\\n</style>"},
  {label:"meta  viewport", detail:"responsive viewport", trigger:"meta", template:'<meta name="viewport" content="width=device-width, initial-scale=1.0">'},
  {label:"class  class=\\"\\"", detail:"class attribute", trigger:"class", template:'class="$0"'},
  {label:"id  id=\\"\\"", detail:"id attribute", trigger:"id", template:'id="$0"'}
];

const VOID_TAGS = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
const COMMON_TAGS = ["html","head","body","title","meta","link","style","script","header","nav","main","section","article","aside","footer","div","span","h1","h2","h3","p","a","img","button","ul","ol","li","form","label","input","textarea","select","option","table","thead","tbody","tr","th","td","br","hr","video","audio","canvas","details","summary","dialog","template"];
const COMMON_ATTRS = ["class","id","style","title","lang","href","src","alt","width","height","type","name","value","placeholder","disabled","checked","required","target","rel","for","role","aria-label","data-*","onclick"];

function getCursorContext(cm) {
  const pos = cm.getCursor();
  const line = cm.getLine(pos.line).slice(0, pos.ch);
  const tagMatch = line.match(/<([A-Za-z][\\w:-]*)?[^>]*$/);
  const attrMatch = line.match(/<[^>]*\\s([A-Za-z_:][\\w:.-]*)?$/);
  return {pos, line, tagMatch, attrMatch};
}

function insertSnippet(cm, item) {
  const pos = cm.getCursor();
  const word = item.trigger === "!" ? "" : item.trigger;
  const from = CodeMirror.Pos(pos.line, Math.max(0, pos.ch - word.length));
  cm.replaceRange("", from, pos);
  const template = item.template;
  const marks = [];
  let out = "";
  let last = 0;
  const re = /\\$(?:\\{(\\d+)(?::([^}]*))?\\}|(\\d+))/g;
  let m;
  while ((m = re.exec(template))) {
    out += template.slice(last, m.index);
    const n = Number(m[1] || m[3]);
    const textValue = m[2] || "";
    const start = out.length;
    out += textValue;
    const end = out.length;
    marks.push({n,start,end});
    last = m.index + m[0].length;
  }
  out += template.slice(last);
  const startPos = cm.getCursor();
  cm.replaceSelection(out);
  const base = startPos;
  const marker = marks.find(x => x.n === 0) || marks.find(x => x.n === 1);
  if (marker) {
    const before = out.slice(0, marker.start);
    const selected = out.slice(marker.start, marker.end);
    const a = cm.posFromIndex(cm.indexFromPos(base) + before.length);
    const b = cm.posFromIndex(cm.indexFromPos(base) + before.length + selected.length);
    if (marker.n === 1 && selected) cm.setSelection(a,b);
    else cm.setCursor(a);
  }
}

function expandEmmet(cm) {
  const pos = cm.getCursor();
  const line = cm.getLine(pos.line);
  const before = line.slice(0, pos.ch);
  const m = before.match(/(?:^|\\s)([A-Za-z][\\w-]*(?:[.#][\\w-]+)*(?:>[A-Za-z][\\w-]*(?:[.#][\\w-]+)*)?(?:\\*\\d+)?)$/);
  if (!m) return false;
  const expr = m[1];
  if (!/[.#>*]/.test(expr) && !HTML_SNIPPETS.some(s => s.trigger === expr)) return false;
  const parsed = expandEmmetExpression(expr);
  if (!parsed) return false;
  const from = CodeMirror.Pos(pos.line, pos.ch - expr.length);
  cm.replaceRange(parsed.html, from, pos);
  const cursorIndex = cm.indexFromPos(from) + parsed.cursor;
  cm.setCursor(cm.posFromIndex(cursorIndex));
  return true;
}

function parseEmmetNode(token) {
  const mult = token.match(/\\*(\\d+)$/);
  const count = mult ? Number(mult[1]) : 1;
  token = token.replace(/\\*\\d+$/,"");
  const tag = (token.match(/^[A-Za-z][\\w-]*/) || ["div"])[0];
  const classes = [...token.matchAll(/\\.([\\w-]+)/g)].map(x=>x[1]);
  const id = (token.match(/#([\\w-]+)/) || [])[1];
  return {tag,classes,id,count};
}

function renderEmmetNode(node, level, isLast) {
  let html = "";
  let cursor = 0;
  for (let i=0;i<node.count;i++) {
    const attrs = (node.id ? ' id="' + node.id + '"' : "") + (node.classes.length ? ' class="' + node.classes.join(" ") + '"' : "");
    if (VOID_TAGS.has(node.tag)) html += "<"+node.tag+attrs+">";
    else html += "<"+node.tag+attrs+">$0</"+node.tag+">";
  }
  cursor = html.indexOf("$0");
  html = html.replace("$0","");
  return {html,cursor: cursor < 0 ? html.length : cursor};
}

function expandEmmetExpression(expr) {
  const chain = expr.split(">");
  let built = null;
  for (let i=chain.length-1;i>=0;i--) {
    const node=parseEmmetNode(chain[i]);
    if (!built) {
      const r=renderEmmetNode(node,i,false);
      built=r;
    } else {
      const child=built.html;
      const r=renderEmmetNode(node,i,false);
      const openEnd=r.html.indexOf(">");
      const close=r.html.lastIndexOf("</");
      if (close > openEnd) {
        r.html=r.html.slice(0,openEnd+1)+"\\n  "+child.replace(/\\n/g,"\\n  ")+"\\n"+r.html.slice(close);
        r.cursor=r.html.indexOf("$0");
      } else {
        r.html+=child;
      }
      built=r;
    }
  }
  return built;
}

function showHtmlHints(cm, explicit=false) {
  const {pos,line,tagMatch,attrMatch}=getCursorContext(cm);
  const inTag = /<[^>]*$/.test(line);
  let list;
  if (inTag) {
    const closing = /<\\/[^>]*$/.test(line);
    if (closing) {
      const m=line.match(/<\\/([\\w:-]*)$/);
      const q=(m?.[1]||"").toLowerCase();
      list=COMMON_TAGS.filter(t=>t.startsWith(q)).map(t=>({text:t,display:"</"+t+">"}));
    } else if (attrMatch) {
      const q=(attrMatch[1]||"").toLowerCase();
      list=COMMON_ATTRS.filter(a=>a.toLowerCase().startsWith(q)).map(a=>({text:a,display:a}));
    } else {
      const q=(tagMatch?.[1]||"").toLowerCase();
      list=COMMON_TAGS.filter(t=>t.startsWith(q)).map(t=>({text:t,display:"<"+t+">"}));
    }
  } else {
    const word=line.match(/(?:^|\\s)([!\\w-]+)$/)?.[1]||"";
    list=HTML_SNIPPETS.filter(s=>s.trigger.startsWith(word.toLowerCase())).map(s=>({text:s.trigger,display:s.label,detail:s.detail}));
  }
  if (!list.length) return CodeMirror.showHint(cm, CodeMirror.hint.html, {completeSingle:false});
  const wordMatch = line.match(/([!A-Za-z][\\w:-]*)$/);
  const from = wordMatch ? CodeMirror.Pos(pos.line,pos.ch-wordMatch[1].length) : pos;
  const to = pos;
  CodeMirror.showHint(cm, ()=>({list,from,to}), {completeSingle:false,closeOnUnfocus:true});
}

function handleHintPick(cm, data) {
  if (!data) return;
  const item=data.list?.[data.selectedHint];
}

const editor = CodeMirror(document.getElementById("editor"), {
  value: localStorage.getItem(STORAGE_KEY) || SAMPLE,
  mode: "htmlmixed",
  theme: "material-darker",
  lineNumbers: true,
  lineWrapping: false,
  tabSize: 2,
  indentUnit: 2,
  autoCloseBrackets: true,
  matchBrackets: true,
  autoCloseTags: true,
  extraKeys: {
    "Ctrl-Space": cm => showHtmlHints(cm,true),
    "Cmd-Space": cm => showHtmlHints(cm,true),
    "Tab": cm => {
      if (cm.state.completionActive) return CodeMirror.Pass;
      if (expandEmmet(cm)) return;
      if (cm.somethingSelected()) cm.indentSelection("add");
      else cm.replaceSelection("  ", "end");
    },
    "Enter": cm => {
      if (cm.state.completionActive) return CodeMirror.Pass;
      const pos=cm.getCursor();
      const line=cm.getLine(pos.line);
      const before=line.slice(0,pos.ch);
      const after=line.slice(pos.ch);
      const indent=line.match(/^\\s*/)?.[0]||"";
      if (/<[A-Za-z][^>]*>$/.test(before) && !/<\\//.test(before) && after.trim()==="") {
        const tag=(before.match(/<([A-Za-z][\\w:-]*)[^>]*>$/)||[])[1]?.toLowerCase();
        if (tag && !VOID_TAGS.has(tag)) {
          cm.replaceSelection("\\n"+indent+"  \\n"+indent+"</"+tag+">");
          cm.setCursor({line:pos.line+1,ch:indent.length+2});
          return;
        }
      }
      cm.execCommand("newlineAndIndent");
    }
  }
});

let hintTimer;
editor.on("inputRead", (cm, change) => {
  clearTimeout(hintTimer);
  const inserted=change.text.join("");
  if (inserted === ">") {
    autoCloseTag(cm);
    return;
  }
  if (inserted === "<" || /[A-Za-z_:.-]/.test(inserted)) {
    hintTimer=setTimeout(()=>showHtmlHints(cm),80);
  }
});

function autoCloseTag(cm) {
  const pos=cm.getCursor();
  const line=cm.getLine(pos.line);
  const before=line.slice(0,pos.ch);
  const m=before.match(/<([A-Za-z][\\w:-]*)[^>]*>$/);
  if (!m) return;
  const tag=m[1].toLowerCase();
  if (VOID_TAGS.has(tag) || /<\\//.test(before)) return;
  const rest=line.slice(pos.ch);
  if (rest.trim().startsWith("</"+tag+">")) return;
  cm.replaceRange("</"+tag+">",pos,pos);
  cm.setCursor(pos);
}

editor.on("change", () => {
  localStorage.setItem(STORAGE_KEY, editor.getValue());
  updateStatus();
  updatePreview();
});
function updateStatus(){ document.getElementById("status").textContent = editor.lineCount()+" 行"; }
let previewTimer;
function updatePreview(){
  clearTimeout(previewTimer);
  previewTimer=setTimeout(()=>{ document.getElementById("preview").srcdoc=editor.getValue(); },120);
}
updateStatus(); updatePreview();

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===tab.dataset.view+"View"));
  if(tab.dataset.view==="preview") updatePreview();
}));

document.getElementById("refreshBtn").onclick=updatePreview;
document.getElementById("clearBtn").onclick=()=>{ if(confirm("エディタの内容を空にしますか？")) editor.setValue(""); };
document.getElementById("resetBtn").onclick=()=>{ editor.setValue(SAMPLE); closeMenu(); };
document.getElementById("formatBtn").onclick=()=>{
  const value=editor.getValue();
  const formatted=value.replace(/>\\s*</g,">\\n<").split("\\n").map(s=>s.trim()).filter(Boolean).join("\\n");
  editor.setValue(formatted);
};
document.getElementById("downloadBtn").onclick=()=>toggleMenu();
document.getElementById("menuBtn").onclick=()=>toggleMenu();
function toggleMenu(){document.getElementById("menu").hidden=!document.getElementById("menu").hidden}
function closeMenu(){document.getElementById("menu").hidden=true}
document.addEventListener("click",e=>{
  const menu=document.getElementById("menu");
  if(!menu.hidden && !menu.contains(e.target) && e.target.id!=="downloadBtn" && e.target.id!=="menuBtn") closeMenu();
});
function downloadBlob(blob,name){
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.getElementById("downloadHtml").onclick=()=>{
  downloadBlob(new Blob([editor.getValue()],{type:"text/html;charset=utf-8"}),"index.html");closeMenu();
};
document.getElementById("downloadPdf").onclick=async()=>{
  closeMenu();
  const dialog=document.getElementById("pdfDialog");
  if(dialog.showModal) dialog.showModal();
  const holder=document.createElement("div");
  holder.style.cssText="position:fixed;left:-100000px;top:0;width:794px;background:white;color:black;";
  const source=editor.getValue();
  const parsed=new DOMParser().parseFromString(source,"text/html");
  const styleText=[...parsed.querySelectorAll("style")].map(s=>s.textContent).join("\\n");
  holder.innerHTML=(styleText ? "<style>"+styleText+"</style>" : "")+(parsed.body?.innerHTML || source);
  document.body.appendChild(holder);
  try{
    await html2pdf().set({
      margin:10,filename:"index.pdf",
      image:{type:"jpeg",quality:.95},
      html2canvas:{scale:2,useCORS:true,backgroundColor:"#fff"},
      jsPDF:{unit:"mm",format:"a4",orientation:"portrait"}
    }).from(holder).save();
  }finally{holder.remove();if(dialog.open)dialog.close();}
};
document.getElementById("closeDialog").onclick=()=>document.getElementById("pdfDialog").close();

let deferredPrompt;
window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();deferredPrompt=e;document.getElementById("installBtn").hidden=false;
});
document.getElementById("installBtn").onclick=async()=>{
  if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;
  deferredPrompt=null;document.getElementById("installBtn").hidden=true;
};
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(console.error));
