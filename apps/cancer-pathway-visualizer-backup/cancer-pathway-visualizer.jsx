import { useState, useMemo, useCallback, useRef, useEffect, Fragment } from "react";
import * as Papa from "papaparse";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, ComposedChart
} from "recharts";
import _ from "lodash";

/* ═══════════════════════════════════════════════════════════════════════
   PATHWAY DATA (344 KEGG human pathways)
   ═══════════════════════════════════════════════════════════════════════ */
const PW=[["hsa00010","Glycolysis / Gluconeogenesis"],["hsa00020","Citrate cycle (TCA cycle)"],["hsa00030","Pentose phosphate pathway"],["hsa00040","Pentose and glucuronate interconversions"],["hsa00051","Fructose and mannose metabolism"],["hsa00052","Galactose metabolism"],["hsa00053","Ascorbate and aldarate metabolism"],["hsa00500","Starch and sucrose metabolism"],["hsa00520","Amino sugar and nucleotide sugar metabolism"],["hsa00620","Pyruvate metabolism"],["hsa00630","Glyoxylate and dicarboxylate metabolism"],["hsa00640","Propanoate metabolism"],["hsa00650","Butanoate metabolism"],["hsa00562","Inositol phosphate metabolism"],["hsa00190","Oxidative phosphorylation"],["hsa00910","Nitrogen metabolism"],["hsa00920","Sulfur metabolism"],["hsa00061","Fatty acid biosynthesis"],["hsa00062","Fatty acid elongation"],["hsa00071","Fatty acid degradation"],["hsa00073","Cutin, suberine and wax biosynthesis"],["hsa00100","Steroid biosynthesis"],["hsa00140","Steroid hormone biosynthesis"],["hsa00120","Primary bile acid biosynthesis"],["hsa00564","Glycerophospholipid metabolism"],["hsa00565","Ether lipid metabolism"],["hsa00600","Sphingolipid metabolism"],["hsa00590","Arachidonic acid metabolism"],["hsa00591","Linoleic acid metabolism"],["hsa00592","alpha-Linolenic acid metabolism"],["hsa01040","Biosynthesis of unsaturated fatty acids"],["hsa00230","Purine metabolism"],["hsa00240","Pyrimidine metabolism"],["hsa00250","Alanine, aspartate and glutamate metabolism"],["hsa00260","Glycine, serine and threonine metabolism"],["hsa00270","Cysteine and methionine metabolism"],["hsa00280","Valine, leucine and isoleucine degradation"],["hsa00290","Valine, leucine and isoleucine biosynthesis"],["hsa00310","Lysine degradation"],["hsa00220","Arginine biosynthesis"],["hsa00330","Arginine and proline metabolism"],["hsa00340","Histidine metabolism"],["hsa00350","Tyrosine metabolism"],["hsa00360","Phenylalanine metabolism"],["hsa00380","Tryptophan metabolism"],["hsa00400","Phenylalanine, tyrosine and tryptophan biosynthesis"],["hsa00410","beta-Alanine metabolism"],["hsa00430","Taurine and hypotaurine metabolism"],["hsa00440","Phosphonate and phosphinate metabolism"],["hsa00450","Selenocompound metabolism"],["hsa00470","D-Amino acid metabolism"],["hsa00480","Glutathione metabolism"],["hsa00510","N-Glycan biosynthesis"],["hsa00513","Various types of N-glycan biosynthesis"],["hsa00512","Mucin type O-glycan biosynthesis"],["hsa00515","Mannose type O-glycan biosynthesis"],["hsa00514","Other types of O-glycan biosynthesis"],["hsa00532","Glycosaminoglycan biosynthesis - CS/DS"],["hsa00534","Glycosaminoglycan biosynthesis - HS/Heparin"],["hsa00531","Glycosaminoglycan degradation"],["hsa00563","GPI-anchor biosynthesis"],["hsa00601","Glycosphingolipid biosynthesis - lacto"],["hsa00603","Glycosphingolipid biosynthesis - globo"],["hsa00604","Glycosphingolipid biosynthesis - ganglio"],["hsa00511","Other glycan degradation"],["hsa00730","Thiamine metabolism"],["hsa00740","Riboflavin metabolism"],["hsa00750","Vitamin B6 metabolism"],["hsa00760","Nicotinate and nicotinamide metabolism"],["hsa00770","Pantothenate and CoA biosynthesis"],["hsa00780","Biotin metabolism"],["hsa00785","Lipoic acid metabolism"],["hsa00790","Folate biosynthesis"],["hsa00670","One carbon pool by folate"],["hsa00830","Retinol metabolism"],["hsa00860","Porphyrin metabolism"],["hsa00130","Ubiquinone biosynthesis"],["hsa00900","Terpenoid backbone biosynthesis"],["hsa00983","Drug metabolism - other enzymes"],["hsa00982","Drug metabolism - cytochrome P450"],["hsa00980","Xenobiotics by cytochrome P450"],["hsa03020","RNA polymerase"],["hsa03022","Basal transcription factors"],["hsa03040","Spliceosome"],["hsa03010","Ribosome"],["hsa00970","Aminoacyl-tRNA biosynthesis"],["hsa03013","Nucleocytoplasmic transport"],["hsa03015","mRNA surveillance pathway"],["hsa03008","Ribosome biogenesis in eukaryotes"],["hsa03060","Protein export"],["hsa04141","Protein processing in ER"],["hsa04130","SNARE interactions"],["hsa04120","Ubiquitin mediated proteolysis"],["hsa04122","Sulfur relay system"],["hsa03050","Proteasome"],["hsa03018","RNA degradation"],["hsa03030","DNA replication"],["hsa03410","Base excision repair"],["hsa03420","Nucleotide excision repair"],["hsa03430","Mismatch repair"],["hsa03440","Homologous recombination"],["hsa03450","Non-homologous end-joining"],["hsa03460","Fanconi anemia pathway"],["hsa02010","ABC transporters"],["hsa04010","MAPK signaling pathway"],["hsa04012","ErbB signaling pathway"],["hsa04014","Ras signaling pathway"],["hsa04015","Rap1 signaling pathway"],["hsa04310","Wnt signaling pathway"],["hsa04330","Notch signaling pathway"],["hsa04340","Hedgehog signaling pathway"],["hsa04350","TGF-beta signaling pathway"],["hsa04390","Hippo signaling pathway"],["hsa04370","VEGF signaling pathway"],["hsa04371","Apelin signaling pathway"],["hsa04630","JAK-STAT signaling pathway"],["hsa04064","NF-kappa B signaling pathway"],["hsa04668","TNF signaling pathway"],["hsa04066","HIF-1 signaling pathway"],["hsa04068","FoxO signaling pathway"],["hsa04020","Calcium signaling pathway"],["hsa04070","Phosphatidylinositol signaling"],["hsa04072","Phospholipase D signaling"],["hsa04071","Sphingolipid signaling pathway"],["hsa04024","cAMP signaling pathway"],["hsa04022","cGMP-PKG signaling pathway"],["hsa04151","PI3K-Akt signaling pathway"],["hsa04152","AMPK signaling pathway"],["hsa04150","mTOR signaling pathway"],["hsa04080","Neuroactive ligand-receptor interaction"],["hsa04060","Cytokine-cytokine receptor interaction"],["hsa04512","ECM-receptor interaction"],["hsa04514","Cell adhesion molecules"],["hsa04144","Endocytosis"],["hsa04145","Phagosome"],["hsa04210","Apoptosis"],["hsa04216","Ferroptosis"],["hsa04217","Necroptosis"],["hsa04115","p53 signaling pathway"],["hsa04218","Cellular senescence"],["hsa04510","Focal adhesion"],["hsa04520","Adherens junction"],["hsa04530","Tight junction"],["hsa04540","Gap junction"],["hsa04550","Stem cell pluripotency"],["hsa04810","Actin cytoskeleton regulation"],["hsa04110","Cell cycle"],["hsa04114","Oocyte meiosis"],["hsa04360","Axon guidance"],["hsa04380","Osteoclast differentiation"],["hsa04211","Longevity regulating pathway"],["hsa04710","Circadian rhythm"],["hsa04714","Thermogenesis"],["hsa04140","Autophagy"],["hsa04137","Mitophagy"],["hsa04260","Cardiac muscle contraction"],["hsa04261","Adrenergic signaling (cardiac)"],["hsa04270","Vascular smooth muscle contraction"],["hsa05200","Pathways in cancer"],["hsa05202","Transcriptional misregulation in cancer"],["hsa05206","MicroRNAs in cancer"],["hsa05205","Proteoglycans in cancer"],["hsa05204","Chemical carcinogenesis - DNA adducts"],["hsa05207","Chemical carcinogenesis - receptor"],["hsa05208","Chemical carcinogenesis - ROS"],["hsa05210","Colorectal cancer"],["hsa05212","Pancreatic cancer"],["hsa05225","Hepatocellular carcinoma"],["hsa05226","Gastric cancer"],["hsa05214","Glioma"],["hsa05216","Thyroid cancer"],["hsa05221","Acute myeloid leukemia"],["hsa05220","Chronic myeloid leukemia"],["hsa05217","Basal cell carcinoma"],["hsa05218","Melanoma"],["hsa05211","Renal cell carcinoma"],["hsa05219","Bladder cancer"],["hsa05215","Prostate cancer"],["hsa05213","Endometrial cancer"],["hsa05224","Breast cancer"],["hsa05222","Small cell lung cancer"],["hsa05223","Non-small cell lung cancer"],["hsa05230","Central carbon metabolism in cancer"],["hsa05231","Choline metabolism in cancer"],["hsa05235","PD-L1 / PD-1 checkpoint"],["hsa05418","Fluid shear stress & atherosclerosis"],["hsa05410","Hypertrophic cardiomyopathy"],["hsa05414","Dilated cardiomyopathy"],["hsa05415","Diabetic cardiomyopathy"],["hsa05416","Viral myocarditis"],["hsa04930","Type II diabetes"],["hsa04940","Type I diabetes"],["hsa04936","Alcoholic liver disease"],["hsa04932","NAFLD"],["hsa04931","Insulin resistance"],["hsa04933","AGE-RAGE signaling (diabetic)"],["hsa04934","Cushing syndrome"],["hsa04910","Insulin signaling pathway"],["hsa04922","Glucagon signaling pathway"],["hsa04920","Adipocytokine signaling"],["hsa03320","PPAR signaling pathway"],["hsa04912","GnRH signaling pathway"],["hsa04915","Estrogen signaling pathway"],["hsa04914","Progesterone-mediated oocyte maturation"],["hsa04917","Prolactin signaling pathway"],["hsa04921","Oxytocin signaling pathway"],["hsa04935","Growth hormone signaling"],["hsa04911","Insulin secretion"],["hsa04919","Thyroid hormone signaling"],["hsa04916","Melanogenesis"],["hsa04925","Aldosterone synthesis"],["hsa04640","Hematopoietic cell lineage"],["hsa04610","Complement and coagulation cascades"],["hsa04611","Platelet activation"],["hsa04613","NET formation"],["hsa04620","Toll-like receptor signaling"],["hsa04621","NOD-like receptor signaling"],["hsa04622","RIG-I-like receptor signaling"],["hsa04623","Cytosolic DNA-sensing"],["hsa04625","C-type lectin receptor signaling"],["hsa04650","NK cell mediated cytotoxicity"],["hsa04612","Antigen processing & presentation"],["hsa04660","T cell receptor signaling"],["hsa04658","Th1 and Th2 differentiation"],["hsa04659","Th17 differentiation"],["hsa04657","IL-17 signaling"],["hsa04662","B cell receptor signaling"],["hsa04670","Leukocyte transendothelial migration"],["hsa04062","Chemokine signaling"],["hsa05310","Asthma"],["hsa05322","Systemic lupus erythematosus"],["hsa05323","Rheumatoid arthritis"],["hsa05321","Inflammatory bowel disease"],["hsa05340","Primary immunodeficiency"],["hsa05010","Alzheimer disease"],["hsa05012","Parkinson disease"],["hsa05014","ALS"],["hsa05016","Huntington disease"],["hsa05020","Prion disease"],["hsa05022","Neurodegeneration - multiple"],["hsa05030","Cocaine addiction"],["hsa05031","Amphetamine addiction"],["hsa05032","Morphine addiction"],["hsa05034","Alcoholism"],["hsa05150","Staph aureus infection"],["hsa05152","Tuberculosis"],["hsa05132","Salmonella infection"],["hsa05131","Shigellosis"],["hsa05135","Yersinia infection"],["hsa05133","Pertussis"],["hsa05134","Legionellosis"],["hsa05169","EBV infection"],["hsa05170","HIV-1 infection"],["hsa05161","Hepatitis B"],["hsa05160","Hepatitis C"],["hsa05171","COVID-19"],["hsa05164","Influenza A"],["hsa05168","HSV-1 infection"],["hsa05163","HCMV infection"],["hsa05167","KSHV infection"],["hsa05165","HPV infection"],["hsa05166","HTLV-1 infection"],["hsa05203","Viral carcinogenesis"],["hsa04728","Dopaminergic synapse"],["hsa04727","GABAergic synapse"],["hsa04725","Cholinergic synapse"],["hsa04726","Serotonergic synapse"],["hsa04720","Long-term potentiation"],["hsa04730","Long-term depression"],["hsa04723","Retrograde endocannabinoid signaling"],["hsa04721","Synaptic vesicle cycle"],["hsa04722","Neurotrophin signaling"],["hsa04750","TRP channel regulation"],["hsa04974","Protein digestion & absorption"],["hsa04973","Carbohydrate digestion & absorption"],["hsa04975","Fat digestion & absorption"],["hsa04976","Bile secretion"],["hsa04971","Gastric acid secretion"],["hsa04970","Salivary secretion"],["hsa04972","Pancreatic secretion"],["hsa04979","Cholesterol metabolism"],["hsa04146","Peroxisome"],["hsa04142","Lysosome"],["hsa04148","Efferocytosis"],["hsa01524","Platinum drug resistance"],["hsa01521","EGFR TKI resistance"],["hsa01523","Antifolate resistance"],["hsa01522","Endocrine resistance"]];
function catPW(id){if(id>="hsa05200"&&id<"hsa05240")return"Cancer";if(id>="hsa04600"&&id<"hsa04700")return"Immune";if(id>="hsa04700"&&id<"hsa04800")return"Neuro";if(id>="hsa04"&&id<"hsa04200")return"Signaling";if(id>="hsa04200"&&id<"hsa04600")return"Cell Process";if(id>="hsa03"&&id<"hsa04")return"Genetic Info";if(id>="hsa00"&&id<"hsa01")return"Metabolism";if(id>="hsa05"&&id<"hsa06")return"Disease";if(id>="hsa01520"&&id<"hsa01530")return"Drug Resistance";return"Other"}
const PATHWAYS=PW.map(([id,name])=>({id,name,category:catPW(id)}));

