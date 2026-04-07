"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import * as Papa from "papaparse";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, Cell, ZAxis, ReferenceLine,
} from "recharts";
import _ from "lodash";

/* ═══════════════════════════════════════════════════════════════════════════════
   SAMPLE DATA
   ═══════════════════════════════════════════════════════════════════════════════ */
const SAMPLE_TSV = `Sample_ID\tCompleteness\tContamination\tComplete_SCO\tCSS\tN50\tTaxonomy_Level
S1\t86.64\t5.32\t4.83\t0.17\t7004\tGenusB
S1\t78.22\t9.82\t23.57\t0.38\t9415\tGenusB
S1\t97.51\t2.71\t57.03\t0.26\t9520\tGenusC
S1\t57.68\t6.78\t52.09\t0.49\t2189\tGenusA
S1\t86.54\t9.19\t52.14\t0.11\t9021\tGenusA
S1\t65.97\t5.51\t6.03\t0.31\t9395\tGenusC
S1\t65.70\t0.31\t79.76\t0.28\t7968\tGenusA
S1\t65.45\t4.29\t80.19\t0.02\t3528\tGenusB
S1\t70.25\t1.45\t25.45\t0.24\t8547\tGenusA
S1\t77.36\t1.92\t52.35\t0.30\t5996\tGenusA
S2\t78.21\t6.85\t7.12\t0.45\t6178\tGenusB
S2\t97.90\t2.71\t88.05\t0.07\t1410\tGenusC
S2\t98.41\t3.23\t99.83\t0.03\t6485\tGenusC
S2\t52.38\t3.09\t30.72\t0.46\t8222\tGenusC
S2\t53.14\t5.02\t18.70\t0.42\t3851\tGenusB
S2\t80.47\t4.30\t59.15\t0.03\t1723\tGenusA
S2\t58.25\t7.30\t85.86\t0.36\t5389\tGenusC
S2\t67.37\t3.46\t97.26\t0.16\t5893\tGenusC
S2\t59.27\t8.74\t71.39\t0.25\t5958\tGenusA
S2\t60.13\t4.68\t23.92\t0.18\t7658\tGenusB
S3\t72.17\t6.15\t78.49\t0.23\t8545\tGenusC
S3\t77.37\t2.49\t95.51\t0.21\t6187\tGenusB
S3\t53.79\t6.96\t54.76\t0.34\t4277\tGenusC
S3\t57.22\t6.97\t18.61\t0.18\t3229\tGenusC
S3\t99.19\t3.01\t94.59\t0.08\t4478\tGenusC
S3\t71.82\t3.85\t86.22\t0.05\t1093\tGenusC
S3\t88.57\t8.16\t56.26\t0.00\t2439\tGenusA
S3\t71.72\t6.46\t68.59\t0.09\t1952\tGenusB
S3\t84.36\t3.39\t4.01\t0.41\t8942\tGenusA
S3\t80.93\t6.23\t4.23\t0.41\t7274\tGenusB`;

/* ═══════════════════════════════════════════════════════════════════════════════
   STAT UTILITIES
   ═══════════════════════════════════════════════════════════════════════════════ */
function classifyQuality(comp, cont) {
  if (comp > 90 && cont < 5) return "High";
  if (comp > 50 && cont < 10) return "Medium";
  return "Low";
}

function gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const c = [0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < 9; i++) x += c[i] / (z + i);
  const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
