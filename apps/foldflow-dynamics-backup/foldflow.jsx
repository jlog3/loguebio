import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import * as THREE from "three";
import * as d3 from "d3";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from "recharts";

// ─── Constants ──────────────────────────────────────────────────────────────────
const AMINO_ACIDS = [
  "ALA","ARG","ASN","ASP","CYS","GLN","GLU","GLY","HIS","ILE",
  "LEU","LYS","MET","PHE","PRO","SER","THR","TRP","TYR","VAL"
];
const AA_SHORT = {
  ALA:"A",ARG:"R",ASN:"N",ASP:"D",CYS:"C",GLN:"Q",GLU:"E",GLY:"G",
  HIS:"H",ILE:"I",LEU:"L",LYS:"K",MET:"M",PHE:"F",PRO:"P",SER:"S",
  THR:"T",TRP:"W",TYR:"Y",VAL:"V"
};
const SHORT_TO_LONG = Object.fromEntries(Object.entries(AA_SHORT).map(([k,v]) => [v,k]));
const AA_COLORS = {
  ALA:"#89CFF0",ARG:"#FF6B6B",ASN:"#98D8C8",ASP:"#FF4757",CYS:"#FFC048",
  GLN:"#A29BFE",GLU:"#FF6348",GLY:"#DCDDE1",HIS:"#6C5CE7",ILE:"#00D2D3",
  LEU:"#54A0FF",LYS:"#FF9FF3",MET:"#FECA57",PHE:"#48DBFB",PRO:"#1DD1A1",
  SER:"#F368E0",THR:"#FF9F43",TRP:"#EE5A24",TYR:"#0ABDE3",VAL:"#10AC84"
};

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── Parsers ────────────────────────────────────────────────────────────────────
function parsePDB(text) {
  const lines = text.split("\n");
  const atoms = [];
  let title = "";
  const seenChains = new Set();
  for (const line of lines) {
    if (line.startsWith("TITLE")) title += line.substring(10).trim() + " ";
    if (line.startsWith("ATOM  ") || line.startsWith("HETATM")) {
      const atomName = line.substring(12, 16).trim();
      if (atomName !== "CA") continue;
      const chainId = line.substring(21, 22).trim();
      seenChains.add(chainId);
      const resName = line.substring(17, 20).trim();
      const resSeq = parseInt(line.substring(22, 26).trim());
      const x = parseFloat(line.substring(30, 38).trim());
      const y = parseFloat(line.substring(38, 46).trim());
      const z = parseFloat(line.substring(46, 54).trim());
      const bFactor = parseFloat(line.substring(60, 66).trim()) || 0;
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) atoms.push({ chainId, resName, resSeq, x, y, z, bFactor });
    }
  }
  if (atoms.length === 0) return null;
  const firstChain = atoms[0].chainId;
  const chainAtoms = atoms.filter(a => a.chainId === firstChain);
  const seen = new Set();
  const unique = [];
  for (const a of chainAtoms) { if (!seen.has(a.resSeq)) { seen.add(a.resSeq); unique.push(a); } }
  const sequence = unique.map(a => AA_SHORT[a.resName] ? a.resName : "ALA");
  const backbone = unique.map(a => [a.x, a.y, a.z]);
  const len = backbone.length;
  const cx = backbone.reduce((s,p)=>s+p[0],0)/len;
  const cy = backbone.reduce((s,p)=>s+p[1],0)/len;
  const cz = backbone.reduce((s,p)=>s+p[2],0)/len;
  backbone.forEach(p => { p[0]-=cx; p[1]-=cy; p[2]-=cz; });
  const maxR = Math.max(...backbone.map(p => Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2])));
  const scale = maxR > 0 ? 25/maxR : 1;
  backbone.forEach(p => { p[0]*=scale; p[1]*=scale; p[2]*=scale; });
  return { sequence, backbone, bFactors: unique.map(a=>a.bFactor), name: title.trim()||"Uploaded PDB",
    chainId: firstChain, chains: [...seenChains], source: "pdb" };
}

function parseCIF(text) {
  const lines = text.split("\n");
  const atoms = [];
  let inAtomSite = false;
  let colMap = {};
  let colIdx = 0;
  for (const line of lines) {
    if (line.startsWith("_atom_site.")) { inAtomSite=true; colMap[line.replace("_atom_site.","").trim()]=colIdx++; continue; }
    if (inAtomSite && (line.startsWith("_") || line.startsWith("#") || line.startsWith("loop_"))) { if (!line.startsWith("_atom_site.")) inAtomSite=false; continue; }
    if (inAtomSite && line.trim() && !line.startsWith("#")) {
      const parts = line.trim().split(/\s+/);
      const atomId = parts[colMap["label_atom_id"]] || parts[colMap["auth_atom_id"]] || "";
      if (atomId !== "CA") continue;
      const resName = parts[colMap["label_comp_id"]] || parts[colMap["auth_comp_id"]] || "ALA";
      const chainId = parts[colMap["label_asym_id"]] || parts[colMap["auth_asym_id"]] || "A";
      const x = parseFloat(parts[colMap["Cartn_x"]]||"0");
      const y = parseFloat(parts[colMap["Cartn_y"]]||"0");
      const z = parseFloat(parts[colMap["Cartn_z"]]||"0");
      const bFactor = parseFloat(parts[colMap["B_iso_or_equiv"]]||"0");
      if (!isNaN(x)&&!isNaN(y)&&!isNaN(z)) atoms.push({ chainId, resName, x, y, z, bFactor });
    }
  }
  if (atoms.length === 0) return null;
  const firstChain = atoms[0].chainId;
  const chainAtoms = atoms.filter(a => a.chainId === firstChain);
  const sequence = chainAtoms.map(a => AA_SHORT[a.resName] ? a.resName : "ALA");
  const backbone = chainAtoms.map(a => [a.x, a.y, a.z]);
  const len = backbone.length;
  const cx = backbone.reduce((s,p)=>s+p[0],0)/len;
  const cy = backbone.reduce((s,p)=>s+p[1],0)/len;
  const cz = backbone.reduce((s,p)=>s+p[2],0)/len;
  backbone.forEach(p => { p[0]-=cx; p[1]-=cy; p[2]-=cz; });
  const maxR = Math.max(...backbone.map(p => Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2])));
  const scale = maxR > 0 ? 25/maxR : 1;
  backbone.forEach(p => { p[0]*=scale; p[1]*=scale; p[2]*=scale; });
  return { sequence, backbone, bFactors: chainAtoms.map(a=>a.bFactor), name: "Uploaded mmCIF",
    chainId: firstChain, chains: [...new Set(atoms.map(a=>a.chainId))], source: "cif" };
}

function parseFASTA(text) {
  const lines = text.split("\n");
  let header = "", seq = "";
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith(">")) header = t.substring(1).trim();
    else if (t) seq += t.replace(/\s/g,"").toUpperCase();
  }
  if (!seq) return null;
  const valid = seq.split("").filter(c => SHORT_TO_LONG[c]);
  if (valid.length < 5) return null;
  return { sequence: valid.map(c => SHORT_TO_LONG[c]), name: header || "FASTA Sequence", source: "fasta" };
}

function parseRawSequence(text) {
  const cleaned = text.replace(/[^A-Za-z]/g,"").toUpperCase();
  const valid = cleaned.split("").filter(c => SHORT_TO_LONG[c]);
  if (valid.length < 5) return null;
  return { sequence: valid.map(c => SHORT_TO_LONG[c]), name: "Custom ("+valid.length+" aa)", source: "raw" };
}

// ─── Data Generation ────────────────────────────────────────────────────────────
function generateBackboneFromSequence(sequence, seed = 42) {
  const rng = seededRandom(seed);
  const len = sequence.length;
  const backbone = [];
  let x=0,y=0,z=0;
  const helixP = {ALA:0.8,GLU:0.7,LEU:0.75,MET:0.7,GLN:0.6,LYS:0.6,ARG:0.6,HIS:0.55};
  const sheetP = {VAL:0.8,ILE:0.75,TYR:0.65,PHE:0.7,TRP:0.7,THR:0.6,CYS:0.6};
  for (let i=0; i<len; i++) {
    let hs=0,ss=0;
    for (let w=Math.max(0,i-3);w<=Math.min(len-1,i+3);w++) { hs+=(helixP[sequence[w]]||0); ss+=(sheetP[sequence[w]]||0); }
    if (hs>3.0&&hs>ss) { x+=Math.cos(i*1.745)*1.5; y+=Math.sin(i*1.745)*1.5; z+=0.54; }
    else if (ss>2.5&&ss>hs) { x+=(i%2===0?1:-0.3)*1.2; y+=0.15*Math.sin(i*0.5); z+=0.34; }
    else { x+=(rng()-0.5)*2.5; y+=(rng()-0.5)*2.5; z+=(rng()-0.5)*1.5; }
    backbone.push([x,y,z]);
  }
  const cx=backbone.reduce((a,b)=>a+b[0],0)/len;
  const cy=backbone.reduce((a,b)=>a+b[1],0)/len;
  const cz=backbone.reduce((a,b)=>a+b[2],0)/len;
  backbone.forEach(p=>{p[0]-=cx;p[1]-=cy;p[2]-=cz;});
  const maxR=Math.max(...backbone.map(p=>Math.sqrt(p[0]*p[0]+p[1]*p[1]+p[2]*p[2])));
  if(maxR>0){const sc=25/maxR; backbone.forEach(p=>{p[0]*=sc;p[1]*=sc;p[2]*=sc;});}
  return backbone;
}