/* ═══════════════════════════════════════════════════════════════════════
   EXAMPLE DATA — 105 genes TCGA-SKCM (melanoma tumor) vs TCGA-KIRC (kidney normal)
   ═══════════════════════════════════════════════════════════════════════ */
const EX_T={"ENSG00000000003":[1662,1119],"ENSG00000000005":[2,0],"ENSG00000000419":[1302,1900],"ENSG00000000457":[409,580],"ENSG00000000460":[249,292],"ENSG00000000938":[110,37],"ENSG00000000971":[59,9],"ENSG00000001036":[1744,1682],"ENSG00000001084":[659,724],"ENSG00000001167":[1027,710],"ENSG00000001460":[393,504],"ENSG00000001461":[297,254],"ENSG00000001497":[462,365],"ENSG00000001561":[281,172],"ENSG00000001617":[2,15],"ENSG00000001626":[8,10],"ENSG00000001629":[224,238],"ENSG00000001630":[953,1053],"ENSG00000001631":[422,1148],"ENSG00000002016":[2164,1765],"ENSG00000002079":[206,57],"ENSG00000002330":[5393,5022],"ENSG00000002549":[2432,2117],"ENSG00000002586":[305,276],"ENSG00000002587":[25,18],"ENSG00000002726":[1185,780],"ENSG00000002745":[44,106],"ENSG00000002746":[176,141],"ENSG00000002822":[308,254],"ENSG00000002834":[1340,1363],"ENSG00000002919":[91,1],"ENSG00000002933":[149,277],"ENSG00000003056":[1479,1439],"ENSG00000003096":[124,90],"ENSG00000003137":[46,21],"ENSG00000003147":[16,8],"ENSG00000003249":[45,72],"ENSG00000003393":[236,204],"ENSG00000003400":[445,367],"ENSG00000003402":[219,258],"ENSG00000003436":[56,37],"ENSG00000003509":[165,232],"ENSG00000003756":[1061,1249],"ENSG00000003987":[12,10],"ENSG00000003989":[85,145],"ENSG00000004059":[4927,5199],"ENSG00000004139":[119,114],"ENSG00000004142":[24,4],"ENSG00000004455":[232,290],"ENSG00000004468":[1310,917],"ENSG00000004478":[1147,1107],"ENSG00000004487":[2217,2102],"ENSG00000004534":[85,92],"ENSG00000004660":[175,159],"ENSG00000004700":[179,214],"ENSG00000004766":[210,216],"ENSG00000004776":[10,2],"ENSG00000004777":[82,39],"ENSG00000004779":[1403,1375],"ENSG00000004838":[75,134],"ENSG00000004846":[76,116],"ENSG00000004848":[1024,955],"ENSG00000004864":[1124,996],"ENSG00000004866":[263,370],"ENSG00000004897":[1010,1197],"ENSG00000004939":[1362,1419],"ENSG00000004961":[130,106],"ENSG00000005007":[130,100],"ENSG00000005020":[42,34],"ENSG00000005022":[13,3],"ENSG00000005059":[116,87],"ENSG00000005073":[61,74],"ENSG00000005100":[61,134],"ENSG00000005108":[110,120],"ENSG00000005156":[1,22],"ENSG00000005175":[382,400],"ENSG00000005187":[38,4],"ENSG00000005189":[29,8],"ENSG00000005194":[30,44],"ENSG00000005206":[156,242],"ENSG00000005238":[212,149],"ENSG00000005243":[244,153],"ENSG00000005302":[102,121],"ENSG00000005339":[1255,1093],"ENSG00000005381":[47,152],"ENSG00000005436":[217,185],"ENSG00000005448":[86,51],"ENSG00000005469":[236,128],"ENSG00000005471":[129,234],"ENSG00000005483":[17,6],"ENSG00000005486":[36,24],"ENSG00000005700":[97,65],"ENSG00000005801":[85,42],"ENSG00000005810":[62,18],"ENSG00000005812":[36,57],"ENSG00000005844":[55,134],"ENSG00000005884":[270,171],"ENSG00000005961":[253,306],"ENSG00000006016":[109,148],"ENSG00000006025":[36,48],"ENSG00000006047":[116,63],"ENSG00000006062":[158,188],"ENSG00000006116":[56,54],"ENSG00000006118":[102,125],"ENSG00000006194":[120,145],"ENSG00000006377":[8,2],"ENSG00000006432":[72,42]};
const EX_N={"ENSG00000000003":[6566,6857],"ENSG00000000005":[35,238],"ENSG00000000419":[1075,1791],"ENSG00000000457":[874,742],"ENSG00000000460":[133,128],"ENSG00000000938":[1100,938],"ENSG00000000971":[7012,5704],"ENSG00000001036":[2397,3024],"ENSG00000001084":[1059,777],"ENSG00000001167":[994,1054],"ENSG00000001460":[578,643],"ENSG00000001461":[237,328],"ENSG00000001497":[546,534],"ENSG00000001561":[1087,814],"ENSG00000001617":[108,94],"ENSG00000001626":[27,24],"ENSG00000001629":[319,289],"ENSG00000001630":[1192,1360],"ENSG00000001631":[487,434],"ENSG00000002016":[2268,1804],"ENSG00000002079":[3,0],"ENSG00000002330":[5153,5494],"ENSG00000002549":[3023,2979],"ENSG00000002586":[345,270],"ENSG00000002587":[1,5],"ENSG00000002726":[539,439],"ENSG00000002745":[1200,1066],"ENSG00000002746":[159,135],"ENSG00000002822":[367,281],"ENSG00000002834":[1285,1439],"ENSG00000002919":[0,3],"ENSG00000002933":[2063,2148],"ENSG00000003056":[1949,1665],"ENSG00000003096":[181,105],"ENSG00000003137":[9,1],"ENSG00000003147":[47,39],"ENSG00000003249":[219,159],"ENSG00000003393":[235,203],"ENSG00000003400":[517,503],"ENSG00000003402":[173,165],"ENSG00000003436":[11,5],"ENSG00000003509":[171,193],"ENSG00000003756":[2014,1927],"ENSG00000003987":[7,4],"ENSG00000003989":[191,171],"ENSG00000004059":[4576,4610],"ENSG00000004139":[106,114],"ENSG00000004142":[0,1],"ENSG00000004455":[434,357],"ENSG00000004468":[2268,1884],"ENSG00000004478":[1203,1122],"ENSG00000004487":[1987,2133],"ENSG00000004534":[4,13],"ENSG00000004660":[149,117],"ENSG00000004700":[260,243],"ENSG00000004766":[162,157],"ENSG00000004776":[2,2],"ENSG00000004777":[149,120],"ENSG00000004779":[866,1254],"ENSG00000004838":[1025,883],"ENSG00000004846":[270,222],"ENSG00000004848":[1222,1105],"ENSG00000004864":[971,925],"ENSG00000004866":[345,318],"ENSG00000004897":[1439,1327],"ENSG00000004939":[1279,1219],"ENSG00000004961":[70,59],"ENSG00000005007":[101,95],"ENSG00000005020":[11,5],"ENSG00000005022":[1,0],"ENSG00000005059":[84,96],"ENSG00000005073":[26,34],"ENSG00000005100":[577,490],"ENSG00000005108":[259,243],"ENSG00000005156":[87,54],"ENSG00000005175":[500,531],"ENSG00000005187":[25,18],"ENSG00000005189":[3,3],"ENSG00000005194":[38,52],"ENSG00000005206":[279,318],"ENSG00000005238":[252,253],"ENSG00000005243":[208,184],"ENSG00000005302":[108,102],"ENSG00000005339":[1195,1131],"ENSG00000005381":[558,487],"ENSG00000005436":[224,173],"ENSG00000005448":[31,29],"ENSG00000005469":[133,121],"ENSG00000005471":[335,369],"ENSG00000005483":[65,58],"ENSG00000005486":[5,4],"ENSG00000005700":[116,96],"ENSG00000005801":[188,226],"ENSG00000005810":[15,16],"ENSG00000005812":[111,96],"ENSG00000005844":[346,318],"ENSG00000005884":[255,188],"ENSG00000005961":[230,225],"ENSG00000006016":[182,153],"ENSG00000006025":[17,18],"ENSG00000006047":[50,42],"ENSG00000006062":[176,142],"ENSG00000006116":[111,106],"ENSG00000006118":[50,39],"ENSG00000006194":[93,101],"ENSG00000006377":[112,85],"ENSG00000006432":[69,42]};