function lnGamma(z) { return Math.log(gamma(z)); }
function lowerGamma(s, x) {
  let sum = 0, term = 1 / s;
  for (let n = 0; n < 200; n++) { sum += term; term *= x / (s + n + 1); if (Math.abs(term) < 1e-12) break; }
  return sum * Math.pow(x, s) * Math.exp(-x);
}
function chiSquaredCDF(x, k) { return x <= 0 ? 0 : lowerGamma(k/2, x/2) / gamma(k/2); }
function betaCF(x, a, b) {
  let c=1, d=1-((a+b)*x)/(a+1); if(Math.abs(d)<1e-30) d=1e-30; d=1/d; let h=d;
  for(let m=1;m<=200;m++){let m2=2*m,aa=m*(b-m)*x/((a-1+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;h*=d*c;aa=-(a+m)*(a+b+m)*x/((a+m2)*(a+1+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;h*=d*c;if(Math.abs(d*c-1)<3e-7)break;}return h;
}
function betaReg(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(lnGamma(a+b)-lnGamma(a)-lnGamma(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betaCF(x,a,b)/a:1-bt*betaCF(1-x,b,a)/b;}
function fDistCDF(x,d1,d2){return x<=0?0:betaReg(d1*x/(d1*x+d2),d1/2,d2/2);}

function kruskalWallis(groups) {
  const all = []; groups.forEach((g,gi) => g.forEach(v => all.push({v,g:gi,rank:0})));
  all.sort((a,b) => a.v-b.v); all.forEach((_,i) => all[i].rank=i+1);
  let i=0; while(i<all.length){let j=i;while(j<all.length&&all[j].v===all[i].v)j++;const avg=all.slice(i,j).reduce((s,x)=>s+x.rank,0)/(j-i);for(let k=i;k<j;k++)all[k].rank=avg;i=j;}
  const N=all.length;let H=0;groups.forEach((_,gi)=>{const gr=all.filter(x=>x.g===gi);if(!gr.length)return;const R=gr.reduce((s,x)=>s+x.rank,0);H+=R*R/gr.length;});
  H=(12/(N*(N+1)))*H-3*(N+1);const df=groups.filter(g=>g.length>0).length-1;if(df<=0)return{H:0,p:1};
  return{H:Math.max(0,H),p:Math.max(0,Math.min(1,1-chiSquaredCDF(H,df)))};
}
function welchANOVA(groups) {
  const f=groups.filter(g=>g.length>1);if(f.length<2)return{F:0,p:1};
  const mn=f.map(g=>_.mean(g)),va=f.map(g=>{const m=_.mean(g);return g.reduce((s,v)=>s+(v-m)**2,0)/(g.length-1);}),ns=f.map(g=>g.length);
  const w=ns.map((n,i)=>n/va[i]),tw=_.sum(w),gm=w.reduce((s,wi,i)=>s+wi*mn[i],0)/tw,k=f.length;
  let Fn=0;w.forEach((wi,i)=>Fn+=wi*(mn[i]-gm)**2);Fn/=(k-1);
  let lam=0;w.forEach((wi,i)=>lam+=(1-wi/tw)**2/(ns[i]-1));lam*=3/(k*k-1);
  const F=Fn/(1+2*(k-2)*lam/(k*k-1)),p=1-fDistCDF(F,k-1,1/lam);
  return{F:Math.max(0,F),p:Math.max(0,Math.min(1,p))};
}
function boxStats(vals) {
  if(!vals?.length) return null;
  const s=[...vals].sort((a,b)=>a-b),n=s.length;
  const q1=s[Math.floor(n*.25)],med=s[Math.floor(n*.5)],q3=s[Math.floor(n*.75)],iqr=q3-q1;
  const lo=Math.max(s[0],q1-1.5*iqr),hi=Math.min(s[n-1],q3+1.5*iqr);
  return{q1,median:med,q3,lower:lo,upper:hi,min:s[0],max:s[n-1],outliers:s.filter(v=>v<lo||v>hi),mean:_.mean(vals)};
}

/* ═══════════════════════════════════════════════════════════════════════════════
   COLOR
   ═══════════════════════════════════════════════════════════════════════════════ */
const PAL = { GenusA:"#0ea5e9",GenusB:"#f59e0b",GenusC:"#e879a0",GenusD:"#8b5cf6",GenusE:"#10b981",GenusF:"#f97316",High:"#10b981",Medium:"#f59e0b",Low:"#ef4444",S1:"#0ea5e9",S2:"#f59e0b",S3:"#e879a0",S4:"#8b5cf6",S5:"#10b981"};
function gc(k) { return PAL[k] || `hsl(${(k||"").split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360},65%,52%)`; }

/* ═══════════════════════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════════════════════ */
function useToast() {
  const [msgs, setMsgs] = useState([]);
  const show = useCallback((text, type="success") => {
    const id = Date.now();
    setMsgs(p => [...p, {id,text,type}]);
    setTimeout(() => setMsgs(p => p.filter(m => m.id !== id)), 2800);
  }, []);
  const Toasts = () => (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {msgs.map(m => (
        <div key={m.id} style={{pointerEvents:"auto",padding:"10px 16px",borderRadius:10,boxShadow:"0 8px 30px rgba(0,0,0,0.12)",fontSize:13,fontWeight:600,color:"#fff",background:m.type==="success"?"#059669":m.type==="error"?"#dc2626":"#0284c7",animation:"slideUp 0.3s ease"}}>
          {m.text}
        </div>
      ))}
    </div>
  );
  return { show, Toasts };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EXPORT UTILITIES
   ═══════════════════════════════════════════════════════════════════════════════ */
function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportChartPNG(chartRef, filename, toast) {
  if (!chartRef?.current) return;
  const svgEl = chartRef.current.querySelector("svg");
  if (!svgEl) { toast?.("No SVG found","error"); return; }
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  clone.querySelectorAll("*").forEach(el => {
    const cs = window.getComputedStyle(el);
    ["fill","stroke","stroke-width","font-size","font-family","font-weight","opacity","text-anchor"].forEach(p => {
      const v = cs.getPropertyValue(p); if (v) el.style[p] = v;
    });
  });
  const svgStr = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([svgStr], {type:"image/svg+xml;charset=utf-8"}));
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const sc = 3;
    canvas.width = svgEl.clientWidth * sc; canvas.height = svgEl.clientHeight * sc;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => { downloadBlob(blob, filename); toast?.(`Exported ${filename}`); }, "image/png");
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function exportChartSVG(chartRef, filename, toast) {
  const svgEl = chartRef?.current?.querySelector("svg");
  if (!svgEl) return;
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns","http://www.w3.org/2000/svg");
  downloadBlob(new Blob([new XMLSerializer().serializeToString(clone)],{type:"image/svg+xml"}), filename);
  toast?.(`Exported ${filename}`);
}

function copyText(text, toast) {
  navigator.clipboard.writeText(text).then(() => toast?.("Copied to clipboard")).catch(() => toast?.("Copy failed","error"));
}

function exportDataFile(data, columns, format, toast) {
  if (format === "csv") {
    const rows = [columns.join(","), ...data.map(r => columns.map(c => { const v = r[c]; return typeof v === "string" && v.includes(",") ? `"${v}"` : v; }).join(","))];
    downloadBlob(new Blob([rows.join("\n")],{type:"text/csv"}), "mag_quality.csv");
  } else if (format === "tsv") {
    const rows = [columns.join("\t"), ...data.map(r => columns.map(c => r[c]).join("\t"))];
    downloadBlob(new Blob([rows.join("\n")],{type:"text/tab-separated-values"}), "mag_quality.tsv");
  } else if (format === "json") {
    downloadBlob(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}), "mag_quality.json");
  }
  toast?.(`Downloaded ${format.toUpperCase()}`);
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CHART CARD WRAPPER
   ═══════════════════════════════════════════════════════════════════════════════ */
function ChartCard({ title, subtitle, children, chartId, toast, className="" }) {
  const ref = useRef(null);
  const [menu, setMenu] = useState(false);
  return (
    <div ref={ref} className={`bg-white rounded-xl shadow-sm border border-gray-100 relative group hover:shadow-md transition-shadow duration-200 ${className}`}
      onMouseLeave={() => setMenu(false)}>
      <div className="px-5 pt-5 pb-2 flex items-start justify-between">
        <div className="pr-6">
          <h3 className="text-[13px] font-bold text-gray-800 tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setMenu(!menu)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            title="Export chart">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          {menu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 min-w-[120px]" style={{animation:"fadeIn 0.15s ease"}}>
              <button onClick={() => {exportChartPNG(ref,`${chartId}.png`,toast);setMenu(false);}} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900">Export PNG</button>
              <button onClick={() => {exportChartSVG(ref,`${chartId}.svg`,toast);setMenu(false);}} className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900">Export SVG</button>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex-1 min-w-[120px]">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{color:color||"#1e293b"}}>{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl border border-gray-100 px-3 py-2 text-[11px] max-w-[220px]">
      {Object.entries(d).filter(([k]) => !["fill","fillColor","__idx"].includes(k)).map(([k,v]) => (
        <div key={k} className="flex justify-between gap-3">
          <span className="text-gray-400 truncate">{k}</span>
          <span className="font-mono font-semibold text-gray-700">{typeof v === "number" ? v.toFixed(2) : String(v)}</span>
        </div>
      ))}
    </div>
  );
}

function FilterPills({ label, items, selected, onChange, colorFn }) {
  const allOn = selected.length === items.length;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider w-14 shrink-0">{label}</span>
      <button onClick={() => onChange(allOn ? [] : [...items])}
        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all ${allOn ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
        ALL
      </button>
      {items.map(t => {
        const on = selected.includes(t);
        return (
          <button key={t} onClick={() => onChange(on ? selected.filter(x=>x!==t) : [...selected,t])}
            className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all"
            style={{ background: on ? (colorFn ? colorFn(t) : gc(t)) : "#f3f4f6", color: on ? "#fff" : "#9ca3af" }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}

function ColorLegend({ data, colorBy }) {
  const keys = [...new Set(data.map(r => r[colorBy]))].filter(Boolean).sort();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-3">
      {keys.map(v => (
        <div key={String(v)} className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <div className="w-2 h-2 rounded-full" style={{backgroundColor:gc(v)}} />{String(v)}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BOXPLOT
   ═══════════════════════════════════════════════════════════════════════════════ */
function BoxplotViz({ data, dataKey, groupKey="Sample_ID" }) {
  const groups = useMemo(() => {
    const g = {};
    data.forEach(r => { const k=r[groupKey]; if(!g[k])g[k]=[]; g[k].push(r[dataKey]); });
    return Object.entries(g).map(([name,vals]) => ({name,stats:boxStats(vals)}));
  },[data,dataKey,groupKey]);
  const maxVal = Math.max(...groups.map(g => g.stats?.max || 0));
  const sc = v => (v/maxVal)*100;
  return (
    <div className="space-y-2.5">
      {groups.map(({name,stats}) => {
        if(!stats) return null;
        return (
          <div key={name} className="flex items-center gap-3 group/bp">
            <div className="w-12 text-[10px] font-mono text-gray-500 text-right shrink-0 font-semibold">{name}</div>
            <div className="flex-1 relative h-7 bg-gray-50/80 rounded-sm" title={`Q1:${stats.q1.toFixed(1)} Med:${stats.median.toFixed(1)} Q3:${stats.q3.toFixed(1)} Mean:${stats.mean.toFixed(1)}`}>
              <div className="absolute top-1/2 h-px bg-gray-300" style={{left:`${sc(stats.lower)}%`,width:`${sc(stats.upper)-sc(stats.lower)}%`,transform:"translateY(-50%)"}}/>
              <div className="absolute top-0.5 bottom-0.5 rounded-sm bg-sky-100 border border-sky-400/70" style={{left:`${sc(stats.q1)}%`,width:`${Math.max(0.5,sc(stats.q3)-sc(stats.q1))}%`}}>
                <div className="absolute top-0 bottom-0 w-0.5 bg-sky-700" style={{left:`${((stats.median-stats.q1)/Math.max(0.01,stats.q3-stats.q1))*100}%`}}/>
              </div>
              <div className="absolute top-1.5 bottom-1.5 w-px bg-gray-300" style={{left:`${sc(stats.lower)}%`}}/>
              <div className="absolute top-1.5 bottom-1.5 w-px bg-gray-300" style={{left:`${sc(stats.upper)}%`}}/>
              {stats.outliers.map((o,i) => <div key={i} className="absolute top-1/2 w-1.5 h-1.5 rounded-full bg-red-400/80 -translate-y-1/2" style={{left:`${sc(o)}%`}}/>)}
            </div>
            <div className="w-16 text-[10px] text-gray-400 shrink-0 font-mono text-right">{stats.median.toFixed(0)}</div>
          </div>
        );
      })}
      <div className="flex justify-between text-[9px] text-gray-300 px-16">
        <span>0</span><span>{(maxVal/2).toFixed(0)}</span><span>{maxVal.toFixed(0)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TAXONOMY MATRIX
   ═══════════════════════════════════════════════════════════════════════════════ */
function TaxonomyMatrix({ data, toast }) {
  const { samples, matrix, flat } = useMemo(() => {
    const samples = [...new Set(data.map(r => r.Sample_ID))].sort();
    const taxa = [...new Set(data.map(r => r.Taxonomy_Level))].filter(Boolean).sort();
    const ps = new Set(data.map(r => `${r.Sample_ID}|${r.Taxonomy_Level}`));
    const matrix = taxa.map(t => ({taxon:t,...Object.fromEntries(samples.map(s => [s,ps.has(`${s}|${t}`)?1:0]))}));
    const flat = matrix.map(row => [row.taxon, ...samples.map(s => row[s])].join("\t"));
    return { samples, matrix, flat: ["Taxon\t"+samples.join("\t"), ...flat].join("\n") };
  },[data]);
  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={() => copyText(flat,toast)} className="text-[10px] text-gray-400 hover:text-sky-600 flex items-center gap-1 font-semibold transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy matrix
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="text-left p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-white z-10">Taxon</th>
            {samples.map(s => <th key={s} className="p-2 text-[10px] font-bold text-gray-500 text-center uppercase tracking-wider">{s}</th>)}
          </tr></thead>
          <tbody>{matrix.map(row => (
            <tr key={row.taxon} className="border-t border-gray-50 hover:bg-gray-50/50">
              <td className="p-2 font-mono text-xs text-gray-600 sticky left-0 bg-white z-10 font-medium">{row.taxon}</td>
              {samples.map(s => (
                <td key={s} className="p-1 text-center">
                  <div className={`mx-auto w-6 h-6 rounded-sm transition-colors ${row[s] ? "bg-sky-600 shadow-sm shadow-sky-200" : "bg-gray-100"} flex items-center justify-center`}>
                    {row[s] ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : null}
                  </div>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HEATMAP
   ═══════════════════════════════════════════════════════════════════════════════ */
function HeatmapPanel({ data, toast }) {
  const { samples, metrics, hd, zMin, zMax, raw } = useMemo(() => {
    const gr = _.groupBy(data, "Sample_ID");
    const samples = Object.keys(gr).sort();
    const metrics = ["Completeness","Contamination","Complete_SCO","CSS"];
    const raw = {}; samples.forEach(s => { raw[s]={}; metrics.forEach(m => raw[s][m]=_.mean(gr[s].map(r=>r[m]))); });
    const hd = {}; metrics.forEach(m => {
      const vals=samples.map(s=>raw[s][m]),mu=_.mean(vals),sd=Math.sqrt(_.mean(vals.map(v=>(v-mu)**2)))||1;
      samples.forEach(s => { if(!hd[s])hd[s]={}; hd[s][m]=(raw[s][m]-mu)/sd; });
    });
    let zMin=Infinity,zMax=-Infinity;
    samples.forEach(s => metrics.forEach(m => { zMin=Math.min(zMin,hd[s][m]); zMax=Math.max(zMax,hd[s][m]); }));
    return { samples, metrics, hd, zMin, zMax, raw };
  },[data]);
  const hc = z => { const t=(z-zMin)/(zMax-zMin||1); return t<0.5 ? `rgb(${Math.round(59+t*2*196)},${Math.round(130+t*2*125)},${Math.round(246-t*2*30)})` : `rgb(255,${Math.round(255-(t-0.5)*2*176)},${Math.round(216-(t-0.5)*2*148)})`; };
  const copyHeatmap = () => {
    const lines = ["Sample\t"+metrics.join("\t"), ...samples.map(s => s+"\t"+metrics.map(m=>raw[s][m].toFixed(2)).join("\t"))];
    copyText(lines.join("\n"), toast);
  };
  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={copyHeatmap} className="text-[10px] text-gray-400 hover:text-sky-600 flex items-center gap-1 font-semibold transition-colors">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy averages
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr><th className="p-2 text-[10px] text-gray-500 text-left uppercase tracking-wider font-bold">Sample</th>
            {metrics.map(m => <th key={m} className="p-2 text-[10px] text-gray-500 text-center uppercase tracking-wider font-bold">{m}</th>)}
          </tr></thead>
          <tbody>{samples.map(s => (
            <tr key={s}><td className="p-2 font-mono text-xs text-gray-600 font-semibold">{s}</td>
              {metrics.map(m => (
                <td key={m} className="p-1 text-center" title={`Raw avg: ${raw[s][m].toFixed(2)}`}>
                  <div className="rounded-sm px-2 py-2 text-[11px] font-mono font-bold transition-colors"
                    style={{backgroundColor:hc(hd[s][m]),color:Math.abs(hd[s][m])>0.8?"white":"#333"}}>
                    {hd[s][m].toFixed(2)}
                  </div>
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-4 text-[9px] text-gray-400 justify-center">
        <span>Below avg</span>
        <div className="w-28 h-2.5 rounded-full" style={{background:"linear-gradient(to right,#3b82f6,#fff,#ff4f44)"}}/>
        <span>Above avg</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DATA TABLE
   ═══════════════════════════════════════════════════════════════════════════════ */
function DataTable({ data, columns, toast }) {
  const [search,setSearch] = useState("");
  const [sortKey,setSortKey] = useState(null);
  const [sortDir,setSortDir] = useState("asc");
  const [page,setPage] = useState(0);
  const [hiddenCols,setHiddenCols] = useState(new Set());
  const [showColMenu,setShowColMenu] = useState(false);
  const perPage = 20;
  const visCols = columns.filter(c => !hiddenCols.has(c));

  const filtered = useMemo(() => {
    let d = [...data];
    if(search){ const s=search.toLowerCase(); d=d.filter(row => visCols.some(c => String(row[c]).toLowerCase().includes(s))); }
    if(sortKey){ d.sort((a,b) => { const av=a[sortKey],bv=b[sortKey]; const cmp=typeof av==="number"?av-bv:String(av).localeCompare(String(bv)); return sortDir==="asc"?cmp:-cmp; }); }
    return d;
  },[data,search,sortKey,sortDir,visCols]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice(page*perPage,(page+1)*perPage);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search all columns..." value={search}
            onChange={e => {setSearch(e.target.value);setPage(0);}}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400/40 bg-gray-50/50"/>
        </div>
        <div className="relative">
          <button onClick={() => setShowColMenu(!showColMenu)}
            className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors">
            Columns ({visCols.length}/{columns.length})
          </button>
          {showColMenu && (
            <div className="absolute right-0 top-10 bg-white rounded-lg shadow-xl border border-gray-100 py-2 px-1 z-50 min-w-[180px] max-h-60 overflow-y-auto" style={{animation:"fadeIn 0.15s ease"}}
              onMouseLeave={() => setShowColMenu(false)}>
              {columns.map(c => (
                <label key={c} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={!hiddenCols.has(c)}
                    onChange={() => setHiddenCols(prev => {const n=new Set(prev);n.has(c)?n.delete(c):n.add(c);return n;})}
                    className="rounded border-gray-300 text-sky-600 w-3.5 h-3.5"/>
                  <span className="text-xs text-gray-600">{c}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <span className="text-[10px] text-gray-400 font-mono">{filtered.length} rows</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-xs">
          <thead className="bg-gray-50/80"><tr>
            {visCols.map(c => (
              <th key={c} onClick={() => {setSortDir(sortKey===c&&sortDir==="asc"?"desc":"asc");setSortKey(c);}}
                className="px-3 py-2.5 text-[10px] font-bold text-gray-500 text-left cursor-pointer hover:text-gray-800 whitespace-nowrap select-none uppercase tracking-wider">
                {c} {sortKey===c ? (sortDir==="asc"?"↑":"↓") : ""}
              </th>
            ))}
          </tr></thead>
          <tbody>{pageData.map((row,i) => (
            <tr key={i} className="border-t border-gray-50 hover:bg-sky-50/30 transition-colors">
              {visCols.map(c => (
                <td key={c} className="px-3 py-2 text-xs font-mono text-gray-600 whitespace-nowrap">
                  {c==="Quality" ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{background:gc(row[c])+"22",color:gc(row[c])}}>{row[c]}</span>
                    : c==="GUNC_Pass" ? <span className={`text-[10px] font-bold ${row[c]?"text-emerald-600":"text-red-400"}`}>{row[c]?"PASS":"FAIL"}</span>
                    : typeof row[c]==="number" ? row[c].toFixed(2) : String(row[c])}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button onClick={() => setPage(Math.max(0,page-1))} disabled={page===0}
            className="px-3 py-1.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition-colors uppercase tracking-wider">Prev</button>
          <div className="flex gap-1">
            {Array.from({length:Math.min(7,totalPages)},(_,i) => {
              let p; if(totalPages<=7) p=i; else if(page<4) p=i; else if(page>=totalPages-4) p=totalPages-7+i; else p=page-3+i;
              return <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-[10px] font-bold transition-all ${page===p?"bg-sky-600 text-white shadow-sm":"bg-gray-50 text-gray-400 hover:bg-gray-100"}`}>{p+1}</button>;
            })}
          </div>
          <button onClick={() => setPage(Math.min(totalPages-1,page+1))} disabled={page>=totalPages-1}
            className="px-3 py-1.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-600 disabled:opacity-30 hover:bg-gray-200 transition-colors uppercase tracking-wider">Next</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════════════════ */
const TABS = [
  {id:"summary",label:"Summary"},
  {id:"scatter",label:"Scatterplots"},
  {id:"box",label:"Boxplots"},
  {id:"taxonomy",label:"Taxonomy"},
  {id:"heatmap",label:"Heatmap"},
  {id:"data",label:"Data"},
];

export default function MAGDashboard() {
  const [rawData, setRawData] = useState(null);
  const [tab, setTab] = useState("summary");
  const [compThreshold, setCompThreshold] = useState(50);
  const [colorBy, setColorBy] = useState("Taxonomy_Level");
  const [selectedSamples, setSelectedSamples] = useState([]);
  const [selectedTaxa, setSelectedTaxa] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [exportMenu, setExportMenu] = useState(false);
  const fileRef = useRef();
  const { show: toast, Toasts } = useToast();

  useEffect(() => {
    const handler = e => {
      if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT") return;
      const n = parseInt(e.key);
      if(n >= 1 && n <= 6) { e.preventDefault(); setTab(TABS[n-1].id); }
    };
    window.addEventListener("keydown",handler);
    return () => window.removeEventListener("keydown",handler);
  },[]);

  const parseData = useCallback((text, name) => {
    const sep = text.includes("\t") ? "\t" : ",";
    const result = Papa.parse(text.trim(), {header:true,delimiter:sep,dynamicTyping:true,skipEmptyLines:true});
    if(result.data?.length) {
      setRawData(result.data);
      setFileName(name||"data");
      setSelectedSamples([...new Set(result.data.map(r=>r.Sample_ID))].sort());
      setSelectedTaxa([...new Set(result.data.map(r=>r.Taxonomy_Level))].filter(Boolean).sort());
    }
  },[]);

  const loadDemo = useCallback(() => parseData(SAMPLE_TSV,"sample_MAG_data.tsv"),[parseData]);
  const handleFile = useCallback(e => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => parseData(reader.result, file.name);
    reader.readAsText(file);
  },[parseData]);

  const allSamples = useMemo(() => rawData ? [...new Set(rawData.map(r=>r.Sample_ID))].sort() : [], [rawData]);
  const allTaxa = useMemo(() => rawData ? [...new Set(rawData.map(r=>r.Taxonomy_Level))].filter(Boolean).sort() : [], [rawData]);

  const processed = useMemo(() => {
    if(!rawData) return null;
    const df = rawData
      .filter(r => r.Completeness >= compThreshold && selectedSamples.includes(r.Sample_ID) && selectedTaxa.includes(r.Taxonomy_Level))
      .map(r => ({...r,Quality:classifyQuality(r.Completeness,r.Contamination),GUNC_Pass:r.CSS<0.45}));
    if(!df.length) return null;
    const samples=[...new Set(df.map(r=>r.Sample_ID))].sort();
    const allCols=["Sample_ID","Completeness","Contamination","Complete_SCO","CSS","N50","Taxonomy_Level","Quality","GUNC_Pass"];
    const cg=samples.map(s=>df.filter(r=>r.Sample_ID===s).map(r=>r.Completeness));
    const ng=samples.map(s=>df.filter(r=>r.Sample_ID===s).map(r=>r.N50));
    const kw=kruskalWallis(cg), wa=welchANOVA(ng);
    const qc={High:0,Medium:0,Low:0}; df.forEach(r=>qc[r.Quality]++);
    const gpr=df.filter(r=>r.GUNC_Pass).length/df.length*100;
    const ss=samples.map(s=>{const rows=df.filter(r=>r.Sample_ID===s);return{Sample_ID:s,High:rows.filter(r=>r.Quality==="High").length,Medium:rows.filter(r=>r.Quality==="Medium").length,Low:rows.filter(r=>r.Quality==="Low").length};});
    return{df,samples,columns:allCols,qualityCounts:qc,guncPassRate:gpr,sampleSummary:ss,kw,welch:wa};
  },[rawData,compThreshold,selectedSamples,selectedTaxa]);

  /* ── LANDING ── */
  if(!rawData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{background:"linear-gradient(135deg,#f8fafc 0%,#ecfeff 50%,#f0fdf4 100%)",fontFamily:"'Instrument Sans','Segoe UI',system-ui,sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}`}</style>
        <Toasts/>
        <div className="max-w-md w-full text-center" style={{animation:"fadeIn 0.5s ease"}}>
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shadow-lg shadow-sky-500/20" style={{animation:"float 3s ease-in-out infinite"}}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1.5 tracking-tight">MAGShiny</h1>
          <p className="text-gray-400 mb-8 text-sm">Metagenomic assembled genome quality dashboard</p>
          <div className="space-y-3">
            <button onClick={() => fileRef.current?.click()}
              className="w-full py-4 px-6 bg-white border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-sky-400 hover:bg-sky-50/30 hover:text-sky-700 transition-all duration-300 cursor-pointer">
              Upload TSV / CSV
            </button>
            <input ref={fileRef} type="file" accept=".tsv,.csv,.txt" onChange={handleFile} className="hidden"/>
            <div className="text-[10px] text-gray-300 py-0.5">or</div>
            <button onClick={loadDemo}
              className="w-full py-4 px-6 bg-gradient-to-r from-sky-600 to-teal-500 rounded-xl text-sm font-semibold text-white hover:shadow-lg hover:shadow-sky-500/25 hover:-translate-y-0.5 transition-all duration-300">
              Load Sample Data
            </button>
          </div>
          <div className="mt-8 text-[10px] text-gray-300 leading-relaxed font-mono">
            Columns: Sample_ID · Completeness · Contamination · Complete_SCO · CSS · N50 · Taxonomy_Level
          </div>
        </div>
      </div>
    );
  }

  /* ── EMPTY ── */
  if(!processed) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{fontFamily:"'Instrument Sans',system-ui,sans-serif"}}>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
        <Toasts/>
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4 opacity-20">∅</div>
          <p className="text-gray-500 mb-2 text-sm">No MAGs pass current filters.</p>
          <p className="text-gray-400 text-xs mb-4">Comp ≥ {compThreshold}% · {selectedSamples.length} samples · {selectedTaxa.length} taxa</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setCompThreshold(0)} className="text-sky-600 text-xs font-semibold hover:underline">Reset threshold</button>
            <button onClick={() => {setSelectedSamples(allSamples);setSelectedTaxa(allTaxa);}} className="text-sky-600 text-xs font-semibold hover:underline">Reset filters</button>
          </div>
        </div>
      </div>
    );
  }

  const { df, samples, qualityCounts:qc, guncPassRate, sampleSummary, kw, welch } = processed;

  const summaryText = `MAGShiny Report\n${"=".repeat(40)}\nFile: ${fileName}\nMAGs: ${df.length} | Samples: ${samples.join(", ")}\nComp threshold: ≥${compThreshold}%\n\nQuality: High=${qc.High} (${(qc.High/df.length*100).toFixed(1)}%) Medium=${qc.Medium} (${(qc.Medium/df.length*100).toFixed(1)}%) Low=${qc.Low} (${(qc.Low/df.length*100).toFixed(1)}%)\nGUNC Pass: ${guncPassRate.toFixed(1)}%\n\nKruskal-Wallis (Comp~Sample): H=${kw.H.toFixed(3)}, p=${kw.p<0.001?"<0.001":kw.p.toFixed(4)}\nWelch ANOVA (N50~Sample): F=${welch.F.toFixed(3)}, p=${welch.p<0.001?"<0.001":welch.p.toFixed(4)}`;

  /* ── DASHBOARD ── */
  return (
    <div className="min-h-screen bg-[#f7f8fa]" style={{fontFamily:"'Instrument Sans','Segoe UI',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
      <Toasts/>

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-5 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-teal-400 flex items-center justify-center shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <div className="leading-none">
            <h1 className="text-sm font-bold text-gray-900 tracking-tight">MAGShiny</h1>
            <span className="text-[9px] text-gray-400 font-mono">{fileName}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Comp≥</span>
            <input type="range" min={0} max={100} step={5} value={compThreshold} onChange={e=>setCompThreshold(Number(e.target.value))} className="w-16 accent-sky-500 h-1"/>
            <span className="text-[10px] font-mono font-bold text-gray-700 w-7 text-right">{compThreshold}%</span>
          </div>
          <select value={colorBy} onChange={e=>setColorBy(e.target.value)}
            className="text-[10px] font-semibold border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none cursor-pointer">
            <option value="Taxonomy_Level">Color: Taxonomy</option>
            <option value="Sample_ID">Color: Sample</option>
            <option value="Quality">Color: Quality</option>
          </select>
          {/* Export menu */}
          <div className="relative">
            <button onClick={() => setExportMenu(!exportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
            {exportMenu && (
              <div className="absolute right-0 top-9 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 min-w-[200px]" style={{animation:"fadeIn 0.15s ease"}} onMouseLeave={() => setExportMenu(false)}>
                <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Data</div>
                <button onClick={() => {exportDataFile(df,processed.columns,"tsv",toast);setExportMenu(false);}} className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"><span className="text-[9px] font-mono bg-emerald-100 text-emerald-700 rounded px-1">TSV</span>Tab-separated</button>
                <button onClick={() => {exportDataFile(df,processed.columns,"csv",toast);setExportMenu(false);}} className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"><span className="text-[9px] font-mono bg-blue-100 text-blue-700 rounded px-1">CSV</span>Comma-separated</button>
                <button onClick={() => {exportDataFile(df,processed.columns,"json",toast);setExportMenu(false);}} className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 flex items-center gap-2"><span className="text-[9px] font-mono bg-amber-100 text-amber-700 rounded px-1">JSON</span>Structured data</button>
                <div className="border-t border-gray-50 my-1"/>
                <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Report</div>
                <button onClick={() => {copyText(summaryText,toast);setExportMenu(false);}} className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">Copy summary to clipboard</button>
                <div className="border-t border-gray-50 my-1"/>
                <div className="px-3 py-1 text-[9px] text-gray-400 italic">Hover charts → ↓ button for PNG/SVG</div>
              </div>
            )}
          </div>
          <button onClick={() => {setRawData(null);setFileName(null);}} className="text-gray-400 hover:text-red-500 transition-colors" title="Load new data">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <div className="px-5 py-2.5 flex flex-col gap-1.5 bg-white/50 border-b border-gray-100">
        <FilterPills label="Samples" items={allSamples} selected={selectedSamples} onChange={setSelectedSamples}/>
        <FilterPills label="Taxa" items={allTaxa} selected={selectedTaxa} onChange={setSelectedTaxa}/>
      </div>

      {/* STAT CARDS */}
      <div className="px-5 py-3 flex gap-2.5 flex-wrap">
        <StatCard label="Total MAGs" value={df.length} sub={`${samples.length} samples`}/>
        <StatCard label="High" value={qc.High} color="#10b981" sub={`${(qc.High/df.length*100).toFixed(1)}%`}/>
        <StatCard label="Medium" value={qc.Medium} color="#f59e0b" sub={`${(qc.Medium/df.length*100).toFixed(1)}%`}/>
        <StatCard label="Low" value={qc.Low} color="#ef4444" sub={`${(qc.Low/df.length*100).toFixed(1)}%`}/>
        <StatCard label="GUNC Pass" value={`${guncPassRate.toFixed(0)}%`} color="#0ea5e9" sub="CSS < 0.45"/>
        <StatCard label="KW p-val" value={kw.p<0.001?"<.001":kw.p.toFixed(3)} color={kw.p<0.05?"#059669":"#9ca3af"} sub="Comp ~ Sample"/>
      </div>

      {/* TABS */}
      <div className="px-5 border-b border-gray-200 bg-white/40">
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map((t,i) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold transition-all border-b-2 -mb-px whitespace-nowrap ${
                tab===t.id ? "border-sky-500 text-sky-700 bg-sky-50/30" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {t.label}
              <kbd className="text-[8px] text-gray-300 bg-gray-100 rounded px-1 py-0.5 font-mono ml-0.5">{i+1}</kbd>
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-5 py-5" key={tab} style={{animation:"fadeIn 0.2s ease"}}>

        {tab==="summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Quality Distribution" subtitle="MIMAG quality tier per sample" chartId="quality_dist" toast={toast}>
              <ResponsiveContainer width="100%" height={Math.max(180,sampleSummary.length*55)}>
                <BarChart data={sampleSummary} layout="vertical" margin={{left:5,right:15}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" tick={{fontSize:10}} tickLine={false}/>
                  <YAxis type="category" dataKey="Sample_ID" tick={{fontSize:10,fontFamily:"JetBrains Mono"}} width={40} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                  <Bar dataKey="High" stackId="q" fill="#10b981"/>
                  <Bar dataKey="Medium" stackId="q" fill="#f59e0b"/>
                  <Bar dataKey="Low" stackId="q" fill="#ef4444" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="GUNC Pass / Fail" subtitle="CSS < 0.45 threshold" chartId="gunc_dist" toast={toast}>
              <ResponsiveContainer width="100%" height={Math.max(180,samples.length*55)}>
                <BarChart data={samples.map(s => {const rows=df.filter(r=>r.Sample_ID===s);return{Sample_ID:s,Pass:rows.filter(r=>r.GUNC_Pass).length,Fail:rows.filter(r=>!r.GUNC_Pass).length};})} layout="vertical" margin={{left:5,right:15}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" tick={{fontSize:10}} tickLine={false}/>
                  <YAxis type="category" dataKey="Sample_ID" tick={{fontSize:10,fontFamily:"JetBrains Mono"}} width={40} tickLine={false}/>
                  <Tooltip content={<ChartTooltip/>}/><Legend wrapperStyle={{fontSize:10}}/>
                  <Bar dataKey="Pass" stackId="g" fill="#0ea5e9"/>
                  <Bar dataKey="Fail" stackId="g" fill="#fca5a5" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-bold text-gray-800">Statistical Tests</h3>
                <button onClick={() => copyText(summaryText,toast)} className="text-[10px] text-gray-400 hover:text-sky-600 flex items-center gap-1 font-semibold transition-colors">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy report
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[{name:"Kruskal-Wallis",desc:"Completeness ~ Sample (non-parametric)",stat:`H = ${kw.H.toFixed(3)}`,p:kw.p},{name:"Welch ANOVA",desc:"N50 ~ Sample (unequal variance)",stat:`F = ${welch.F.toFixed(3)}`,p:welch.p}].map(t => (
                  <div key={t.name} className="bg-gray-50/80 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-700 text-sm">{t.name}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${t.p<0.05?"bg-emerald-100 text-emerald-700":"bg-gray-200 text-gray-500"}`}>{t.p<0.05?"SIG":"NS"}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mb-2">{t.desc}</div>
                    <div className="font-mono text-sm text-gray-800">{t.stat}, p = {t.p<0.001?"<0.001":t.p.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="scatter" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Completeness vs Contamination" subtitle="Dashed: MIMAG high-quality (90% comp, 5% cont)" chartId="comp_cont" toast={toast}>
              <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{left:-5,right:10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" dataKey="Completeness" unit="%" tick={{fontSize:10}} domain={[0,100]} tickLine={false}/>
                  <YAxis type="number" dataKey="Contamination" unit="%" tick={{fontSize:10}} tickLine={false}/>
                  <ZAxis range={[35,35]}/><Tooltip content={<ChartTooltip/>}/>
                  <ReferenceLine x={90} stroke="#10b981" strokeDasharray="6 4" strokeOpacity={0.4}/>
                  <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="6 4" strokeOpacity={0.4}/>
                  <Scatter data={df}>{df.map((r,i)=><Cell key={i} fill={gc(r[colorBy])} fillOpacity={0.75}/>)}</Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <ColorLegend data={df} colorBy={colorBy}/>
            </ChartCard>
            <ChartCard title="BUSCO SCO vs Contamination" subtitle="Single-copy orthologs vs contamination" chartId="busco_scatter" toast={toast}>
              <ResponsiveContainer width="100%" height={340}>
                <ScatterChart margin={{left:-5,right:10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" dataKey="Complete_SCO" unit="%" tick={{fontSize:10}} tickLine={false}/>
                  <YAxis type="number" dataKey="Contamination" unit="%" tick={{fontSize:10}} tickLine={false}/>
                  <ZAxis range={[35,35]}/><Tooltip content={<ChartTooltip/>}/>
                  <Scatter data={df}>{df.map((r,i)=><Cell key={i} fill={gc(r[colorBy])} fillOpacity={0.75}/>)}</Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <ColorLegend data={df} colorBy={colorBy}/>
            </ChartCard>
            <ChartCard title="N50 vs Completeness" subtitle="Assembly contiguity vs genome completeness" chartId="n50_scatter" toast={toast} className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{left:-5,right:10,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis type="number" dataKey="Completeness" unit="%" tick={{fontSize:10}} tickLine={false}/>
                  <YAxis type="number" dataKey="N50" tick={{fontSize:10}} tickLine={false}/>
                  <ZAxis range={[35,35]}/><Tooltip content={<ChartTooltip/>}/>
                  <Scatter data={df}>{df.map((r,i)=><Cell key={i} fill={gc(r[colorBy])} fillOpacity={0.75}/>)}</Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              <ColorLegend data={df} colorBy={colorBy}/>
            </ChartCard>
          </div>
        )}

        {tab==="box" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[{key:"N50",title:"N50 by Sample",sub:"QUAST contiguity",extra:<div className="mt-3 text-[10px] text-gray-400 bg-gray-50 rounded-md p-2 font-mono">Welch ANOVA: F={welch.F.toFixed(3)}, p={welch.p<0.001?"<0.001":welch.p.toFixed(4)}</div>},
              {key:"CSS",title:"CSS by Sample",sub:"GUNC chimerism (< 0.45 = pass)"},
              {key:"Completeness",title:"Completeness by Sample",sub:"CheckM2 genome completeness"},
              {key:"Contamination",title:"Contamination by Sample",sub:"CheckM2 contamination"}
            ].map(b => (
              <ChartCard key={b.key} title={b.title} subtitle={b.sub} chartId={`${b.key.toLowerCase()}_box`} toast={toast}>
                <BoxplotViz data={df} dataKey={b.key}/>
                {b.extra}
              </ChartCard>
            ))}
          </div>
        )}

        {tab==="taxonomy" && (
          <ChartCard title="Taxonomy Presence / Absence" subtitle="Taxonomic groups detected per sample" chartId="tax_matrix" toast={toast}>
            <TaxonomyMatrix data={df} toast={toast}/>
          </ChartCard>
        )}

        {tab==="heatmap" && (
          <ChartCard title="Sample Quality Heatmap" subtitle="Z-score normalized average metrics per sample" chartId="heatmap" toast={toast}>
            <HeatmapPanel data={df} toast={toast}/>
          </ChartCard>
        )}

        {tab==="data" && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-[13px] font-bold text-gray-800">Processed Data</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Comp ≥ {compThreshold}% · {samples.length} samples · Quality & GUNC columns added</p>
              </div>
              <div className="flex gap-1.5">
                {[["TSV","tsv","emerald"],["CSV","csv","sky"],["JSON","json","amber"]].map(([label,fmt,clr]) => (
                  <button key={fmt} onClick={() => exportDataFile(df,processed.columns,fmt,toast)}
                    className={`px-3 py-1.5 bg-${clr}-600 text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-opacity uppercase tracking-wider`}
                    style={{background:clr==="emerald"?"#059669":clr==="sky"?"#0284c7":"#d97706"}}>{label}</button>
                ))}
              </div>
            </div>
            <DataTable data={df} columns={processed.columns} toast={toast}/>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-[9px] text-gray-300">
        <span>MAGShiny v2 · Next.js + React + Recharts + Tailwind</span>
        <span>Keys 1–6 switch tabs · Hover charts for PNG/SVG export</span>
      </div>
    </div>
  );
}