function predictSS(sequence) {
  const hp={ALA:0.8,GLU:0.7,LEU:0.75,MET:0.7,GLN:0.6,LYS:0.6,ARG:0.6,HIS:0.55};
  const sp={VAL:0.8,ILE:0.75,TYR:0.65,PHE:0.7,TRP:0.7,THR:0.6,CYS:0.6};
  const len=sequence.length;
  return sequence.map((_,i)=>{
    let hs=0,ss=0;
    for(let w=Math.max(0,i-3);w<=Math.min(len-1,i+3);w++){hs+=(hp[sequence[w]]||0);ss+=(sp[sequence[w]]||0);}
    if(hs>3.0&&hs>ss) return "helix";
    if(ss>2.5&&ss>hs) return "sheet";
    return "loop";
  });
}

function buildProteinData(parsed) {
  const{sequence}=parsed;
  const len=sequence.length;
  const seed=sequence.reduce((a,aa,i)=>a+aa.charCodeAt(0)*(i+1),0);
  const rng=seededRandom(seed);
  const backbone=parsed.backbone||generateBackboneFromSequence(sequence,seed);
  const ss=predictSS(sequence);
  let rmsf;
  if(parsed.bFactors&&parsed.bFactors.length===len){
    const maxB=Math.max(...parsed.bFactors,1);
    rmsf=parsed.bFactors.map(b=>(b/maxB)*5.5+0.3);
  } else {
    rmsf=sequence.map((_,i)=>ss[i]==="loop"?2.0+rng()*4.0:0.3+rng()*1.5);
  }
  const plddt=sequence.map((_,i)=>{const base=ss[i]==="loop"?55:85;return Math.min(100,Math.max(20,base+(rng()-0.5)*30));});
  const conformations=[];
  for(let c=0;c<120;c++){
    conformations.push(backbone.map((pos,i)=>{
      const sc=rmsf[i]*0.25;
      return [pos[0]+(rng()-0.5)*sc*2,pos[1]+(rng()-0.5)*sc*2,pos[2]+(rng()-0.5)*sc*2];
    }));
  }
  const attentionSize=Math.min(len,50);
  const attention=Array.from({length:attentionSize},(_,i)=>
    Array.from({length:attentionSize},(_,j)=>{
      const dist=Math.abs(i-j);
      let w=Math.exp(-dist*0.15)*(0.3+rng()*0.7);
      if(backbone[i]&&backbone[j]){
        const dx=backbone[i][0]-backbone[j][0],dy=backbone[i][1]-backbone[j][1],dz=backbone[i][2]-backbone[j][2];
        const d=Math.sqrt(dx*dx+dy*dy+dz*dz);
        if(d<8&&dist>10)w+=(1-d/8)*0.5;
      }
      return Math.min(1,w);
    })
  );
  return {sequence,backbone,rmsf,ss,plddt,conformations,attention,attentionSize,name:parsed.name,source:parsed.source};
}

function generateDemoData(pdbId="1UBQ") {
  const seed=pdbId.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const len=60+(seed%40);
  const rng=seededRandom(seed);
  const sequence=Array.from({length:len},()=>AMINO_ACIDS[Math.floor(rng()*20)]);
  const PDB_NAMES={
    "1UBQ":"Ubiquitin","4HHB":"Hemoglobin","6LU7":"SARS-CoV-2 Mpro",
    "7BZ5":"Spike RBD","2AW7":"GFP"
  };
  return buildProteinData({sequence,name:PDB_NAMES[pdbId]||pdbId,source:"demo"});
}

// ─── Color Utilities ────────────────────────────────────────────────────────────
function rmsfToColor(v,max=6){const t=Math.min(1,v/max);return `rgb(${Math.round(20+t*235)},${Math.round(220-t*180)},${Math.round(255-t*200)})`;}
function plddtToColor(v){if(v>90)return"#0077FF";if(v>70)return"#00CCDD";if(v>50)return"#FFB800";return"#FF4444";}
function plddtToHex(v){if(v>90)return 0x0077FF;if(v>70)return 0x00CCDD;if(v>50)return 0xFFB800;return 0xFF4444;}
function rmsfToHex(v,max=6){const t=Math.min(1,v/max);const r=Math.round(20+t*235),g=Math.round(220-t*180),b=Math.round(255-t*200);return(r<<16)|(g<<8)|b;}