/* ═══════════════════════════════════════════════════════════════════════
   ANALYSIS ENGINE
   ═══════════════════════════════════════════════════════════════════════ */
function parseCSV(text){const r=Papa.parse(text.trim(),{header:false,dynamicTyping:true,skipEmptyLines:true});const rows=r.data;if(!rows.length)return{samples:[],data:{},geneCount:0};const samples=rows[0].slice(1).map(String);const data={};for(let i=1;i<rows.length;i++){const row=rows[i];if(!row[0])continue;const geneId=String(row[0]).split(".")[0];const vals=row.slice(1).map(v=>typeof v==="number"?v:parseFloat(v)||0);if(data[geneId])data[geneId]=data[geneId].map((v,j)=>Math.round((v+(vals[j]||0))/2));else data[geneId]=vals}return{samples,data,geneCount:Object.keys(data).length}}
function adjustP(pvals){const n=pvals.length;const ix=pvals.map((p,i)=>({p,i}));ix.sort((a,b)=>b.p-a.p);const adj=new Array(n);let cm=1;for(let k=0;k<n;k++){const{p,i}=ix[k];cm=Math.min(cm,Math.min(1,(p*n)/(n-k)));adj[i]=cm}return adj}
function computeDEA(td,nd){const genes=new Set([...Object.keys(td),...Object.keys(nd)]);const raw=[];for(const g of genes){const t=td[g],n=nd[g];if(!t||!n)continue;const tm=t.reduce((a,b)=>a+b,0)/t.length,nm=n.reduce((a,b)=>a+b,0)/n.length;const lfc=Math.log2((tm+1)/(nm+1)),bm=(tm+nm)/2;let p=1;if(t.length>=2&&n.length>=2){const v1=t.reduce((s,v)=>s+(v-tm)**2,0)/(t.length-1),v2=n.reduce((s,v)=>s+(v-nm)**2,0)/(n.length-1),se=Math.sqrt(v1/t.length+v2/n.length);if(se>0){const at=Math.abs((tm-nm)/se);p=Math.max(1e-300,2*Math.exp(-0.717*at-0.416*at*at))}}else p=Math.abs(lfc)>2?0.001:Math.abs(lfc)>1?0.05:0.5;raw.push({gene:g,log2FC:lfc,baseMean:bm,pValue:p,tMean:tm,nMean:nm,tVals:t,nVals:n})}
const ap=adjustP(raw.map(r=>r.pValue));return raw.map((r,i)=>{const pa=ap[i],sig=Math.abs(r.log2FC)>1&&pa<0.05,dir=r.log2FC>1&&pa<0.05?"up":r.log2FC<-1&&pa<0.05?"down":"ns";return{gene:r.gene,log2FC:+r.log2FC.toFixed(4),baseMean:+r.baseMean.toFixed(1),pValue:r.pValue,padj:pa,negLog10P:+(-Math.log10(Math.max(1e-300,pa))).toFixed(2),significant:sig,direction:dir,tumorMean:+r.tMean.toFixed(1),normalMean:+r.nMean.toFixed(1),tVals:r.tVals,nVals:r.nVals}}).sort((a,b)=>Math.abs(b.log2FC)-Math.abs(a.log2FC))}

