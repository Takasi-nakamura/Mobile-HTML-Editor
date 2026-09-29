const SAMPLE = `<!doctype html>
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
</html>`;

const STORAGE_KEY = "mobile-html-editor-code";
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
  extraKeys: {
    "Ctrl-Space": cm => showHtmlHints(cm),
    "Cmd-Space": cm => showHtmlHints(cm),
    "Tab": cm => {
      if (cm.somethingSelected()) cm.indentSelection("add");
      else cm.replaceSelection("  ", "end");
    }
  }
});

function showHtmlHints(cm){
  CodeMirror.showHint(cm, CodeMirror.hint.html, {completeSingle:false});
}

let hintTimer;
editor.on("inputRead", (cm, change) => {
  clearTimeout(hintTimer);
  if (change.text.some(t => /[<\s\/]/.test(t))) {
    hintTimer = setTimeout(() => showHtmlHints(cm), 120);
  }
});
editor.on("change", () => {
  localStorage.setItem(STORAGE_KEY, editor.getValue());
  updateStatus();
  updatePreview();
});
function updateStatus(){ document.getElementById("status").textContent = editor.lineCount()+" 行"; }
let previewTimer;
function updatePreview(){
  clearTimeout(previewTimer);
  previewTimer=setTimeout(()=>{
    document.getElementById("preview").srcdoc=editor.getValue();
  },120);
}
updateStatus(); updatePreview();

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===tab.dataset.view+"View"));
  if(tab.dataset.view==="preview") updatePreview();
}));

document.getElementById("refreshBtn").onclick=updatePreview;
document.getElementById("clearBtn").onclick=()=>{
  if(confirm("エディタの内容を空にしますか？")) editor.setValue("");
};
document.getElementById("resetBtn").onclick=()=>{
  editor.setValue(SAMPLE); closeMenu();
};
document.getElementById("formatBtn").onclick=()=>{
  const value=editor.getValue();
  const formatted=value
    .replace(/>\s*</g,">\n<")
    .split("\n").map(s=>s.trim()).filter(Boolean).join("\n");
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
  const frame=document.getElementById("preview");
  const doc=frame.contentDocument;
  holder.innerHTML=doc?.body?.innerHTML || editor.getValue();
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