// ─── Upload Modal ───────────────────────────────────────────────────────────────
function UploadModal({ isOpen, onClose, onDataLoaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [activeInput, setActiveInput] = useState("file");
  const [seqText, setSeqText] = useState("");
  const [fetchId, setFetchId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const processFile = async (file) => {
    setError(""); setParseResult(null); setLoading(true);
    try {
      const text = await file.text();
      const name = file.name.toLowerCase();
      let parsed = null;
      if (name.endsWith(".pdb") || name.endsWith(".ent")) {
        parsed = parsePDB(text);
        if (!parsed) throw new Error("No CA atoms found in PDB file.");
      } else if (name.endsWith(".cif") || name.endsWith(".mmcif")) {
        parsed = parseCIF(text);
        if (!parsed) throw new Error("No CA atoms found in mmCIF file.");
      } else if (name.endsWith(".fasta") || name.endsWith(".fa") || name.endsWith(".faa")) {
        parsed = parseFASTA(text);
        if (!parsed) throw new Error("Invalid FASTA. Ensure standard amino acid letters.");
      } else {
        if (text.includes("ATOM") && text.includes("CA")) parsed = parsePDB(text);
        else if (text.includes("_atom_site")) parsed = parseCIF(text);
        else if (text.startsWith(">")) parsed = parseFASTA(text);
        else parsed = parseRawSequence(text);
        if (!parsed) throw new Error("Unrecognized format. Supported: .pdb, .cif, .fasta, or plain sequence.");
      }
      setParseResult({ ...parsed, fileName: file.name, fileSize: (file.size/1024).toFixed(1)+" KB" });
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f=e.dataTransfer.files[0]; if(f) processFile(f); };
  const handleFileSelect = (e) => { const f=e.target.files[0]; if(f) processFile(f); };

  const handleSequenceSubmit = () => {
    setError(""); setParseResult(null);
    const t = seqText.trim();
    if (!t) { setError("Please enter a sequence."); return; }
    let parsed = t.startsWith(">") ? parseFASTA(t) : parseRawSequence(t);
    if (!parsed) { setError("Invalid sequence. Use standard single-letter AA codes (min 5 residues)."); return; }
    setParseResult(parsed);
  };

  const handleFetchPDB = async () => {
    const id = fetchId.trim().toUpperCase();
    if (!id || id.length !== 4) { setError("Enter a valid 4-character PDB ID."); return; }
    setError(""); setParseResult(null); setLoading(true);
    try {
      const resp = await fetch(`https://files.rcsb.org/download/${id}.pdb`);
      if (!resp.ok) throw new Error(`PDB ${id} not found (HTTP ${resp.status}).`);
      const text = await resp.text();
      const parsed = parsePDB(text);
      if (!parsed) throw new Error("Downloaded file contained no CA atoms.");
      parsed.name = `PDB: ${id} — ${parsed.name}`;
      setParseResult(parsed);
    } catch (e) {
      setError(`Could not fetch ${id}: ${e.message}. Try uploading a local .pdb file instead.`);
    }
    setLoading(false);
  };

  const handleLoadData = () => {
    if (!parseResult) return;
    onDataLoaded(buildProteinData(parseResult), parseResult);
    onClose();
  };

  const S = { mono: "'IBM Plex Mono', monospace" };
  const inputTabs = [
    { key: "file", label: "Upload File", icon: "↑" },
    { key: "sequence", label: "Paste Sequence", icon: "⌨" },
    { key: "fetch", label: "Fetch PDB ID", icon: "⬇" },
  ];

  return (
    <div onClick={(e)=>{if(e.target===e.currentTarget)onClose();}}
      style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(2,4,10,0.85)",backdropFilter:"blur(12px)",
        display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeIn 0.2s ease" }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width:"min(580px,92vw)",maxHeight:"88vh",overflow:"auto",background:"#0c1020",
        border:"1px solid #162040",borderRadius:"14px",animation:"slideUp 0.25s ease",
        boxShadow:"0 25px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(0,255,213,0.05)" }}>

        {/* Header */}
        <div style={{ padding:"18px 24px 14px",borderBottom:"1px solid #162040",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <h2 style={{ margin:0,fontSize:"15px",fontWeight:700,color:"#e0f0ff",fontFamily:"'Space Mono',monospace" }}>Load Protein Data</h2>
            <div style={{ fontSize:"10px",color:"#2a4a6a",fontFamily:S.mono,marginTop:"2px" }}>PDB · mmCIF · FASTA · Raw sequence · RCSB fetch</div>
          </div>
          <button onClick={onClose} style={{ width:"30px",height:"30px",borderRadius:"6px",border:"1px solid #1a2a40",
            background:"rgba(255,255,255,0.03)",color:"#4a6a8a",fontSize:"16px",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",borderBottom:"1px solid #162040" }}>
          {inputTabs.map(tab=>(
            <button key={tab.key} onClick={()=>{setActiveInput(tab.key);setError("");setParseResult(null);}}
              style={{ flex:1,padding:"10px 8px",border:"none",
                borderBottom:activeInput===tab.key?"2px solid #00ffd5":"2px solid transparent",
                background:"transparent",color:activeInput===tab.key?"#00ffd5":"#2a4a6a",
                fontSize:"10px",fontWeight:600,letterSpacing:"0.5px",cursor:"pointer",fontFamily:S.mono,transition:"all 0.2s" }}>
              <span style={{marginRight:"5px"}}>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding:"20px 24px" }}>
          {/* File upload */}
          {activeInput==="file" && (
            <div>
              <div onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
                onDrop={handleDrop} onClick={()=>fileInputRef.current?.click()}
                style={{ border:`2px dashed ${dragOver?"#00ffd5":"#1a2a44"}`,borderRadius:"10px",padding:"32px 20px",
                  textAlign:"center",cursor:"pointer",background:dragOver?"rgba(0,255,213,0.04)":"rgba(10,14,26,0.5)",transition:"all 0.25s" }}>
                <input ref={fileInputRef} type="file" accept=".pdb,.ent,.cif,.mmcif,.fasta,.fa,.faa,.txt" onChange={handleFileSelect} style={{display:"none"}} />
                <div style={{fontSize:"28px",marginBottom:"8px",opacity:0.5}}>{loading?"⏳":"🧬"}</div>
                <div style={{fontSize:"13px",color:"#6a8aaa",fontWeight:500,marginBottom:"6px"}}>{dragOver?"Drop file here":"Drag & drop a protein file or click to browse"}</div>
                <div style={{fontSize:"10px",color:"#2a4a6a",fontFamily:S.mono}}>.pdb · .ent · .cif · .mmcif · .fasta · .fa · .txt</div>
              </div>
              <div style={{marginTop:"10px",fontSize:"10px",color:"#2a4a6a",fontFamily:S.mono,lineHeight:1.6}}>
                <strong style={{color:"#3a5a7a"}}>PDB/mmCIF:</strong> Extracts Cα backbone coords, B-factors, and sequence from first chain. Supports AlphaFold pLDDT in B-factor column.<br/>
                <strong style={{color:"#3a5a7a"}}>FASTA:</strong> Sequence only — backbone predicted from AA propensities.
              </div>
            </div>
          )}

          {/* Sequence input */}
          {activeInput==="sequence" && (
            <div>
              <label style={{fontSize:"10px",color:"#3a5a7a",fontFamily:S.mono,display:"block",marginBottom:"6px"}}>
                Paste amino acid sequence (single-letter) or FASTA format:
              </label>
              <textarea value={seqText} onChange={(e)=>setSeqText(e.target.value)} spellCheck={false}
                placeholder={">sp|P0DTD1|Example\nMFVFLVLLPLVSSQCVNLTT...\n\nor just paste raw letters:\nMFVFLVLLPLVSSQCVNLTT..."}
                style={{ width:"100%",minHeight:"140px",padding:"12px",background:"#080c18",border:"1px solid #1a2a44",
                  borderRadius:"8px",color:"#8ab4d8",fontSize:"12px",fontFamily:S.mono,resize:"vertical",
                  lineHeight:1.5,boxSizing:"border-box",outline:"none" }}
                onFocus={(e)=>e.target.style.borderColor="#00ffd544"} onBlur={(e)=>e.target.style.borderColor="#1a2a44"} />
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"8px"}}>
                <span style={{fontSize:"9px",color:"#2a4a6a",fontFamily:S.mono}}>
                  {seqText?`${seqText.replace(/[^A-Za-z]/g,"").length} characters`:"Standard AAs: ACDEFGHIKLMNPQRSTVWY"}
                </span>
                <button onClick={handleSequenceSubmit} style={{
                  padding:"7px 18px",borderRadius:"6px",border:"1px solid #00ffd544",
                  background:"linear-gradient(135deg,rgba(0,255,213,0.1),rgba(0,100,255,0.1))",
                  color:"#00ffd5",fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:S.mono }}>PARSE SEQUENCE</button>
              </div>
              <div style={{marginTop:"12px"}}>
                <div style={{fontSize:"9px",color:"#2a4a6a",fontFamily:S.mono,marginBottom:"6px"}}>QUICK EXAMPLES</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {[{label:"Insulin B",seq:"FVNQHLCGSHLVEALYLVCGERGFFYTPKT"},
                    {label:"GFP region",seq:"SKGEELFTGVVPILVELDGDVNGHKFSVSGEGEGDATYGKLTLKFICTTGKLPVPWPTLVTTFSYGVQCFSRYPDHMKQHDFFKSAMPEGYV"},
                    {label:"Ubiquitin",seq:"MQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG"}
                  ].map(ex=>(
                    <button key={ex.label} onClick={()=>setSeqText(ex.seq)} style={{
                      padding:"4px 10px",borderRadius:"4px",border:"1px solid #152030",background:"rgba(10,14,26,0.8)",
                      color:"#4a7a9a",fontSize:"9px",cursor:"pointer",fontFamily:S.mono }}>{ex.label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fetch PDB */}
          {activeInput==="fetch" && (
            <div>
              <label style={{fontSize:"10px",color:"#3a5a7a",fontFamily:S.mono,display:"block",marginBottom:"6px"}}>
                Enter a PDB accession code to fetch from RCSB:
              </label>
              <div style={{display:"flex",gap:"8px"}}>
                <input value={fetchId} onChange={(e)=>setFetchId(e.target.value.toUpperCase().slice(0,4))} placeholder="1UBQ" maxLength={4}
                  style={{ flex:1,padding:"10px 14px",background:"#080c18",border:"1px solid #1a2a44",borderRadius:"8px",
                    color:"#00ffd5",fontSize:"16px",fontFamily:S.mono,letterSpacing:"4px",fontWeight:700,textAlign:"center",outline:"none" }}
                  onFocus={(e)=>e.target.style.borderColor="#00ffd544"} onBlur={(e)=>e.target.style.borderColor="#1a2a44"}
                  onKeyDown={(e)=>{if(e.key==="Enter")handleFetchPDB();}} />
                <button onClick={handleFetchPDB} disabled={loading} style={{
                  padding:"10px 20px",borderRadius:"8px",border:"1px solid #00ffd544",
                  background:loading?"rgba(40,40,60,0.5)":"linear-gradient(135deg,rgba(0,255,213,0.1),rgba(0,100,255,0.1))",
                  color:loading?"#3a5a7a":"#00ffd5",fontSize:"11px",fontWeight:600,
                  cursor:loading?"wait":"pointer",fontFamily:S.mono }}>{loading?"FETCHING...":"FETCH"}</button>
              </div>
              <div style={{marginTop:"12px"}}>
                <div style={{fontSize:"9px",color:"#2a4a6a",fontFamily:S.mono,marginBottom:"6px"}}>POPULAR STRUCTURES</div>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {[{id:"1UBQ",l:"Ubiquitin"},{id:"4HHB",l:"Hemoglobin"},{id:"6LU7",l:"SARS-CoV-2 Mpro"},
                    {id:"7BZ5",l:"Spike RBD"},{id:"2AW7",l:"GFP"},{id:"1CRN",l:"Crambin"},{id:"3NIR",l:"GLP-1R"}
                  ].map(ex=>(
                    <button key={ex.id} onClick={()=>setFetchId(ex.id)} style={{
                      padding:"4px 10px",borderRadius:"4px",
                      border:fetchId===ex.id?"1px solid #00ffd544":"1px solid #152030",
                      background:fetchId===ex.id?"rgba(0,255,213,0.06)":"rgba(10,14,26,0.8)",
                      color:fetchId===ex.id?"#00ffd5":"#4a7a9a",fontSize:"9px",cursor:"pointer",fontFamily:S.mono }}>
                      {ex.id} <span style={{color:"#2a4a6a"}}>· {ex.l}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginTop:"12px",fontSize:"10px",color:"#2a4a6a",fontFamily:S.mono,lineHeight:1.6}}>
                Downloads PDB from <strong style={{color:"#3a5a7a"}}>files.rcsb.org</strong>. Also try AlphaFold DB files via upload.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop:"12px",padding:"10px 14px",background:"rgba(255,60,60,0.06)",border:"1px solid rgba(255,60,60,0.2)",
              borderRadius:"8px",fontSize:"11px",color:"#ff6b6b",fontFamily:S.mono,lineHeight:1.5 }}>⚠ {error}</div>
          )}

          {/* Parse result */}
          {parseResult && (
            <div style={{ marginTop:"14px",padding:"14px 16px",background:"rgba(0,255,213,0.03)",
              border:"1px solid rgba(0,255,213,0.12)",borderRadius:"10px" }}>
              <div style={{fontSize:"9px",color:"#00ffd5",fontFamily:S.mono,letterSpacing:"1px",marginBottom:"8px"}}>✓ PARSED SUCCESSFULLY</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                <IC l="Name" v={parseResult.name}/><IC l="Source" v={parseResult.source?.toUpperCase()}/>
                <IC l="Residues" v={parseResult.sequence.length}/>
                {parseResult.backbone&&<IC l="3D Coords" v="Yes"/>}
                {parseResult.chainId&&<IC l="Chain" v={parseResult.chainId}/>}
                {parseResult.chains&&<IC l="All Chains" v={parseResult.chains.join(", ")}/>}
                {parseResult.fileName&&<IC l="File" v={parseResult.fileName}/>}
                {parseResult.fileSize&&<IC l="Size" v={parseResult.fileSize}/>}
                {parseResult.bFactors&&<IC l="B-factors" v="Extracted"/>}
              </div>
              <div style={{marginTop:"10px"}}>
                <div style={{fontSize:"9px",color:"#2a4a6a",fontFamily:S.mono,marginBottom:"4px"}}>SEQUENCE PREVIEW</div>
                <div style={{fontSize:"10px",fontFamily:S.mono,color:"#5a8aaa",wordBreak:"break-all",lineHeight:1.6,maxHeight:"48px",overflow:"hidden"}}>
                  {parseResult.sequence.map(aa=>AA_SHORT[aa]||"?").join("")}
                </div>
              </div>
              <button onClick={handleLoadData} style={{
                marginTop:"14px",width:"100%",padding:"11px",borderRadius:"8px",border:"1px solid #00ffd5",
                background:"linear-gradient(135deg,rgba(0,255,213,0.15),rgba(0,100,255,0.1))",
                color:"#00ffd5",fontSize:"12px",fontWeight:700,cursor:"pointer",fontFamily:"'Space Mono',monospace",letterSpacing:"1px" }}>
                LOAD INTO VIEWER →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IC({l,v}){return(<div><div style={{fontSize:"8px",color:"#2a4a6a",fontFamily:"'IBM Plex Mono',monospace",textTransform:"uppercase"}}>{l}</div><div style={{fontSize:"11px",color:"#8ab4d8",fontFamily:"'IBM Plex Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div></div>);}

// ─── 3D Viewer ──────────────────────────────────────────────────────────────────
function ProteinViewer3D({ data, colorMode, showEnsemble, ensembleOpacity, animationSpeed, mutatedResidue, highlightResidue, onResidueHover }) {
  const mountRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = container.clientWidth, h = container.clientHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.006);
    const camera = new THREE.PerspectiveCamera(50, w/h, 0.1, 500);
    camera.position.set(0, 0, 55);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0e1a, 1);
    container.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0x334466, 0.8));
    const d1 = new THREE.DirectionalLight(0x00ddff, 1.2); d1.position.set(10,20,15); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xff6644, 0.5); d2.position.set(-10,-5,-10); scene.add(d2);
    const pl = new THREE.PointLight(0x00ffaa, 0.6, 100); pl.position.set(0,0,30); scene.add(pl);
    const { backbone, rmsf, plddt, conformations, ss } = data;
    const curve = new THREE.CatmullRomCurve3(backbone.map(p=>new THREE.Vector3(p[0],p[1],p[2])));
    const tubeGeo = new THREE.TubeGeometry(curve, backbone.length*4, 0.35, 8, false);
    const colors = new Float32Array(tubeGeo.attributes.position.count*3);
    const segPer = Math.floor(tubeGeo.attributes.position.count/backbone.length);
    for (let i=0; i<tubeGeo.attributes.position.count; i++) {
      const ri = Math.min(backbone.length-1, Math.floor(i/segPer));
      let c;
      if (colorMode==="rmsf") c=new THREE.Color(rmsfToHex(rmsf[ri]));
      else if (colorMode==="plddt") c=new THREE.Color(plddtToHex(plddt[ri]));
      else if (colorMode==="secondary") { const s=ss[ri]; c=new THREE.Color(s==="helix"?0xFF6B6B:s==="sheet"?0x48DBFB:0x98D8C8); }
      else c=new THREE.Color(0x00ccdd);
      if (mutatedResidue===ri) c=new THREE.Color(0xFF00FF);
      if (highlightResidue===ri) c.lerp(new THREE.Color(0xFFFFFF),0.5);
      colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
    }
    tubeGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const tube = new THREE.Mesh(tubeGeo, new THREE.MeshPhongMaterial({vertexColors:true,shininess:80,transparent:true,opacity:0.95}));
    scene.add(tube);
    const spheres = [];
    backbone.forEach((pos,i) => {
      const geo = new THREE.SphereGeometry(0.45, 10, 10);
      let color;
      if (colorMode==="rmsf") color=rmsfToHex(rmsf[i]);
      else if (colorMode==="plddt") color=plddtToHex(plddt[i]);
      else if (colorMode==="secondary") {const s=ss[i];color=s==="helix"?0xFF6B6B:s==="sheet"?0x48DBFB:0x98D8C8;}
      else color=0x00ccdd;
      if (mutatedResidue===i) color=0xFF00FF;
      const mat = new THREE.MeshPhongMaterial({color,transparent:true,opacity:0.9});
      const sphere = new THREE.Mesh(geo, mat);
      sphere.position.set(pos[0],pos[1],pos[2]); sphere.userData={residueIndex:i};
      scene.add(sphere); spheres.push(sphere);
    });
    const ensG = new THREE.Group();
    if (showEnsemble) {
      conformations.slice(0,30).forEach(conf=>{
        const pts=conf.map(p=>new THREE.Vector3(p[0],p[1],p[2]));
        const c2=new THREE.CatmullRomCurve3(pts);
        const lg=new THREE.BufferGeometry().setFromPoints(c2.getPoints(backbone.length*2));
        ensG.add(new THREE.Line(lg,new THREE.LineBasicMaterial({color:0x00ffdd,transparent:true,opacity:ensembleOpacity*0.15})));
      });
    }
    scene.add(ensG);
    const pCnt=600,pGeo=new THREE.BufferGeometry(),pPos=new Float32Array(pCnt*3);
    for(let i=0;i<pCnt;i++){pPos[i*3]=(Math.random()-0.5)*120;pPos[i*3+1]=(Math.random()-0.5)*120;pPos[i*3+2]=(Math.random()-0.5)*120;}
    pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
    const particles=new THREE.Points(pGeo,new THREE.PointsMaterial({color:0x00aaff,size:0.15,transparent:true,opacity:0.35}));
    scene.add(particles);
    let mouseX=0,mouseY=0,isDragging=false,rotX=0,rotY=0,prevMX=0,prevMY=0;
    const onDown=(e)=>{isDragging=true;prevMX=e.clientX;prevMY=e.clientY;};
    const onUp=()=>{isDragging=false;};
    const onMove=(e)=>{
      if(isDragging){rotY+=(e.clientX-prevMX)*0.005;rotX+=(e.clientY-prevMY)*0.005;prevMX=e.clientX;prevMY=e.clientY;}
      const rect=container.getBoundingClientRect();
      mouseX=((e.clientX-rect.left)/rect.width)*2-1; mouseY=-((e.clientY-rect.top)/rect.height)*2+1;
    };
    const onWheel=(e)=>{camera.position.z=Math.max(15,Math.min(120,camera.position.z+e.deltaY*0.05));};
    container.addEventListener("mousedown",onDown); container.addEventListener("mouseup",onUp);
    container.addEventListener("mousemove",onMove); container.addEventListener("wheel",onWheel);
    const raycaster=new THREE.Raycaster(), mouse=new THREE.Vector2();
    let frame=0; const speed=animationSpeed||1;
    function animate(){
      animRef.current=requestAnimationFrame(animate);
      frame+=0.005*speed;
      const ar=frame*0.1;
      tube.rotation.y=ar+rotY; tube.rotation.x=rotX;
      ensG.rotation.y=ar+rotY; ensG.rotation.x=rotX;
      spheres.forEach(s=>{s.rotation.y=ar+rotY;s.rotation.x=rotX;});
      particles.rotation.y=frame*0.02; particles.rotation.x=frame*0.01;
      mouse.set(mouseX,mouseY); raycaster.setFromCamera(mouse,camera);
      const hits=raycaster.intersectObjects(spheres);
      if(hits.length>0&&hits[0].object.userData.residueIndex!==undefined) onResidueHover?.(hits[0].object.userData.residueIndex);
      renderer.render(scene,camera);
    }
    animate();
    const handleResize=()=>{const nw=container.clientWidth,nh=container.clientHeight;camera.aspect=nw/nh;camera.updateProjectionMatrix();renderer.setSize(nw,nh);};
    window.addEventListener("resize",handleResize);
    return ()=>{
      if(animRef.current)cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize",handleResize);
      container.removeEventListener("mousedown",onDown);container.removeEventListener("mouseup",onUp);
      container.removeEventListener("mousemove",onMove);container.removeEventListener("wheel",onWheel);
      if(renderer.domElement.parentNode)container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [data,colorMode,showEnsemble,ensembleOpacity,animationSpeed,mutatedResidue,highlightResidue]);
  return <div ref={mountRef} style={{width:"100%",height:"100%",cursor:"grab"}} />;
}

// ─── Attention Map ──────────────────────────────────────────────────────────────
function AttentionMap({ attention, size, sequence, highlightResidue, onResidueHover }) {
  const canvasRef = useRef(null);
  const [head, setHead] = useState(0);
  useEffect(() => {
    const canvas=canvasRef.current; if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const cs=Math.max(2,Math.floor(Math.min(280,280)/size));
    canvas.width=cs*size; canvas.height=cs*size;
    const off=head*7;
    for(let i=0;i<size;i++) for(let j=0;j<size;j++){
      const ri=(i+off)%size,rj=(j+off)%size;
      const val=attention[ri]?.[rj]||0;
      ctx.fillStyle=(i===highlightResidue||j===highlightResidue)
        ?`rgba(255,255,100,${0.3+val*0.7})`
        :`rgb(${Math.round(val*180+20)},${Math.round(val*60)},${Math.round(val*255)})`;
      ctx.fillRect(j*cs,i*cs,cs,cs);
    }
  },[attention,size,head,highlightResidue]);
  return (
    <div>
      <div style={{display:"flex",gap:"6px",marginBottom:"8px",flexWrap:"wrap"}}>
        {[0,1,2,3,4,5].map(h=>(
          <button key={h} onClick={()=>setHead(h)} style={{
            padding:"3px 10px",borderRadius:"4px",border:head===h?"1px solid #00ffd5":"1px solid #1a2540",
            background:head===h?"rgba(0,255,213,0.15)":"rgba(10,14,26,0.8)",
            color:head===h?"#00ffd5":"#5a7a9a",fontSize:"11px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>Head {h+1}</button>
        ))}
      </div>
      <canvas ref={canvasRef} style={{borderRadius:"6px",imageRendering:"pixelated",width:"100%",maxWidth:"280px",height:"auto",aspectRatio:"1"}}
        onMouseMove={(e)=>{const r=e.target.getBoundingClientRect();onResidueHover?.(Math.floor(((e.clientX-r.left)/r.width)*size));}} />
      <div style={{fontSize:"10px",color:"#3a5a7a",marginTop:"4px",fontFamily:"'IBM Plex Mono',monospace"}}>Residue 1–{size} · Attention intensity →</div>
    </div>
  );
}

// ─── Sequence Viewer ────────────────────────────────────────────────────────────
function SequenceViewer({ data, highlightResidue, mutatedResidue, onResidueClick, onResidueHover }) {
  const{sequence,ss,rmsf,plddt}=data;
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:"1px",fontFamily:"'IBM Plex Mono',monospace",fontSize:"11px"}}>
      {sequence.map((aa,i)=>{
        const isHL=highlightResidue===i,isMut=mutatedResidue===i;
        const bg=isMut?"rgba(255,0,255,0.4)":isHL?"rgba(0,255,213,0.25)":"rgba(15,22,40,0.8)";
        const ssC=ss[i]==="helix"?"#FF6B6B":ss[i]==="sheet"?"#48DBFB":"#3a5a6a";
        return (
          <div key={i} onClick={()=>onResidueClick?.(i)} onMouseEnter={()=>onResidueHover?.(i)}
            style={{width:"18px",height:"28px",display:"flex",flexDirection:"column",alignItems:"center",
              justifyContent:"center",background:bg,borderRadius:"2px",cursor:"pointer",
              borderBottom:`2px solid ${ssC}`,transition:"all 0.15s"}}
            title={`${i+1}: ${aa} (${AA_SHORT[aa]}) — RMSF: ${rmsf[i].toFixed(2)}Å — pLDDT: ${plddt[i].toFixed(0)}`}>
            <span style={{color:isHL?"#00ffd5":"#8ab4d8",fontWeight:isHL?700:400}}>{AA_SHORT[aa]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Charts ─────────────────────────────────────────────────────────────────────
function RMSFChart({data}){
  const cd=data.rmsf.map((v,i)=>({residue:i+1,rmsf:+v.toFixed(2)}));
  return (<ResponsiveContainer width="100%" height={140}>
    <AreaChart data={cd} margin={{top:5,right:5,bottom:5,left:5}}>
      <defs><linearGradient id="rmsfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF6B6B" stopOpacity={0.6}/><stop offset="100%" stopColor="#00ffd5" stopOpacity={0.1}/></linearGradient></defs>
      <XAxis dataKey="residue" tick={{fill:"#3a5a7a",fontSize:9}} axisLine={{stroke:"#1a2a40"}} />
      <YAxis tick={{fill:"#3a5a7a",fontSize:9}} axisLine={{stroke:"#1a2a40"}} label={{value:"RMSF (Å)",angle:-90,position:"insideLeft",style:{fill:"#3a5a7a",fontSize:9}}} />
      <Tooltip contentStyle={{background:"#0f1628",border:"1px solid #1a3050",borderRadius:"6px",fontSize:"11px"}} labelStyle={{color:"#00ffd5"}} />
      <Area type="monotone" dataKey="rmsf" stroke="#FF6B6B" fill="url(#rmsfGrad)" strokeWidth={1.5} dot={false} />
    </AreaChart>
  </ResponsiveContainer>);
}
function PLDDTChart({data}){
  const cd=data.plddt.map((v,i)=>({residue:i+1,plddt:+v.toFixed(1)}));
  return (<ResponsiveContainer width="100%" height={100}>
    <BarChart data={cd} margin={{top:5,right:5,bottom:5,left:5}}>
      <XAxis dataKey="residue" tick={false} axisLine={{stroke:"#1a2a40"}} />
      <YAxis domain={[0,100]} tick={{fill:"#3a5a7a",fontSize:9}} axisLine={{stroke:"#1a2a40"}} />
      <Tooltip contentStyle={{background:"#0f1628",border:"1px solid #1a3050",borderRadius:"6px",fontSize:"11px"}} labelStyle={{color:"#00ffd5"}} />
      <Bar dataKey="plddt" radius={[1,1,0,0]}>{cd.map((e,i)=><Cell key={i} fill={plddtToColor(e.plddt)} />)}</Bar>
    </BarChart>
  </ResponsiveContainer>);
}

// ─── Mutate Tool ────────────────────────────────────────────────────────────────
function MutateTool({data,mutatedResidue,setMutatedResidue,setMutatedAA}){
  const[selectedRes,setSelectedRes]=useState(Math.min(20,data.sequence.length-1));
  const[selectedAA,setSelectedAA]=useState("GLY");
  const[confidence,setConfidence]=useState(null);
  const handleMutate=()=>{setMutatedResidue(selectedRes);setMutatedAA(selectedAA);const rng=seededRandom(selectedRes*100+AMINO_ACIDS.indexOf(selectedAA));setConfidence(0.3+rng()*0.65);};
  const handleReset=()=>{setMutatedResidue(null);setMutatedAA(null);setConfidence(null);};
  return (
    <div>
      <div style={{display:"flex",gap:"8px",alignItems:"flex-end",flexWrap:"wrap"}}>
        <div>
          <label style={{fontSize:"10px",color:"#3a5a7a",display:"block",marginBottom:"3px",fontFamily:"'IBM Plex Mono',monospace"}}>Position</label>
          <input type="number" min={1} max={data.sequence.length} value={selectedRes+1}
            onChange={(e)=>setSelectedRes(Math.max(0,Math.min(data.sequence.length-1,parseInt(e.target.value)-1||0)))}
            style={{width:"60px",padding:"6px 8px",background:"#0a0e1a",border:"1px solid #1a3050",borderRadius:"4px",color:"#00ffd5",fontSize:"12px",fontFamily:"'IBM Plex Mono',monospace"}} />
        </div>
        <div>
          <label style={{fontSize:"10px",color:"#3a5a7a",display:"block",marginBottom:"3px",fontFamily:"'IBM Plex Mono',monospace"}}>
            {AA_SHORT[data.sequence[selectedRes]]} → Mutate to
          </label>
          <select value={selectedAA} onChange={(e)=>setSelectedAA(e.target.value)}
            style={{padding:"6px 8px",background:"#0a0e1a",border:"1px solid #1a3050",borderRadius:"4px",color:"#00ffd5",fontSize:"12px",fontFamily:"'IBM Plex Mono',monospace"}}>
            {AMINO_ACIDS.map(aa=><option key={aa} value={aa}>{AA_SHORT[aa]} — {aa}</option>)}
          </select>
        </div>
        <button onClick={handleMutate} style={{padding:"6px 16px",background:"linear-gradient(135deg,#FF006644,#FF00FF33)",border:"1px solid #FF00FF55",borderRadius:"4px",color:"#FF99FF",fontSize:"11px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",fontWeight:600}}>MUTATE</button>
        {mutatedResidue!==null&&<button onClick={handleReset} style={{padding:"6px 12px",background:"rgba(255,255,255,0.05)",border:"1px solid #1a3050",borderRadius:"4px",color:"#5a7a9a",fontSize:"11px",cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace"}}>RESET</button>}
      </div>
      {confidence!==null&&(
        <div style={{marginTop:"10px",padding:"10px",background:"rgba(255,0,255,0.05)",borderRadius:"6px",border:"1px solid #FF00FF22"}}>
          <div style={{fontSize:"10px",color:"#FF99FF",fontFamily:"'IBM Plex Mono',monospace",marginBottom:"4px"}}>MUTATION — {AA_SHORT[data.sequence[selectedRes]]}{selectedRes+1}{AA_SHORT[selectedAA]}</div>
          <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
            <div><div style={{fontSize:"9px",color:"#5a7a9a"}}>Confidence</div><div style={{fontSize:"18px",color:confidence>0.7?"#00ffd5":confidence>0.4?"#FFB800":"#FF4444",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700}}>{(confidence*100).toFixed(1)}%</div></div>
            <div><div style={{fontSize:"9px",color:"#5a7a9a"}}>ΔΔG predicted</div><div style={{fontSize:"18px",color:"#8ab4d8",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700}}>{((confidence-0.5)*4.2).toFixed(2)} kcal/mol</div></div>
            <div><div style={{fontSize:"9px",color:"#5a7a9a"}}>Ensemble shift</div><div style={{fontSize:"18px",color:"#A29BFE",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700}}>{((1-confidence)*3.1).toFixed(2)} Å</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Residue Info ───────────────────────────────────────────────────────────────
function ResidueInfo({data,residueIndex}){
  if(residueIndex===null||residueIndex===undefined)return<div style={{color:"#3a5a7a",fontSize:"11px",fontFamily:"'IBM Plex Mono',monospace",fontStyle:"italic"}}>Hover over a residue to inspect</div>;
  const aa=data.sequence[residueIndex];
  return (
    <div style={{fontFamily:"'IBM Plex Mono',monospace"}}>
      <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginBottom:"4px"}}>
        <span style={{fontSize:"24px",fontWeight:800,color:AA_COLORS[aa]||"#00ffd5"}}>{AA_SHORT[aa]}</span>
        <span style={{fontSize:"13px",color:"#8ab4d8"}}>{aa}</span>
        <span style={{fontSize:"11px",color:"#3a5a7a"}}>#{residueIndex+1}</span>
      </div>
      <div style={{display:"flex",gap:"14px",fontSize:"10px"}}>
        <div><span style={{color:"#3a5a7a"}}>RMSF </span><span style={{color:rmsfToColor(data.rmsf[residueIndex])}}>{data.rmsf[residueIndex].toFixed(2)} Å</span></div>
        <div><span style={{color:"#3a5a7a"}}>pLDDT </span><span style={{color:plddtToColor(data.plddt[residueIndex])}}>{data.plddt[residueIndex].toFixed(1)}</span></div>
        <div><span style={{color:"#3a5a7a"}}>SS </span><span style={{color:data.ss[residueIndex]==="helix"?"#FF6B6B":data.ss[residueIndex]==="sheet"?"#48DBFB":"#98D8C8"}}>{data.ss[residueIndex]}</span></div>
      </div>
    </div>
  );
}

// ─── Small helpers ──────────────────────────────────────────────────────────────
function SectionTitle({children}){return <div style={{fontSize:"9px",fontWeight:700,color:"#2a4a6a",letterSpacing:"2px",textTransform:"uppercase",fontFamily:"'IBM Plex Mono',monospace",marginBottom:"8px",marginTop:"4px",paddingBottom:"4px",borderBottom:"1px solid #111a2e"}}>{children}</div>;}
function MetricCard({label,value,unit,color}){return(
  <div style={{padding:"10px 12px",background:"rgba(15,22,40,0.6)",borderRadius:"6px",border:"1px solid #152030",marginBottom:"6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
    <span style={{fontSize:"10px",color:"#3a5a7a",fontFamily:"'IBM Plex Mono',monospace"}}>{label}</span>
    <div><span style={{fontSize:"18px",fontWeight:700,color,fontFamily:"'IBM Plex Mono',monospace"}}>{value}</span>
    {unit&&<span style={{fontSize:"9px",color:"#3a5a7a",marginLeft:"4px",fontFamily:"'IBM Plex Mono',monospace"}}>{unit}</span>}</div>
  </div>
);}

const PDB_ENTRIES=[{id:"1UBQ",name:"Ubiquitin",organism:"Human",resolution:"1.8 Å"},{id:"4HHB",name:"Hemoglobin",organism:"Human",resolution:"1.74 Å"},{id:"6LU7",name:"SARS-CoV-2 Mpro",organism:"Virus",resolution:"2.16 Å"},{id:"7BZ5",name:"Spike RBD",organism:"SARS-CoV-2",resolution:"2.45 Å"},{id:"2AW7",name:"GFP",organism:"A. victoria",resolution:"2.0 Å"}];

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main App ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function FoldFlowApp() {
  const [data, setData] = useState(() => generateDemoData("1UBQ"));
  const [activeTab, setActiveTab] = useState("ensemble");
  const [colorMode, setColorMode] = useState("plddt");
  const [showEnsemble, setShowEnsemble] = useState(true);
  const [ensembleOpacity, setEnsembleOpacity] = useState(0.6);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [highlightResidue, setHighlightResidue] = useState(null);
  const [mutatedResidue, setMutatedResidue] = useState(null);
  const [mutatedAA, setMutatedAA] = useState(null);
  const [selectedPDB, setSelectedPDB] = useState("1UBQ");
  const [isLoaded, setIsLoaded] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [customName, setCustomName] = useState(null);
  const [dataSource, setDataSource] = useState("demo");

  useEffect(() => { setTimeout(() => setIsLoaded(true), 100); }, []);

  const handlePDBChange = (pdbId) => {
    setSelectedPDB(pdbId);
    setData(generateDemoData(pdbId));
    setMutatedResidue(null); setMutatedAA(null); setHighlightResidue(null);
    setCustomName(null); setDataSource("demo");
  };

  const handleDataLoaded = (fullData) => {
    setData(fullData);
    setCustomName(fullData.name);
    setDataSource("uploaded");
    setSelectedPDB(null);
    setMutatedResidue(null); setMutatedAA(null); setHighlightResidue(null);
    setActiveTab("ensemble");
  };

  const tabs = [
    { key: "ensemble", label: "ENSEMBLE" },
    { key: "mutate", label: "MUTATE" },
    { key: "attention", label: "ATTENTION" },
    { key: "metrics", label: "METRICS" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#c0d8f0",
      fontFamily: "'Instrument Sans', 'Segoe UI', system-ui, sans-serif", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Instrument+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onDataLoaded={handleDataLoaded} />

      {/* ── Header ── */}
      <header style={{
        padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid #111a2e", background: "rgba(10,14,26,0.95)",
        backdropFilter: "blur(20px)", position: "relative", zIndex: 10, flexWrap: "wrap", gap: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "7px",
            background: "linear-gradient(135deg, #00ffd5, #0066ff, #ff00ff)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "15px", fontWeight: 800, color: "#0a0e1a", fontFamily: "'Space Mono', monospace",
          }}>F</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "14px", fontWeight: 700, letterSpacing: "0.5px",
              background: "linear-gradient(90deg, #00ffd5, #48DBFB)", WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent", fontFamily: "'Space Mono', monospace",
            }}>FOLDFLOW DYNAMICS</h1>
            <div style={{ fontSize: "8px", color: "#2a4a6a", letterSpacing: "2px", fontFamily: "'IBM Plex Mono', monospace" }}>
              PROTEIN ENSEMBLE ANIMATOR
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setUploadOpen(true)} style={{
            padding: "5px 14px", borderRadius: "6px", border: "1px solid #00ffd544",
            background: "linear-gradient(135deg, rgba(0,255,213,0.08), rgba(0,100,255,0.06))",
            color: "#00ffd5", fontSize: "10px", fontWeight: 600,
            cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
            display: "flex", alignItems: "center", gap: "5px", transition: "all 0.2s",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,255,213,0.15)"; e.currentTarget.style.borderColor = "#00ffd5"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,255,213,0.08), rgba(0,100,255,0.06))"; e.currentTarget.style.borderColor = "#00ffd544"; }}
          ><span style={{ fontSize: "13px" }}>+</span> LOAD DATA</button>

          <div style={{ width: "1px", height: "20px", background: "#162040", margin: "0 4px" }} />
          <span style={{ fontSize: "9px", color: "#2a4a6a", fontFamily: "'IBM Plex Mono', monospace" }}>DEMO</span>
          {PDB_ENTRIES.map(pdb => (
            <button key={pdb.id} onClick={() => handlePDBChange(pdb.id)} style={{
              padding: "4px 8px", borderRadius: "4px",
              border: selectedPDB === pdb.id ? "1px solid #00ffd5" : "1px solid #152030",
              background: selectedPDB === pdb.id ? "rgba(0,255,213,0.1)" : "transparent",
              color: selectedPDB === pdb.id ? "#00ffd5" : "#3a5a7a",
              fontSize: "9px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 500, transition: "all 0.2s",
            }} title={`${pdb.name} (${pdb.organism})`}>{pdb.id}</button>
          ))}
        </div>
      </header>

      {/* Source banner for uploaded data */}
      {dataSource === "uploaded" && customName && (
        <div style={{
          padding: "6px 20px", background: "rgba(0,255,213,0.04)",
          borderBottom: "1px solid rgba(0,255,213,0.1)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          fontFamily: "'IBM Plex Mono', monospace", fontSize: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ color: "#00ffd5", fontWeight: 700 }}>◆ USER DATA</span>
            <span style={{ color: "#5a8aaa" }}>{customName}</span>
            <span style={{ color: "#2a4a6a" }}>·</span>
            <span style={{ color: "#3a5a7a" }}>{data.sequence.length} residues</span>
            <span style={{ color: "#2a4a6a" }}>·</span>
            <span style={{ color: "#3a5a7a" }}>{data.conformations.length} conf.</span>
            {data.source === "pdb" && <span style={{ color: "#2a4a6a" }}>· 3D from file</span>}
            {(data.source === "fasta" || data.source === "raw") && <span style={{ color: "#2a4a6a" }}>· backbone predicted</span>}
          </div>
          <button onClick={() => setUploadOpen(true)} style={{
            padding: "2px 10px", borderRadius: "4px", border: "1px solid #152030",
            background: "transparent", color: "#3a5a7a", fontSize: "9px",
            cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
          }}>CHANGE</button>
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 340px", gridTemplateRows: "1fr auto",
        height: dataSource === "uploaded" ? "calc(100vh - 86px)" : "calc(100vh - 56px)",
        gap: "0", opacity: isLoaded ? 1 : 0, transition: "opacity 0.6s ease",
      }}>
        {/* 3D Viewer */}
        <div style={{ position: "relative", borderRight: "1px solid #111a2e" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setUploadOpen(true); }}>
          <ProteinViewer3D data={data} colorMode={colorMode} showEnsemble={showEnsemble}
            ensembleOpacity={ensembleOpacity} animationSpeed={animationSpeed}
            mutatedResidue={mutatedResidue} highlightResidue={highlightResidue}
            onResidueHover={setHighlightResidue} />

          <div style={{ position: "absolute", bottom: "50px", left: "50%", transform: "translateX(-50%)",
            fontSize: "9px", color: "#1a3050", fontFamily: "'IBM Plex Mono', monospace", pointerEvents: "none", textAlign: "center" }}>
            drop .pdb / .fasta files here
          </div>

          {/* Overlay controls */}
          <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexDirection: "column", gap: "6px", zIndex: 5 }}>
            <div style={{ padding: "8px 12px", background: "rgba(10,14,26,0.85)", backdropFilter: "blur(12px)", borderRadius: "8px", border: "1px solid #152030" }}>
              <div style={{ fontSize: "9px", color: "#2a4a6a", marginBottom: "6px", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "1px" }}>COLORING</div>
              <div style={{ display: "flex", gap: "4px" }}>
                {[{ key:"plddt",label:"pLDDT" },{ key:"rmsf",label:"RMSF" },{ key:"secondary",label:"SS" },{ key:"uniform",label:"MONO" }].map(m => (
                  <button key={m.key} onClick={() => setColorMode(m.key)} style={{
                    padding: "3px 8px", borderRadius: "3px",
                    border: colorMode === m.key ? "1px solid #00ffd5" : "1px solid transparent",
                    background: colorMode === m.key ? "rgba(0,255,213,0.12)" : "transparent",
                    color: colorMode === m.key ? "#00ffd5" : "#3a5a7a",
                    fontSize: "9px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600,
                  }}>{m.label}</button>
                ))}
              </div>
            </div>

            <div style={{ padding: "8px 12px", background: "rgba(10,14,26,0.85)", backdropFilter: "blur(12px)", borderRadius: "8px", border: "1px solid #152030" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <div style={{ fontSize: "9px", color: "#2a4a6a", fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "1px" }}>ENSEMBLE</div>
                <button onClick={() => setShowEnsemble(!showEnsemble)} style={{
                  padding: "2px 8px", borderRadius: "3px",
                  border: "1px solid " + (showEnsemble ? "#00ffd544" : "#1a253544"),
                  background: showEnsemble ? "rgba(0,255,213,0.1)" : "transparent",
                  color: showEnsemble ? "#00ffd5" : "#3a5a7a",
                  fontSize: "9px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
                }}>{showEnsemble ? "ON" : "OFF"}</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "8px", color: "#2a4a6a", fontFamily: "'IBM Plex Mono', monospace", width: "45px" }}>OPACITY</span>
                  <input type="range" min={0} max={1} step={0.05} value={ensembleOpacity}
                    onChange={(e) => setEnsembleOpacity(+e.target.value)} style={{ width: "80px", accentColor: "#00ffd5" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "8px", color: "#2a4a6a", fontFamily: "'IBM Plex Mono', monospace", width: "45px" }}>SPEED</span>
                  <input type="range" min={0} max={5} step={0.25} value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(+e.target.value)} style={{ width: "80px", accentColor: "#00ffd5" }} />
                  <span style={{ fontSize: "8px", color: "#3a5a7a", fontFamily: "'IBM Plex Mono', monospace" }}>{animationSpeed}×</span>
                </div>
              </div>
            </div>
          </div>

          {/* Residue info */}
          <div style={{ position: "absolute", bottom: "12px", left: "12px", padding: "10px 14px",
            background: "rgba(10,14,26,0.85)", backdropFilter: "blur(12px)", borderRadius: "8px",
            border: "1px solid #152030", zIndex: 5 }}>
            <ResidueInfo data={data} residueIndex={highlightResidue} />
          </div>

          {/* Stats */}
          <div style={{ position: "absolute", top: "12px", right: "12px", padding: "8px 12px",
            background: "rgba(10,14,26,0.85)", backdropFilter: "blur(12px)", borderRadius: "8px",
            border: "1px solid #152030", fontFamily: "'IBM Plex Mono', monospace", fontSize: "9px", zIndex: 5 }}>
            <div style={{ color: "#2a4a6a", letterSpacing: "1px", marginBottom: "4px" }}>STRUCTURE</div>
            <div style={{ color: "#5a8aaa" }}>{data.sequence.length} residues · {data.conformations.length} conf.</div>
            <div style={{ color: "#5a8aaa" }}>
              {dataSource === "uploaded"
                ? <><span style={{ color: "#00ffd5" }}>◆</span> {customName}</>
                : <>PDB: <span style={{ color: "#00ffd5" }}>{selectedPDB}</span> · {PDB_ENTRIES.find(p => p.id === selectedPDB)?.name}</>}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: "flex", flexDirection: "column", background: "rgba(8,12,22,0.95)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #111a2e", padding: "0 8px" }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                flex: 1, padding: "10px 4px", border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #00ffd5" : "2px solid transparent",
                background: "transparent", color: activeTab === tab.key ? "#00ffd5" : "#2a4a6a",
                fontSize: "9px", fontWeight: 700, letterSpacing: "1.5px",
                cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", transition: "all 0.2s",
              }}>{tab.label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "14px" }}>
            {activeTab === "ensemble" && (
              <div>
                <SectionTitle>Conformational Ensemble</SectionTitle>
                <p style={{ fontSize: "11px", color: "#4a6a8a", lineHeight: 1.5, margin: "0 0 12px" }}>
                  {dataSource === "uploaded"
                    ? <>Viewing <span style={{ color: "#00ffd5" }}>{customName}</span> with {data.conformations.length} generated conformations. {data.source === "pdb" ? "3D coordinates extracted from your file." : "Backbone predicted from sequence propensities."}</>
                    : <>Proteins aren't frozen — they breathe. This viewer overlays <span style={{ color: "#00ffd5" }}>{data.conformations.length} AI-generated conformations</span> showing the dynamic ensemble.</>}
                </p>
                <SectionTitle>RMSF — Flexibility Heatmap</SectionTitle>
                <RMSFChart data={data} />
                <div style={{ marginTop: "12px" }}>
                  <SectionTitle>pLDDT Confidence</SectionTitle>
                  <PLDDTChart data={data} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                    {[{ label: "Very High", color: "#0077FF", range: ">90" },{ label: "High", color: "#00CCDD", range: "70–90" },
                      { label: "Low", color: "#FFB800", range: "50–70" },{ label: "Very Low", color: "#FF4444", range: "<50" }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: l.color }} />
                        <span style={{ fontSize: "8px", color: "#3a5a7a", fontFamily: "'IBM Plex Mono', monospace" }}>{l.range}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {dataSource === "uploaded" && (
                  <div style={{ marginTop: "14px", padding: "10px", background: "rgba(0,255,213,0.03)", borderRadius: "8px", border: "1px solid rgba(0,255,213,0.08)" }}>
                    <div style={{ fontSize: "9px", color: "#00ffd5", fontFamily: "'IBM Plex Mono', monospace", marginBottom: "4px", fontWeight: 700 }}>YOUR DATA</div>
                    <p style={{ fontSize: "10px", color: "#3a5a7a", lineHeight: 1.6, margin: 0 }}>
                      {data.source === "pdb" && "Backbone from Cα atoms. B-factors → RMSF. Ensemble sampled around experimental structure."}
                      {data.source === "cif" && "Coordinates from mmCIF. Ensemble generated around experimental backbone."}
                      {data.source === "fasta" && "No 3D coords — backbone predicted from AA propensities. Upload .pdb for experimental coordinates."}
                      {data.source === "raw" && "Backbone predicted from sequence. Upload .pdb/.cif for real structural data."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "mutate" && (
              <div>
                <SectionTitle>Mutate & Watch</SectionTitle>
                <p style={{ fontSize: "11px", color: "#4a6a8a", lineHeight: 1.5, margin: "0 0 12px" }}>
                  Change any amino acid and observe ensemble shift with predicted ΔΔG and confidence.
                </p>
                <MutateTool data={data} mutatedResidue={mutatedResidue}
                  setMutatedResidue={setMutatedResidue} setMutatedAA={setMutatedAA} />
                <div style={{ marginTop: "16px" }}>
                  <SectionTitle>Sequence</SectionTitle>
                  <SequenceViewer data={data} highlightResidue={highlightResidue} mutatedResidue={mutatedResidue}
                    onResidueClick={setHighlightResidue} onResidueHover={setHighlightResidue} />
                </div>
              </div>
            )}

            {activeTab === "attention" && (
              <div>
                <SectionTitle>Attention Map Explorer</SectionTitle>
                <p style={{ fontSize: "11px", color: "#4a6a8a", lineHeight: 1.5, margin: "0 0 12px" }}>
                  Each head learns different features—local geometry, long-range contacts, or hydrophobic packing.
                </p>
                <AttentionMap attention={data.attention} size={data.attentionSize} sequence={data.sequence}
                  highlightResidue={highlightResidue} onResidueHover={setHighlightResidue} />
                <div style={{ marginTop: "14px" }}>
                  <SectionTitle>Interpreting Attention</SectionTitle>
                  <div style={{ fontSize: "10px", color: "#3a5a7a", lineHeight: 1.6 }}>
                    <p style={{ margin: "0 0 6px" }}><span style={{ color: "#00ffd5" }}>Diagonal</span> — local sequence context</p>
                    <p style={{ margin: "0 0 6px" }}><span style={{ color: "#FF6B6B" }}>Off-diagonal</span> — 3D contacts (far in seq, close in space)</p>
                    <p style={{ margin: "0 0 6px" }}><span style={{ color: "#A29BFE" }}>Diffuse</span> — global fold / co-variation signals</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "metrics" && (
              <div>
                <SectionTitle>Structure Metrics</SectionTitle>
                <MetricCard label="Mean pLDDT" value={(data.plddt.reduce((a,b)=>a+b,0)/data.plddt.length).toFixed(1)} unit="" color="#00CCDD" />
                <MetricCard label="Mean RMSF" value={(data.rmsf.reduce((a,b)=>a+b,0)/data.rmsf.length).toFixed(2)} unit="Å" color="#FF6B6B" />
                <MetricCard label="Max Flexibility" value={Math.max(...data.rmsf).toFixed(2)} unit="Å" color="#FFB800" />
                <MetricCard label="Ensemble Size" value={data.conformations.length} unit="conf." color="#A29BFE" />
                <MetricCard label="Residues" value={data.sequence.length} unit="" color="#48DBFB" />
                <div style={{ marginTop: "14px" }}>
                  <SectionTitle>Secondary Structure</SectionTitle>
                  <div style={{ display: "flex", gap: "12px", marginTop: "6px" }}>
                    {["helix","sheet","loop"].map(type => {
                      const count = data.ss.filter(s => s === type).length;
                      const pct = ((count/data.ss.length)*100).toFixed(0);
                      const col = type==="helix"?"#FF6B6B":type==="sheet"?"#48DBFB":"#98D8C8";
                      return (<div key={type} style={{ flex: 1 }}>
                        <div style={{ fontSize: "9px", color: "#3a5a7a", fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase" }}>{type}</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: col, fontFamily: "'IBM Plex Mono', monospace" }}>{pct}%</div>
                        <div style={{ fontSize: "9px", color: "#2a4a6a", fontFamily: "'IBM Plex Mono', monospace" }}>{count} res</div>
                      </div>);
                    })}
                  </div>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <SectionTitle>Database Links</SectionTitle>
                  <p style={{ fontSize: "9px", color: "#2a4a6a", fontFamily: "'IBM Plex Mono', monospace" }}>
                    <a href="https://www.rcsb.org" target="_blank" rel="noopener" style={{ color: "#3a6a9a" }}>RCSB PDB</a>{" · "}
                    <a href="https://alphafold.ebi.ac.uk" target="_blank" rel="noopener" style={{ color: "#3a6a9a" }}>AlphaFold DB</a>{" · "}
                    <a href="https://www.uniprot.org" target="_blank" rel="noopener" style={{ color: "#3a6a9a" }}>UniProt</a>{" · "}
                    <a href="https://www.ebi.ac.uk/pdbe/" target="_blank" rel="noopener" style={{ color: "#3a6a9a" }}>PDBe</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Sequence Strip */}
        <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #111a2e", padding: "8px 14px",
          background: "rgba(8,12,22,0.95)", overflow: "auto" }}>
          <SequenceViewer data={data} highlightResidue={highlightResidue} mutatedResidue={mutatedResidue}
            onResidueClick={setHighlightResidue} onResidueHover={setHighlightResidue} />
        </div>
      </div>
    </div>
  );
}