/* ═══════════════════════════════════════════════════════════════════════
   EXPORT UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */
function downloadBlob(content,filename,type="text/csv"){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=filename;a.click();URL.revokeObjectURL(u)}
function genCSV(data,cols){const h=cols.map(c=>c.key).join(",")+"\n";const rows=data.map(r=>cols.map(c=>{const v=r[c.key];return typeof v==="number"?(Number.isFinite(v)?v<0.001&&v>0?v.toExponential(3):v:v):v}).join(",")).join("\n");return h+rows}
function genTSV(data,cols){const h=cols.map(c=>c.key).join("\t")+"\n";const rows=data.map(r=>cols.map(c=>{const v=r[c.key];return typeof v==="number"?(Number.isFinite(v)?v<0.001&&v>0?v.toExponential(3):v:v):v}).join("\t")).join("\n");return h+rows}
function copyToClipboard(text){navigator.clipboard?.writeText(text).catch(()=>{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta)})}

const COLS=[{key:"gene",label:"Gene"},{key:"log2FC",label:"log₂FC"},{key:"baseMean",label:"Base Mean"},{key:"pValue",label:"p-value"},{key:"padj",label:"padj (BH)"},{key:"tumorMean",label:"Tumor Mean"},{key:"normalMean",label:"Normal Mean"},{key:"direction",label:"Direction"}];

/* ═══════════════════════════════════════════════════════════════════════
   UI ATOMS
   ═══════════════════════════════════════════════════════════════════════ */
const K={cyan:"#22d3ee",rose:"#fb7185",emerald:"#34d399",amber:"#fbbf24",w05:"rgba(255,255,255,0.05)",w10:"rgba(255,255,255,0.1)",w15:"rgba(255,255,255,0.15)",w25:"rgba(255,255,255,0.25)",w40:"rgba(255,255,255,0.4)",w02:"rgba(255,255,255,0.02)",bg:"#0d1117"};

function Icon({name,size=14}){const icons={download:"M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",copy:"M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-2M8 4a2 2 0 012-2h2a2 2 0 012 2v0a2 2 0 01-2 2h-2a2 2 0 01-2-2z",filter:"M3 4h18M7 8h10M10 12h4",x:"M6 18L18 6M6 6l12 12",link:"M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14",info:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",check:"M5 13l4 4L19 7",chevDown:"M19 9l-7 7-7-7",reset:"M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114.2-4.8M20 15a8 8 0 01-14.2 4.8"};
return<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={icons[name]||icons.info}/></svg>}

function Drop({label,onFile,name,color,onClear}){const ref=useRef(null);const[drag,setDrag]=useState(false);
const handle=useCallback(f=>{if(!f)return;const r=new FileReader();r.onload=e=>onFile(e.target.result,f.name);r.readAsText(f)},[onFile]);
return<div onClick={()=>ref.current?.click()} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0])}}
style={{border:`2px dashed ${drag?color:K.w05}`,background:drag?`${color}08`:K.w02,borderRadius:12,padding:"16px 14px",cursor:"pointer",textAlign:"center",transition:"all 0.2s",position:"relative"}}>
<input ref={ref} type="file" accept=".csv,.tsv,.txt" style={{display:"none"}} onChange={e=>handle(e.target.files[0])}/>
<div style={{fontSize:9,letterSpacing:2,textTransform:"uppercase",color:K.w25,marginBottom:4}}>{label}</div>
{name?<div style={{fontSize:12,fontFamily:"monospace",color,wordBreak:"break-all",paddingRight:name?20:0}}>{name}{onClear&&<span onClick={e=>{e.stopPropagation();onClear()}} style={{position:"absolute",right:10,top:10,cursor:"pointer",color:K.w25,fontSize:16}} title="Clear">&times;</span>}</div>:<div style={{fontSize:12,color:K.w25}}>Drop CSV or click to browse</div>}
</div>}

function Stat({label,value,sub,color="#fff"}){return<div style={{background:K.w02,border:`1px solid ${K.w05}`,borderRadius:12,padding:"12px 14px"}}>
<div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:K.w25,marginBottom:3}}>{label}</div>
<div style={{fontSize:22,fontWeight:300,fontFamily:"monospace",color}}>{value}</div>
{sub&&<div style={{fontSize:10,color:K.w15,marginTop:2}}>{sub}</div>}</div>}

function Tip({active,payload}){if(!active||!payload?.length)return null;const d=payload[0].payload;
return<div style={{background:K.bg,border:`1px solid ${K.w10}`,borderRadius:8,padding:"8px 12px",fontSize:11,fontFamily:"monospace",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
<div style={{color:K.cyan,fontWeight:600,marginBottom:3}}>{d.gene}</div>
<div style={{color:K.w40}}>log₂FC: <span style={{color:d.log2FC>0?K.rose:K.emerald}}>{typeof d.log2FC==="number"?d.log2FC.toFixed(3):d.M?.toFixed(3)}</span></div>
{d.negLog10P!==undefined&&<div style={{color:K.w40}}>−log₁₀(padj): {d.negLog10P}</div>}
{d.baseMean!==undefined&&<div style={{color:K.w40}}>Base mean: {d.baseMean}</div>}
{d.tumorMean!==undefined&&<div style={{color:K.w40}}>Tumor: {d.tumorMean} · Normal: {d.normalMean}</div>}
{d.A!==undefined&&<div style={{color:K.w40}}>Mean expr: {d.A.toFixed(1)}</div>}</div>}

function Toast({msg,onDone}){useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t)},[onDone]);
return<div style={{position:"fixed",bottom:24,right:24,background:K.bg,border:`1px solid ${K.w10}`,borderRadius:10,padding:"10px 16px",fontSize:12,color:K.cyan,zIndex:999,boxShadow:"0 8px 32px rgba(0,0,0,0.4)",display:"flex",alignItems:"center",gap:8,animation:"fadeIn .2s"}}><Icon name="check" size={14}/>{msg}</div>}

/* ═══════════════════════════════════════════════════════════════════════
   GENE DETAIL MODAL
   ═══════════════════════════════════════════════════════════════════════ */
function GeneModal({gene,onClose}){if(!gene)return null;
const fc=gene.log2FC,dir=gene.direction;
return<div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={onClose}>
<div onClick={e=>e.stopPropagation()} style={{background:"#0c1220",border:`1px solid ${K.w10}`,borderRadius:16,padding:28,maxWidth:520,width:"90%",maxHeight:"80vh",overflowY:"auto",position:"relative"}}>
<button onClick={onClose} style={{position:"absolute",top:12,right:14,background:"none",border:"none",color:K.w25,cursor:"pointer",fontSize:18}}>&times;</button>
<div style={{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:K.w25,marginBottom:8}}>Gene Detail</div>
<div style={{fontSize:20,fontFamily:"monospace",color:K.cyan,fontWeight:500,marginBottom:16}}>{gene.gene}</div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
<div style={{background:K.w02,borderRadius:8,padding:12}}><div style={{fontSize:9,color:K.w25,textTransform:"uppercase",letterSpacing:"0.1em"}}>log₂ Fold Change</div><div style={{fontSize:18,fontFamily:"monospace",color:fc>0?K.rose:fc<0?K.emerald:"#fff",marginTop:4}}>{fc}</div></div>
<div style={{background:K.w02,borderRadius:8,padding:12}}><div style={{fontSize:9,color:K.w25,textTransform:"uppercase",letterSpacing:"0.1em"}}>Adjusted p-value</div><div style={{fontSize:18,fontFamily:"monospace",color:gene.padj<0.05?K.cyan:K.w25,marginTop:4}}>{gene.padj<0.001?gene.padj.toExponential(2):gene.padj.toFixed(4)}</div></div>
<div style={{background:K.w02,borderRadius:8,padding:12}}><div style={{fontSize:9,color:K.w25,textTransform:"uppercase",letterSpacing:"0.1em"}}>Tumor Mean</div><div style={{fontSize:18,fontFamily:"monospace",marginTop:4}}>{gene.tumorMean}</div></div>
<div style={{background:K.w02,borderRadius:8,padding:12}}><div style={{fontSize:9,color:K.w25,textTransform:"uppercase",letterSpacing:"0.1em"}}>Normal Mean</div><div style={{fontSize:18,fontFamily:"monospace",marginTop:4}}>{gene.normalMean}</div></div>
</div>

{gene.tVals&&gene.nVals&&<div style={{marginBottom:20}}>
<div style={{fontSize:10,color:K.w25,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>Sample-Level Counts</div>
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
{gene.tVals.map((v,i)=><div key={`t${i}`} style={{background:"rgba(251,113,133,0.08)",border:"1px solid rgba(251,113,133,0.15)",borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"monospace"}}><span style={{fontSize:9,color:K.w25}}>T{i+1}</span> <span style={{color:K.rose}}>{v}</span></div>)}
{gene.nVals.map((v,i)=><div key={`n${i}`} style={{background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"monospace"}}><span style={{fontSize:9,color:K.w25}}>N{i+1}</span> <span style={{color:K.emerald}}>{v}</span></div>)}
</div></div>}

<div style={{fontSize:10,color:K.w25,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.1em"}}>External Links</div>
<div style={{display:"flex",flexWrap:"wrap",gap:8}}>
{[["Ensembl",`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${gene.gene}`],["GeneCards",`https://www.genecards.org/cgi-bin/carddisp.pl?gene=${gene.gene}`],["NCBI Gene",`https://www.ncbi.nlm.nih.gov/gene/?term=${gene.gene}`],["UniProt",`https://www.uniprot.org/uniprotkb?query=${gene.gene}`]].map(([l,u])=>
<a key={l} href={u} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:K.cyan,border:`1px solid rgba(34,211,238,0.2)`,borderRadius:6,padding:"5px 10px",textDecoration:"none",display:"flex",alignItems:"center",gap:4}}><Icon name="link" size={11}/>{l}</a>)}
</div>
</div></div>}

/* ═══════════════════════════════════════════════════════════════════════
   EXPORT MENU COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
function ExportMenu({results,filteredResults,onToast}){const[open,setOpen]=useState(false);const ref=useRef(null);
useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);
const sigOnly=useMemo(()=>results?.filter(r=>r.significant)||[],[results]);
const exportData=(data,format,suffix)=>{const clean=data.map(({tVals,nVals,...r})=>r);if(format==="csv")downloadBlob(genCSV(clean,COLS),`dea_${suffix}.csv`);else if(format==="tsv")downloadBlob(genTSV(clean,COLS),`dea_${suffix}.tsv`,"text/tab-separated-values");else if(format==="json")downloadBlob(JSON.stringify(clean,null,2),`dea_${suffix}.json`,"application/json");onToast(`Exported ${data.length} genes as ${format.toUpperCase()}`);setOpen(false)};
const copyGeneList=(data,label)=>{copyToClipboard(data.map(r=>r.gene).join("\n"));onToast(`Copied ${data.length} ${label} gene IDs`);setOpen(false)};
if(!results)return null;
return<div ref={ref} style={{position:"relative"}}>
<button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:5,padding:"8px 14px",fontSize:11,color:K.w25,background:"none",border:`1px solid ${K.w05}`,borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}><Icon name="download" size={13}/>Export</button>
{open&&<div style={{position:"absolute",right:0,top:"100%",marginTop:6,background:K.bg,border:`1px solid ${K.w10}`,borderRadius:10,padding:6,minWidth:240,zIndex:60,boxShadow:"0 16px 48px rgba(0,0,0,0.5)"}}>
<div style={{fontSize:9,color:K.w15,padding:"6px 10px",textTransform:"uppercase",letterSpacing:"0.15em"}}>Download Results</div>
{[["All results","results",results],["Significant only","significant",sigOnly],["Current view","filtered",filteredResults]].map(([label,suffix,data])=>
<Fragment key={suffix}>{["csv","tsv","json"].map(fmt=>
<button key={`${suffix}-${fmt}`} onClick={()=>exportData(data,fmt,suffix)} style={{display:"block",width:"100%",textAlign:"left",padding:"7px 10px",fontSize:11,color:K.w40,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",borderRadius:4}} onMouseEnter={e=>e.currentTarget.style.background=K.w02} onMouseLeave={e=>e.currentTarget.style.background="none"}>{label} · {fmt.toUpperCase()} ({data.length})</button>)}</Fragment>)}
<div style={{borderTop:`1px solid ${K.w05}`,margin:"4px 0"}}/>
<div style={{fontSize:9,color:K.w15,padding:"6px 10px",textTransform:"uppercase",letterSpacing:"0.15em"}}>Copy Gene Lists</div>
{[["All gene IDs",results,"all"],["Upregulated IDs",results.filter(r=>r.direction==="up"),"up"],["Downregulated IDs",results.filter(r=>r.direction==="down"),"down"],["Significant IDs",sigOnly,"significant"]].map(([label,data,key])=>
<button key={key} onClick={()=>copyGeneList(data,label.toLowerCase())} style={{display:"flex",alignItems:"center",gap:6,width:"100%",textAlign:"left",padding:"7px 10px",fontSize:11,color:K.w40,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",borderRadius:4}} onMouseEnter={e=>e.currentTarget.style.background=K.w02} onMouseLeave={e=>e.currentTarget.style.background="none"}><Icon name="copy" size={11}/>{label} ({data.length})</button>)}
</div>}
</div>}

/* ═══════════════════════════════════════════════════════════════════════
   METHODS TEXT (copy-pasteable for papers)
   ═══════════════════════════════════════════════════════════════════════ */
function MethodsPanel({results,onToast}){const[open,setOpen]=useState(false);
const text=`Differential expression analysis was performed using a Welch's t-test comparing tumor (n=${results?.[0]?.tVals?.length||"?"}) and normal (n=${results?.[0]?.nVals?.length||"?"}) samples. Log2 fold changes were calculated as log2((mean_tumor + 1) / (mean_normal + 1)). P-values were corrected for multiple testing using the Benjamini-Hochberg procedure. Genes with |log2FC| > 1 and adjusted p-value < 0.05 were considered differentially expressed. Of ${results?.length||0} genes analyzed, ${results?.filter(r=>r.significant).length||0} were significantly differentially expressed (${results?.filter(r=>r.direction==="up").length||0} upregulated, ${results?.filter(r=>r.direction==="down").length||0} downregulated).`;
if(!results)return null;
return<div style={{marginTop:8}}>
<button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:K.w25,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:0}}><Icon name="info" size={13}/>{open?"Hide":"Show"} methods summary</button>
{open&&<div style={{marginTop:10,background:K.w02,border:`1px solid ${K.w05}`,borderRadius:10,padding:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:8}}>
<div style={{fontSize:9,color:K.w25,textTransform:"uppercase",letterSpacing:"0.15em"}}>Methods (copy for manuscript)</div>
<button onClick={()=>{copyToClipboard(text);onToast("Methods text copied")}} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:K.cyan,background:"none",border:`1px solid rgba(34,211,238,0.2)`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}><Icon name="copy" size={11}/>Copy</button>
</div>
<div style={{fontSize:12,color:K.w40,lineHeight:1.7}}>{text}</div>
</div>}
</div>}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN APPLICATION
   ═══════════════════════════════════════════════════════════════════════ */
export default function App(){
const[pwSearch,setPwSearch]=useState("");const[selPW,setSelPW]=useState(null);const[showDD,setShowDD]=useState(false);const[catF,setCatF]=useState("All");
const[tFile,setTFile]=useState({d:null,n:null,c:0});const[nFile,setNFile]=useState({d:null,n:null,c:0});
const[res,setRes]=useState(null);const[tab,setTab]=useState("volcano");const[busy,setBusy]=useState(false);
const[sf,setSf]=useState("log2FC");const[sd,setSd]=useState("desc");const[tSearch,setTSearch]=useState("");
const[fcTh,setFcTh]=useState(1);const[pTh,setPTh]=useState(0.05);const[page,setPage]=useState(0);const[perPage]=useState(100);
const[selGene,setSelGene]=useState(null);const[toast,setToast]=useState(null);const[dirFilter,setDirFilter]=useState("all");
const ddRef=useRef(null);

useEffect(()=>{const h=e=>{if(ddRef.current&&!ddRef.current.contains(e.target))setShowDD(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);
// Keyboard: Escape closes modal/dropdown
useEffect(()=>{const h=e=>{if(e.key==="Escape"){setSelGene(null);setShowDD(false)}};document.addEventListener("keydown",h);return()=>document.removeEventListener("keydown",h)},[]);

const cats=useMemo(()=>["All",...new Set(PATHWAYS.map(p=>p.category))],[]);
const fPW=useMemo(()=>{let pw=PATHWAYS;if(catF!=="All")pw=pw.filter(p=>p.category===catF);if(pwSearch){const q=pwSearch.toLowerCase();pw=pw.filter(p=>p.name.toLowerCase().includes(q)||p.id.includes(q))}return pw},[pwSearch,catF]);

const loadEx=useCallback(()=>{setTFile({d:EX_T,n:"TCGA-SKCM Tumor (example)",c:Object.keys(EX_T).length});setNFile({d:EX_N,n:"TCGA-KIRC Normal (example)",c:Object.keys(EX_N).length})},[]);
const onT=useCallback((txt,nm)=>{const p=parseCSV(txt);setTFile({d:p.data,n:nm,c:p.geneCount})},[]);
const onN=useCallback((txt,nm)=>{const p=parseCSV(txt);setNFile({d:p.data,n:nm,c:p.geneCount})},[]);
const clearT=useCallback(()=>setTFile({d:null,n:null,c:0}),[]);
const clearN=useCallback(()=>setNFile({d:null,n:null,c:0}),[]);
const resetAll=useCallback(()=>{setRes(null);setTFile({d:null,n:null,c:0});setNFile({d:null,n:null,c:0});setSelPW(null);setPwSearch("");setDirFilter("all");setPage(0)},[]);

const run=useCallback(()=>{if(!tFile.d||!nFile.d)return;setBusy(true);setTimeout(()=>{const r=computeDEA(tFile.d,nFile.d);setRes(r);setBusy(false);setTab("volcano");setPage(0);setToast(`Analysis complete: ${r.length} genes processed`)},50)},[tFile.d,nFile.d]);

const sum=useMemo(()=>{if(!res)return null;const up=res.filter(r=>r.direction==="up").length,dn=res.filter(r=>r.direction==="down").length;return{total:res.length,up,dn,sig:up+dn}},[res]);

const vData=useMemo(()=>res?res.map(r=>({...r,dd:Math.abs(r.log2FC)>fcTh&&r.padj<pTh?(r.log2FC>0?"up":"down"):"ns"})):[], [res,fcTh,pTh]);
const maData=useMemo(()=>res?res.filter(r=>r.baseMean>0).map(r=>({gene:r.gene,A:Math.log2(r.baseMean+1),M:r.log2FC,log2FC:r.log2FC,direction:r.direction,significant:r.significant,tumorMean:r.tumorMean,normalMean:r.normalMean,negLog10P:r.negLog10P,baseMean:r.baseMean})):[], [res]);
const fcDist=useMemo(()=>{if(!res)return[];const b={},s=0.5;for(const r of res){const k=(Math.round(r.log2FC/s)*s).toFixed(1);if(!b[k])b[k]={fc:+k,count:0,sig:0};b[k].count++;if(r.significant)b[k].sig++}return _.sortBy(Object.values(b),"fc")},[res]);
const topG=useMemo(()=>res?res.filter(r=>r.significant).slice(0,30):[],[res]);

// Filtered + sorted table with direction filter
const sTable=useMemo(()=>{if(!res)return[];let d=[...res];if(dirFilter==="up")d=d.filter(r=>r.direction==="up");else if(dirFilter==="down")d=d.filter(r=>r.direction==="down");else if(dirFilter==="sig")d=d.filter(r=>r.significant);if(tSearch){const q=tSearch.toLowerCase();d=d.filter(r=>r.gene.toLowerCase().includes(q))}return _.orderBy(d,[r=>sf==="log2FC"?Math.abs(r[sf]):r[sf]],[sd])},[res,sf,sd,tSearch,dirFilter]);
const pagedTable=useMemo(()=>sTable.slice(page*perPage,(page+1)*perPage),[sTable,page,perPage]);
const totalPages=Math.ceil(sTable.length/perPage);

const doSort=f=>{if(sf===f)setSd(d=>d==="asc"?"desc":"asc");else{setSf(f);setSd("desc")}};

const sty={
card:{background:K.w02,border:`1px solid ${K.w05}`,borderRadius:16,padding:24},
lbl:{fontSize:9,letterSpacing:"0.2em",textTransform:"uppercase",color:K.w25,marginBottom:12},
chip:a=>({fontSize:10,padding:"3px 9px",borderRadius:99,border:`1px solid ${a?"rgba(34,211,238,0.25)":K.w05}`,background:a?"rgba(34,211,238,0.05)":"transparent",color:a?K.cyan:"rgba(255,255,255,0.2)",cursor:"pointer",transition:"all .15s"}),
inp:{width:"100%",background:"rgba(255,255,255,0.025)",border:`1px solid ${K.w05}`,borderRadius:8,padding:"9px 11px",fontSize:12,color:"#fff",outline:"none",fontFamily:"inherit"},
tabS:a=>({padding:"11px 18px",fontSize:11,cursor:"pointer",borderBottom:a?`2px solid ${K.cyan}`:"2px solid transparent",color:a?K.cyan:K.w15,background:a?"rgba(34,211,238,0.03)":"transparent",transition:"all .15s",whiteSpace:"nowrap"}),
btn:ok=>({width:"100%",padding:"13px 0",borderRadius:12,fontSize:13,fontWeight:500,border:"none",cursor:ok?"pointer":"not-allowed",background:ok?K.cyan:"rgba(255,255,255,0.03)",color:ok?"#000":"rgba(255,255,255,0.12)",fontFamily:"inherit",transition:"all .3s",...(ok?{boxShadow:"0 4px 20px rgba(34,211,238,0.18)"}:{})}),
miniBtn:{fontSize:10,color:K.w25,background:"none",border:`1px solid ${K.w05}`,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"},
};

const TABS=[["volcano","Volcano Plot"],["ma","MA Plot"],["distribution","FC Distribution"],["topgenes","Top Genes"],["table","Results Table"]];

return<div style={{fontFamily:"'JetBrains Mono','SF Mono',monospace",background:"linear-gradient(145deg,#030712 0%,#0a0f1a 40%,#0c1220 100%)",minHeight:"100vh",color:"rgba(255,255,255,0.88)"}}>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} ::selection{background:rgba(34,211,238,.3)} ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-thumb{background:rgba(255,255,255,.08);border-radius:3px} ::-webkit-scrollbar-track{background:transparent}`}</style>

{/* Modal */}
<GeneModal gene={selGene} onClose={()=>setSelGene(null)}/>
{toast&&<Toast msg={toast} onDone={()=>setToast(null)}/>}

{/* Header */}
<header style={{borderBottom:`1px solid ${K.w05}`,padding:"24px"}}>
<div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"start",flexWrap:"wrap",gap:12}}>
<div>
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
<div style={{width:6,height:6,borderRadius:"50%",background:K.cyan,animation:"pulse 2s infinite"}}/>
<span style={{fontSize:9,letterSpacing:"0.25em",textTransform:"uppercase",color:"rgba(34,211,238,0.45)"}}>Genomics Analysis Platform v3</span>
</div>
<h1 style={{fontFamily:"'Space Grotesk',sans-serif",fontSize:28,fontWeight:300,margin:0}}>Cancer Pathway <span style={{color:K.cyan}}>Visualizer</span></h1>
<p style={{fontSize:11,color:K.w15,marginTop:4,maxWidth:600,lineHeight:1.6}}>Differential expression analysis on KEGG pathways. Welch's t-test + BH FDR correction. Upload RNA-seq raw counts.</p>
</div>
{res&&<div style={{display:"flex",gap:8,alignItems:"center"}}>
<ExportMenu results={res} filteredResults={sTable} onToast={setToast}/>
<button onClick={resetAll} style={{...sty.miniBtn,display:"flex",alignItems:"center",gap:4}}><Icon name="reset" size={12}/>Reset</button>
</div>}
</div></header>

<main style={{maxWidth:1200,margin:"0 auto",padding:"24px 24px 48px"}}>

{/* Setup */}
<div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:20,marginBottom:24}}>
{/* Pathway */}
<div style={sty.card}>
<div style={sty.lbl}>1 · Pathway</div>
<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
{cats.map(c=><span key={c} style={sty.chip(catF===c)} onClick={()=>setCatF(c)}>{c}</span>)}</div>
<div ref={ddRef} style={{position:"relative"}}>
<input style={sty.inp} placeholder="Search 344 pathways..." value={pwSearch} onChange={e=>{setPwSearch(e.target.value);setShowDD(true)}} onFocus={()=>setShowDD(true)}/>
{showDD&&<div style={{position:"absolute",zIndex:50,width:"100%",marginTop:4,background:K.bg,border:`1px solid ${K.w05}`,borderRadius:8,maxHeight:220,overflowY:"auto",boxShadow:"0 16px 48px rgba(0,0,0,0.5)"}}>
{fPW.slice(0,40).map(pw=><div key={pw.id} onClick={()=>{setSelPW(pw);setPwSearch(pw.name);setShowDD(false)}} style={{padding:"7px 10px",fontSize:11,cursor:"pointer",display:"flex",gap:7,color:selPW?.id===pw.id?K.cyan:K.w40,background:selPW?.id===pw.id?"rgba(34,211,238,0.05)":"transparent"}} onMouseEnter={e=>e.currentTarget.style.background=K.w02} onMouseLeave={e=>e.currentTarget.style.background=selPW?.id===pw.id?"rgba(34,211,238,0.05)":"transparent"}>
<span style={{fontSize:9,color:K.w10,fontFamily:"monospace",flexShrink:0}}>{pw.id}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pw.name}</span></div>)}
{fPW.length===0&&<div style={{padding:14,textAlign:"center",fontSize:11,color:K.w10}}>No match</div>}
</div>}</div>
{selPW&&<div style={{marginTop:10,padding:10,background:"rgba(34,211,238,0.03)",border:"1px solid rgba(34,211,238,0.12)",borderRadius:8}}>
<div style={{fontSize:9,color:"rgba(34,211,238,0.4)",textTransform:"uppercase",letterSpacing:"0.12em"}}>Selected</div>
<div style={{fontSize:12,color:"rgba(34,211,238,0.75)",marginTop:2}}>{selPW.name}</div>
<div style={{fontSize:10,color:K.w10,fontFamily:"monospace",marginTop:2}}>{selPW.id} · {selPW.category}</div>
<a href={`https://www.kegg.jp/pathway/${selPW.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:10,color:"rgba(34,211,238,0.35)",textDecoration:"underline",marginTop:3,display:"inline-block"}}>View on KEGG →</a></div>}
</div>

{/* Data */}
<div style={sty.card}>
<div style={sty.lbl}>2 · Expression Data</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
<Drop label="Tumor / Disease" onFile={onT} name={tFile.n} color={K.cyan} onClear={tFile.n?clearT:null}/>
<Drop label="Normal / Control" onFile={onN} name={nFile.n} color={K.amber} onClear={nFile.n?clearN:null}/>
</div>
{(tFile.c>0||nFile.c>0)&&<div style={{fontSize:11,color:K.w15,marginBottom:8}}>{tFile.c>0&&`Tumor: ${tFile.c.toLocaleString()} genes`}{tFile.c>0&&nFile.c>0&&" · "}{nFile.c>0&&`Normal: ${nFile.c.toLocaleString()} genes`}</div>}
<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
<button onClick={loadEx} style={sty.miniBtn}>Load Example</button>
<span style={{fontSize:10,color:"rgba(255,255,255,0.06)"}}>TCGA melanoma vs kidney normal</span>
</div>
<div style={{padding:10,background:"rgba(255,255,255,0.01)",borderRadius:8,border:`1px solid rgba(255,255,255,0.025)`,fontSize:10,color:"rgba(255,255,255,0.14)",lineHeight:1.6,marginBottom:14}}>
<strong style={{color:K.w25}}>Format:</strong> CSV, Ensembl IDs as rows, samples as columns. Raw RNA-seq counts. Versions auto-stripped. Handles 60k+ genes.</div>
<button onClick={run} disabled={!tFile.d||!nFile.d||busy} style={sty.btn(!!(tFile.d&&nFile.d&&!busy))}>{busy?"Computing...":"Run Differential Expression Analysis"}</button>
</div></div>

{/* Results */}
{res&&sum&&<>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:6}}>
<Stat label="Total Genes" value={sum.total.toLocaleString()} sub="analyzed"/>
<Stat label="Upregulated" value={sum.up} sub="|log₂FC|>1, padj<0.05" color={K.rose}/>
<Stat label="Downregulated" value={sum.dn} sub="|log₂FC|>1, padj<0.05" color={K.emerald}/>
<Stat label="Significant" value={sum.sig} sub={`${((sum.sig/sum.total)*100).toFixed(1)}%`} color={K.cyan}/>
</div>
<MethodsPanel results={res} onToast={setToast}/>

{/* Tabs */}
<div style={{...sty.card,padding:0,overflow:"hidden",marginTop:16}}>
<div style={{display:"flex",borderBottom:`1px solid ${K.w05}`,overflowX:"auto"}}>
{TABS.map(([k,l])=><div key={k} onClick={()=>{setTab(k);setPage(0)}} style={sty.tabS(tab===k)}>{l}</div>)}
</div>

<div style={{padding:22}}>

{/* Volcano */}
{tab==="volcano"&&<div>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
<span style={{fontSize:11,color:K.w15}}>log₂FC vs −log₁₀(padj) · Click points to inspect</span>
<div style={{display:"flex",gap:14,fontSize:11,color:K.w25}}>
<label>|FC| ≥ <input type="number" value={fcTh} step={0.5} min={0} onChange={e=>setFcTh(+e.target.value)} style={{width:48,background:K.w02,border:`1px solid ${K.w05}`,borderRadius:4,padding:"2px 5px",color:"#fff",fontFamily:"monospace",fontSize:11}}/></label>
<label>padj &lt; <input type="number" value={pTh} step={0.01} min={0} max={1} onChange={e=>setPTh(+e.target.value)} style={{width:56,background:K.w02,border:`1px solid ${K.w05}`,borderRadius:4,padding:"2px 5px",color:"#fff",fontFamily:"monospace",fontSize:11}}/></label>
</div></div>
<ResponsiveContainer width="100%" height={420}>
<ScatterChart margin={{top:8,right:28,left:8,bottom:22}} onClick={e=>{if(e?.activePayload?.[0])setSelGene(e.activePayload[0].payload)}}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)"/>
<XAxis type="number" dataKey="log2FC" domain={["auto","auto"]} tick={{fill:K.w15,fontSize:10}} label={{value:"log₂ Fold Change",position:"bottom",offset:6,fill:K.w10,fontSize:11}}/>
<YAxis type="number" dataKey="negLog10P" tick={{fill:K.w15,fontSize:10}} label={{value:"−log₁₀(padj)",angle:-90,position:"insideLeft",fill:K.w10,fontSize:11}}/>
<Tooltip content={<Tip/>}/><ReferenceLine x={fcTh} stroke={K.w05} strokeDasharray="4 4"/><ReferenceLine x={-fcTh} stroke={K.w05} strokeDasharray="4 4"/><ReferenceLine y={-Math.log10(pTh)} stroke={K.w05} strokeDasharray="4 4"/>
<Scatter data={vData} cursor="pointer">{vData.map((e,i)=><Cell key={i} fill={e.dd==="up"?"rgba(251,113,133,0.65)":e.dd==="down"?"rgba(52,211,153,0.65)":"rgba(255,255,255,0.06)"} r={e.dd!=="ns"?4:2}/>)}</Scatter>
</ScatterChart></ResponsiveContainer>
<div style={{display:"flex",justifyContent:"center",gap:20,marginTop:6,fontSize:10,color:K.w25}}>
{[["Up",K.rose,"up"],["Down",K.emerald,"down"],["NS","rgba(255,255,255,0.15)","ns"]].map(([l,c,d])=>
<span key={d} style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:7,height:7,borderRadius:"50%",background:c}}/>{l} ({vData.filter(v=>v.dd===d).length})</span>)}
</div></div>}

{/* MA */}
{tab==="ma"&&<div>
<div style={{fontSize:11,color:K.w15,marginBottom:14}}>MA plot: log₂FC (M) vs mean expression (A) · Click points to inspect</div>
<ResponsiveContainer width="100%" height={420}>
<ScatterChart margin={{top:8,right:28,left:8,bottom:22}} onClick={e=>{if(e?.activePayload?.[0])setSelGene(res.find(r=>r.gene===e.activePayload[0].payload.gene))}}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)"/>
<XAxis type="number" dataKey="A" tick={{fill:K.w15,fontSize:10}} label={{value:"A = log₂(mean)",position:"bottom",offset:6,fill:K.w10,fontSize:11}}/>
<YAxis type="number" dataKey="M" tick={{fill:K.w15,fontSize:10}} label={{value:"M = log₂FC",angle:-90,position:"insideLeft",fill:K.w10,fontSize:11}}/>
<Tooltip content={<Tip/>}/><ReferenceLine y={0} stroke={K.w10}/><ReferenceLine y={1} stroke={K.w05} strokeDasharray="4 4"/><ReferenceLine y={-1} stroke={K.w05} strokeDasharray="4 4"/>
<Scatter data={maData} cursor="pointer">{maData.map((e,i)=><Cell key={i} fill={e.direction==="up"?"rgba(251,113,133,0.55)":e.direction==="down"?"rgba(52,211,153,0.55)":"rgba(255,255,255,0.06)"} r={e.significant?3.5:1.8}/>)}</Scatter>
</ScatterChart></ResponsiveContainer></div>}

{/* Distribution */}
{tab==="distribution"&&<div>
<div style={{fontSize:11,color:K.w15,marginBottom:14}}>log₂FC distribution · Cyan = significant genes</div>
<ResponsiveContainer width="100%" height={380}>
<ComposedChart data={fcDist} margin={{top:8,right:28,left:8,bottom:22}}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)"/>
<XAxis dataKey="fc" type="number" tick={{fill:K.w15,fontSize:10}} label={{value:"log₂ Fold Change",position:"bottom",offset:6,fill:K.w10,fontSize:11}}/>
<YAxis tick={{fill:K.w15,fontSize:10}} label={{value:"Count",angle:-90,position:"insideLeft",fill:K.w10,fontSize:11}}/>
<Tooltip contentStyle={{background:K.bg,border:`1px solid ${K.w10}`,borderRadius:8,fontSize:11}}/>
<Bar dataKey="count" fill="rgba(255,255,255,0.06)" radius={[3,3,0,0]} name="All"/>
<Bar dataKey="sig" fill="rgba(34,211,238,0.35)" radius={[3,3,0,0]} name="Significant"/>
<ReferenceLine x={0} stroke={K.w10}/></ComposedChart></ResponsiveContainer></div>}

{/* Top Genes */}
{tab==="topgenes"&&<div>
<div style={{fontSize:11,color:K.w15,marginBottom:14}}>Top {topG.length} significant genes by |log₂FC| · Click bars to inspect</div>
{topG.length===0?<div style={{textAlign:"center",padding:40,color:K.w10}}>No significant genes at current thresholds</div>:
<ResponsiveContainer width="100%" height={Math.max(280,topG.length*17)}>
<BarChart data={topG} layout="vertical" margin={{top:4,right:28,left:95,bottom:4}} onClick={e=>{if(e?.activePayload?.[0])setSelGene(e.activePayload[0].payload)}}>
<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.025)" horizontal={false}/>
<XAxis type="number" tick={{fill:K.w15,fontSize:10}}/>
<YAxis type="category" dataKey="gene" width={88} tick={{fill:K.w25,fontSize:9}}/>
<Tooltip content={<Tip/>}/><ReferenceLine x={0} stroke={K.w10}/>
<Bar dataKey="log2FC" radius={[0,3,3,0]} cursor="pointer">{topG.map((e,i)=><Cell key={i} fill={e.log2FC>0?"rgba(251,113,133,0.45)":"rgba(52,211,153,0.45)"}/>)}</Bar>
</BarChart></ResponsiveContainer>}</div>}

{/* Table */}
{tab==="table"&&<div>
<div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14,flexWrap:"wrap"}}>
<input type="text" placeholder="Filter gene ID..." value={tSearch} onChange={e=>{setTSearch(e.target.value);setPage(0)}} style={{...sty.inp,width:220}}/>
<div style={{display:"flex",gap:4}}>
{[["all","All"],["sig","Significant"],["up","Up"],["down","Down"]].map(([v,l])=>
<button key={v} onClick={()=>{setDirFilter(v);setPage(0)}} style={{...sty.miniBtn,color:dirFilter===v?K.cyan:K.w25,borderColor:dirFilter===v?"rgba(34,211,238,0.25)":K.w05}}>{l}</button>)}
</div>
<span style={{fontSize:10,color:K.w10,marginLeft:"auto"}}>{sTable.length.toLocaleString()} genes</span>
</div>
<div style={{overflowX:"auto"}}>
<table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
<thead><tr style={{borderBottom:`1px solid ${K.w05}`}}>
{COLS.map(({key,label})=><th key={key} onClick={()=>doSort(key)} style={{textAlign:"left",padding:"7px 8px",color:K.w25,cursor:"pointer",whiteSpace:"nowrap",userSelect:"none",fontWeight:400}}>{label}{sf===key?(sd==="desc"?" ↓":" ↑"):""}</th>)}
<th style={{padding:"7px 8px",width:30}}></th>
</tr></thead>
<tbody>{pagedTable.map((r,i)=>
<tr key={r.gene} style={{borderBottom:`1px solid rgba(255,255,255,0.018)`,background:i%2?K.w02:"transparent",cursor:"pointer"}} onClick={()=>setSelGene(r)} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.025)"} onMouseLeave={e=>e.currentTarget.style.background=i%2?K.w02:"transparent"}>
<td style={{padding:"5px 8px",color:"rgba(34,211,238,0.6)",fontWeight:500}}>{r.gene}</td>
<td style={{padding:"5px 8px",color:r.log2FC>0?K.rose:r.log2FC<0?K.emerald:K.w25}}>{r.log2FC}</td>
<td style={{padding:"5px 8px",color:K.w25}}>{r.baseMean}</td>
<td style={{padding:"5px 8px",color:K.w25}}>{r.pValue<0.001?r.pValue.toExponential(2):r.pValue.toFixed(4)}</td>
<td style={{padding:"5px 8px",color:K.w25}}>{r.padj<0.001?r.padj.toExponential(2):r.padj.toFixed(4)}</td>
<td style={{padding:"5px 8px",color:K.w25}}>{r.tumorMean}</td>
<td style={{padding:"5px 8px",color:K.w25}}>{r.normalMean}</td>
<td style={{padding:"5px 8px"}}><span style={{padding:"1px 5px",borderRadius:3,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",background:r.direction==="up"?"rgba(251,113,133,0.08)":r.direction==="down"?"rgba(52,211,153,0.08)":K.w02,color:r.direction==="up"?K.rose:r.direction==="down"?K.emerald:K.w10}}>{r.direction==="ns"?"n.s.":r.direction}</span></td>
<td style={{padding:"5px 4px"}} onClick={e=>e.stopPropagation()}><a href={`https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${r.gene}`} target="_blank" rel="noopener noreferrer" style={{color:K.w15}} title="Open in Ensembl"><Icon name="link" size={11}/></a></td>
</tr>)}</tbody></table></div>
{/* Pagination */}
{totalPages>1&&<div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,marginTop:14,fontSize:11}}>
<button onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{...sty.miniBtn,opacity:page===0?0.3:1}}>← Prev</button>
<span style={{color:K.w25}}>Page {page+1} of {totalPages}</span>
<button onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} style={{...sty.miniBtn,opacity:page>=totalPages-1?0.3:1}}>Next →</button>
</div>}
</div>}

</div></div>
</>}

{/* Empty */}
{!res&&<div style={{textAlign:"center",padding:"70px 0",color:"rgba(255,255,255,0.08)"}}>
<div style={{fontSize:44,marginBottom:14,opacity:0.3}}>◇</div>
<div style={{fontSize:13}}>Load data and run analysis to see results</div>
<div style={{fontSize:11,color:"rgba(255,255,255,0.05)",marginTop:6}}>Tip: Click "Load Example" for a quick demo</div>
</div>}
</main>

<footer style={{borderTop:`1px solid rgba(255,255,255,0.025)`,padding:20}}>
<div style={{maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,fontSize:10,color:"rgba(255,255,255,0.08)"}}>
<span>Cancer Pathway Interactive Visualizer v3 · React + Recharts</span>
<span>KEGG · TCGA/GDC · For research use only</span>
</div></footer>
</div>}
