import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// ── Storage ───────────────────────────────────────────────────────────────────
const SM = { unknown:"unknown", persistent:"persistent", local:"local", none:"none" };
let _dp = null;
function resetStorage() { _dp = null; }
async function detectStorage() {
  if (_dp) return _dp;
  _dp = (async () => {
    // Tester localStorage en premier (toujours dispo, y compris artifact public)
    let hasLocal = false;
    try { localStorage.setItem("__ct__","ok"); localStorage.removeItem("__ct__"); hasLocal = true; } catch(e) {}
    // Tester window.storage (dispo uniquement dans claude.ai connecté)
    try {
      if (typeof window !== "undefined" && window.storage && typeof window.storage.set === "function") {
        const r = await Promise.race([
          window.storage.set("__ct__","ok",true),
          new Promise((_,j)=>setTimeout(()=>j(new Error("to")),3000))
        ]);
        if (r) {
          const g = await Promise.race([
            window.storage.get("__ct__",true),
            new Promise((_,j)=>setTimeout(()=>j(new Error("to")),2000))
          ]);
          if (g && g.value==="ok") return SM.persistent;
        }
      }
    } catch(e) {}
    if (hasLocal) return SM.local;
    return SM.none;
  })();
  return _dp;
}
async function sGet(key) {
  const m = await detectStorage();
  try {
    if (m===SM.persistent) { const r=await Promise.race([window.storage.get(key,true),new Promise((_,j)=>setTimeout(()=>j(new Error("to")),3000))]); return r&&r.value?JSON.parse(r.value):null; }
    if (m===SM.local) { const v=localStorage.getItem("ced_"+key); return v?JSON.parse(v):null; }
  } catch(e) {}
  return null;
}
async function sSet(key, val) {
  const m = await detectStorage();
  const s = JSON.stringify(val);
  try {
    if (m===SM.persistent) { const r=await Promise.race([window.storage.set(key,s,true),new Promise((_,j)=>setTimeout(()=>j(new Error("to")),5000))]); if(!r) throw new Error("null"); return true; }
    if (m===SM.local) { localStorage.setItem("ced_"+key,s); return true; }
  } catch(e) { _dp=null; throw e; }
  return false;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const USERS = [
  {name:"Florian",initials:"FL",color:"#4361ee",role:"Direction"},
  {name:"Seynan",initials:"SE",color:"#2ec4b6",role:"Resp. comptable"},
  {name:"Elodie",initials:"EL",color:"#f4a261",role:"Comptable"},
  {name:"Daniel",initials:"DA",color:"#e63946",role:"Comptable"},
  {name:"Bastien",initials:"BA",color:"#7209b7",role:"Comptable"},
  {name:"Antonin",initials:"AN",color:"#06d6a0",role:"Comptable"},
  {name:"Gregory",initials:"GR",color:"#118ab2",role:"E2P"},
];
const ALL_PEOPLE = ["Antonin","Bastien","Daniel","Elodie","Florian","Gregory","Seynan"];
const SK = "cemedis-v3";
const sc = s => { if(!s) return "afaire"; const l=s.toLowerCase().trim(); return l==="fait"?"fait":l==="en cours"?"encours":"afaire"; };
const SC = {
  fait:    {bg:"#e6f9f7",text:"#0d8a7e",border:"#2ec4b6"},
  encours: {bg:"#fef3e6",text:"#b97a2e",border:"#f4a261"},
  afaire:  {bg:"#fde8ea",text:"#e63946",border:"#e63946"},
};
const nowStr = () => { const d=new Date(); return d.toLocaleDateString("fr-FR")+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}); };
const fmtDate = iso => iso ? new Date(iso+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"short"}) : "";
const isOD = (iso,st) => { if(!iso||sc(st)==="fait") return false; const t=new Date(); t.setHours(0,0,0,0); return new Date(iso+"T00:00:00")<t; };
const isDS = (iso,st) => { if(!iso||sc(st)==="fait") return false; const t=new Date(); t.setHours(0,0,0,0); const d=new Date(iso+"T00:00:00"); return (d-t)/864e5>=0&&(d-t)/864e5<=3; };
function addDaysG(iso,n){const d=new Date(iso+"T00:00:00");d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);}
function clampIsoG(iso,mn,mx){if(mn&&iso<mn)return mn;if(mx&&iso>mx)return mx;return iso;}
function durLabel(s,e){if(!s||!e||s>e)return null;const d=Math.round((new Date(e+"T00:00:00")-new Date(s+"T00:00:00"))/864e5)+1;return d+"j";}

// ── Initial data ──────────────────────────────────────────────────────────────
const INIT = {
  "Situation Janvier": { categories: [
    { name:"Traitement des achats", tasks:[
      {label:"MAJ LIBEO",people:["Daniel","Antonin"],status:"Fait"},
      {label:"Collecte des grands livres",people:[],status:"Fait"},
      {label:"Mail global le 2 du mois",people:["Antonin"],status:"Fait"},
      {label:"Appel fournisseurs cibles le 5",people:["Antonin","Bastien","Daniel","Elodie"],status:"Fait"},
      {label:"Cadrage des GL",people:["Bastien","Daniel"],status:"Fait"},
      {label:"Traitement des FNP",people:["Bastien","Daniel","Elodie"],status:"Fait"},
      {label:"Revue outil de commandes",people:["Bastien","Daniel"],status:"A faire",deadline:"2026-03-11"},
      {label:"Integration achats X-LAB",people:["Daniel"],status:"A faire",deadline:"2026-03-12"},
      {label:"Detection FNP sur LIBEO",people:["Antonin","Bastien","Daniel"],status:"En cours",deadline:"2026-03-11"},
      {label:"Etat elements manquants",people:[],status:"A faire",comment:"Pas urgent"},
      {label:"Justifs associes",people:["Seynan","Bastien"],status:"A faire",comment:"Pas urgent"},
      {label:"Info depenses engagees",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
      {label:"Etat factures fournisseurs",people:["Daniel","Antonin","Seynan","Elodie"],status:"A faire",comment:"Pas urgent"},
      {label:"Point post cloture",people:["Daniel","Antonin","Seynan","Elodie","Florian"],status:"A faire",comment:"Pas urgent"},
      {label:"Revision ecritures de situation",people:["Seynan"],status:"A faire",deadline:"2026-03-12"},
      {label:"MAJ outil revue ecarts",people:["Antonin"],status:"A faire",deadline:"2026-03-12"},
      {label:"Correction des ecarts",people:["Equipe"],status:"A faire",deadline:"2026-03-13"},
      {label:"Analyse ecarts au budget",people:["Seynan","Antonin"],status:"A faire",deadline:"2026-03-13"},
    ]},
    { name:"Traitement des immos", tasks:[
      {label:"Detection immos Libeo",people:["Bastien"],status:"A faire",deadline:"2026-03-12"},
      {label:"Integration achats medicaux",people:["Elodie"],status:"A faire",deadline:"2026-03-11"},
      {label:"Integration productions immobilisees",people:["Seynan"],status:"A faire",deadline:"2026-03-11"},
      {label:"Creation fiches immos",people:["Antonin"],status:"En cours",comment:"Pas urgent"},
    ]},
    { name:"Tresorerie", tasks:[
      {label:"Integrations hebdo banques",people:["Elodie"],status:"Fait"},
      {label:"Rapprochements bancaires",people:["Elodie"],status:"Fait"},
      {label:"Integration releves CB",people:["Elodie"],status:"Fait"},
    ]},
    { name:"Operations transversales", tasks:[
      {label:"Cadrage credits baux",people:["Bastien"],status:"A faire",comment:"Pas urgent"},
      {label:"Revue des 471",people:["Elodie"],status:"Fait"},
      {label:"Revue des 580",people:["Elodie"],status:"Fait"},
      {label:"Revue des 511",people:["Elodie"],status:"A faire",comment:"Pas urgent"},
      {label:"Cadrage intragroupe",people:["Bastien"],status:"A faire",deadline:"2026-03-16"},
      {label:"Suivi emprunts",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
    ]},
    { name:"Chiffres affaires", tasks:[
      {label:"CA Intragroupe / X-Lab / Asso",people:["Elodie"],status:"Fait"},
      {label:"Cadrage CA annuel",people:["Seynan"],status:"Fait"},
    ]},
    { name:"MAJ social", tasks:[
      {label:"Integration OD Paies",people:["Elodie"],status:"Fait"},
      {label:"Saisie salaires differes",people:["Elodie"],status:"Fait"},
      {label:"Revue comptes 43",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
      {label:"Saisie Teulades",people:["Elodie"],status:"Fait"},
      {label:"Suivi ATIH",people:["Seynan","Bastien"],status:"A faire",comment:"A AUTOMATISER"},
      {label:"Suivi echeanciers dette sociale",people:["Seynan","Elodie"],status:"En cours"},
      {label:"Suivi comptes dettes differees",people:["Seynan","Elodie"],status:"En cours"},
      {label:"Outil ecart en social",people:["Seynan","Elodie"],status:"A faire"},
    ]},
    { name:"Fiscalite", tasks:[{label:"Provision CFE / TF / CVAE",people:["Elodie"],status:"A faire"}]},
  ]},
  "Situation Fevrier": { categories: [
    { name:"Traitement des achats", tasks:[
      {label:"MAJ LIBEO",people:["Daniel","Antonin"],status:"En cours",deadline:"2026-03-17"},
      {label:"Collecte grands livres",people:[],status:"En cours",deadline:"2026-03-17"},
      {label:"Mail global le 2 du mois",people:["Antonin"],status:"Fait"},
      {label:"Appel fournisseurs cibles le 5",people:["Antonin","Bastien","Daniel","Elodie"],status:"A faire"},
      {label:"Cadrage des GL",people:["Bastien","Daniel"],status:"A faire"},
      {label:"Traitement des FNP",people:["Bastien","Daniel","Elodie"],status:"A faire",deadline:"2026-03-23"},
      {label:"Revue outil de commandes",people:["Bastien","Daniel"],status:"A faire",deadline:"2026-03-25"},
      {label:"Integration achats X-LAB",people:[],status:"A faire",deadline:"2026-03-24"},
      {label:"Detection FNP sur LIBEO",people:["Antonin","Bastien","Daniel"],status:"A faire",deadline:"2026-03-24"},
      {label:"Etat elements manquants",people:[],status:"A faire"},
      {label:"Justifs associes",people:["Seynan","Bastien"],status:"A faire"},
      {label:"Info depenses engagees",people:["Seynan"],status:"A faire"},
      {label:"Etat factures fournisseurs",people:["Daniel","Antonin","Seynan","Elodie"],status:"A faire"},
      {label:"Point post cloture",people:["Daniel","Antonin","Seynan","Elodie","Florian"],status:"A faire"},
      {label:"Revision ecritures de situation",people:["Seynan"],status:"A faire",deadline:"2026-03-25"},
      {label:"MAJ outil revue ecarts",people:["Antonin"],status:"A faire",deadline:"2026-03-26"},
      {label:"Correction des ecarts",people:["Equipe"],status:"A faire",deadline:"2026-03-26"},
      {label:"Analyse ecarts au budget",people:["Seynan","Antonin"],status:"A faire",deadline:"2026-03-26"},
    ]},
    { name:"Traitement des immos", tasks:[
      {label:"Detection immos Libeo",people:["Bastien"],status:"A faire",deadline:"2026-03-24"},
      {label:"Integration achats medicaux",people:["Elodie"],status:"A faire"},
      {label:"Integration productions immobilisees",people:["Seynan"],status:"A faire"},
      {label:"Creation fiches immos",people:["Antonin"],status:"A faire"},
    ]},
    { name:"Tresorerie", tasks:[
      {label:"Integrations hebdo banques",people:["Elodie"],status:"Fait"},
      {label:"Rapprochements bancaires",people:["Elodie"],status:"En cours"},
      {label:"Integration releves CB",people:["Elodie"],status:"En cours"},
    ]},
    { name:"Operations transversales", tasks:[
      {label:"Cadrage credits baux",people:["Bastien"],status:"A faire"},
      {label:"Revue des 471",people:["Elodie"],status:"En cours"},
      {label:"Revue des 580",people:["Elodie"],status:"En cours"},
      {label:"Revue des 511",people:["Elodie"],status:"A faire",comment:"Pas urgent"},
      {label:"Cadrage intragroupe",people:["Bastien"],status:"A faire"},
      {label:"Suivi emprunts",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
    ]},
    { name:"Chiffres affaires", tasks:[
      {label:"CA Intragroupe / X-Lab / Asso",people:["Elodie"],status:"Fait"},
      {label:"Cadrage CA annuel",people:["Seynan"],status:"Fait"},
    ]},
    { name:"MAJ social", tasks:[
      {label:"Integration OD Paies",people:["Elodie"],status:"A faire",deadline:"2026-03-17"},
      {label:"Saisie salaires differes",people:["Elodie"],status:"A faire",deadline:"2026-03-17"},
      {label:"Revue comptes 43",people:["Seynan"],status:"A faire",comment:"Pas urgent"},
      {label:"Saisie Teulades",people:["Elodie"],status:"A faire",deadline:"2026-03-24"},
      {label:"Suivi ATIH",people:["Seynan","Bastien"],status:"A faire",comment:"A AUTOMATISER"},
      {label:"Suivi echeanciers dette sociale",people:["Seynan","Elodie"],status:"En cours"},
      {label:"Suivi comptes dettes differees",people:["Seynan","Elodie"],status:"En cours"},
      {label:"Outil ecart en social",people:["Seynan","Elodie"],status:"A faire"},
    ]},
    { name:"Fiscalite", tasks:[{label:"Provision CFE / TF / CVAE",people:["Elodie"],status:"A faire"}]},
  ]},
  "Mensuelle Seynan": { categories: [
    { name:"Taches mensuelles Seynan", tasks:[
      {label:"Salaires differes",people:["Elodie"],status:"A faire"},
      {label:"Rappro bancaires non traites",people:["Seynan"],status:"A faire"},
      {label:"471",people:["Seynan"],status:"A faire"},
      {label:"580",people:["Seynan"],status:"A faire"},
      {label:"Emprunts",people:["Seynan"],status:"A faire",comment:"A deleguer"},
      {label:"Analytique non affecte",people:["Seynan"],status:"A faire",comment:"A deleguer"},
      {label:"Analytique siege",people:["Seynan"],status:"A faire",comment:"A deleguer"},
      {label:"Lettrer les 486",people:["Seynan"],status:"A faire",comment:"A deleguer"},
      {label:"Fichiers des ecarts",people:["Seynan"],status:"A faire",comment:"A partager"},
      {label:"Controle de gestion",people:["Seynan"],status:"A faire"},
      {label:"Honoraires",people:["Seynan"],status:"A faire"},
      {label:"Teulades",people:["Seynan"],status:"A faire"},
      {label:"ATIH (Regul + CSPA)",people:["Seynan"],status:"A faire",comment:"Pas tous les mois"},
      {label:"Journal PAR",people:["Seynan"],status:"A faire",comment:"Pas tous les mois"},
      {label:"Controle ecarts social",people:["Seynan"],status:"A faire"},
      {label:"CSPA",people:["Seynan"],status:"A faire"},
      {label:"Achats medicaux (immos)",people:["Seynan"],status:"A faire",comment:"Simple controle"},
      {label:"Journal HAR",people:["Seynan"],status:"A faire",comment:"Pas tous les mois"},
      {label:"FNP Libeo",people:["Seynan"],status:"A faire",comment:"Simple controle"},
      {label:"FNP outil de commandes",people:["Seynan"],status:"A faire",comment:"Simple controle"},
      {label:"Preparer reunion associes",people:["Seynan"],status:"A faire"},
      {label:"Integrer HA M-1 associes",people:["Seynan"],status:"A faire"},
      {label:"Veiller ecritures CFE/TF",people:["Elodie"],status:"A faire"},
      {label:"Lettrage des 43",people:["Seynan"],status:"A faire",comment:"A deleguer"},
      {label:"Decalages de paie",people:["Seynan"],status:"A faire",comment:"En cours de delegation"},
      {label:"Intragroupe",people:["Seynan"],status:"A faire",comment:"Partage"},
      {label:"Revue X-LAB",people:["Seynan"],status:"A faire"},
      {label:"Honoraires GUETTA",people:["Seynan"],status:"A faire",comment:"Simple controle"},
      {label:"Cloturer les journaux",people:["Seynan"],status:"A faire"},
      {label:"BG 1 a 4 pour lettrer",people:["Seynan"],status:"A faire"},
    ]},
  ]},
  "Recurrentes": { categories: [
    { name:"Traitement des achats", tasks:[
      {label:"MAJ LIBEO",people:["Daniel","Antonin"],status:"A faire",comment:"Quotidienne"},
      {label:"Collecte des grands livres",people:[],status:"A faire",comment:"S1"},
      {label:"Mail global le 2 du mois",people:["Antonin"],status:"A faire",comment:"Mensuelle | S1"},
      {label:"Appel fournisseurs cibles le 5",people:["Antonin","Bastien","Daniel","Elodie"],status:"A faire",comment:"Mensuelle | S1"},
      {label:"Cadrage des GL",people:["Bastien","Daniel"],status:"A faire",comment:"Mensuelle | Fin S1"},
      {label:"Traitement des FNP",people:["Bastien","Daniel","Elodie"],status:"A faire",comment:"Mensuelle | S1-S2"},
      {label:"Revue outil de commandes",people:["Bastien","Daniel"],status:"A faire",comment:"Mensuelle | Fin S2"},
      {label:"Integration achats X-LAB",people:[],status:"A faire"},
      {label:"Detection FNP sur LIBEO",people:["Antonin","Bastien","Daniel"],status:"A faire",comment:"Mensuelle | Fin S2 - Debut S3"},
      {label:"Etat elements manquants",people:[],status:"A faire"},
      {label:"Justifs associes",people:["Seynan","Bastien"],status:"A faire",comment:"Mensuelle | Fin S3"},
      {label:"Info depenses engagees",people:["Seynan"],status:"A faire",comment:"Mensuelle | Fin S3"},
      {label:"Etat factures fournisseurs",people:["Daniel","Antonin","Seynan","Elodie"],status:"A faire",comment:"Mensuelle | S4"},
      {label:"Point post cloture",people:["Daniel","Antonin","Seynan","Elodie","Florian"],status:"A faire"},
      {label:"Revision ecritures de situation",people:["Seynan"],status:"A faire",comment:"Mensuelle | S2-S3"},
      {label:"MAJ outil revue ecarts",people:["Antonin"],status:"A faire",comment:"Mensuelle | S2-S3"},
      {label:"Correction des ecarts",people:["Equipe"],status:"A faire",comment:"Mensuelle | Fin S3 - Debut S4"},
      {label:"Analyse ecarts au budget",people:["Seynan","Antonin"],status:"A faire",comment:"Mensuelle | Debut S4"},
    ]},
    { name:"Traitement des immos", tasks:[
      {label:"Detection immos Libeo",people:["Bastien"],status:"A faire",comment:"Mensuelle | S1"},
      {label:"Integration achats medicaux",people:["Elodie"],status:"A faire",comment:"Mensuelle | S1"},
      {label:"Integration productions immobilisees",people:["Seynan"],status:"A faire",comment:"Mensuelle | S2"},
      {label:"Creation fiches immos",people:["Antonin"],status:"A faire",comment:"Mensuelle | S1 (decalage 1 mois)"},
    ]},
    { name:"Tresorerie", tasks:[
      {label:"Integrations hebdo banques",people:["Elodie"],status:"A faire",comment:"Hebdo"},
      {label:"Rapprochements bancaires",people:["Elodie"],status:"A faire",comment:"Mensuelle | Fin S1"},
      {label:"Suivi echeanciers dette sociale",people:["Seynan","Antonin"],status:"A faire",comment:"Hebdo | Points le 04, 15 et 25"},
      {label:"Suivi comptes dettes differees",people:["Seynan","Elodie"],status:"A faire",comment:"Mensuelle | S1"},
      {label:"Integration releves CB",people:["Elodie"],status:"A faire",comment:"Mensuelle | S1"},
    ]},
    { name:"Operations transversales", tasks:[
      {label:"Cadrage credits baux",people:["Bastien"],status:"A faire",comment:"Mensuelle | Debut S4"},
      {label:"Revue des 471",people:["Elodie"],status:"A faire",comment:"Hebdo"},
      {label:"Revue des 580",people:["Elodie"],status:"A faire",comment:"Hebdo"},
      {label:"Revue des 511",people:["Elodie"],status:"A faire",comment:"Hebdo"},
      {label:"Cadrage intragroupe",people:["Bastien"],status:"A faire",comment:"Mensuelle | Debut S4"},
      {label:"Suivi emprunts",people:["Seynan"],status:"A faire",comment:"Mensuelle"},
    ]},
    { name:"Chiffres affaires", tasks:[
      {label:"CA Intragroupe / X-Lab / Asso",people:["Elodie"],status:"A faire",comment:"Mensuelle | S2"},
      {label:"Cadrage CA annuel",people:["Seynan"],status:"A faire",comment:"Mensuelle | S1"},
    ]},
    { name:"MAJ social", tasks:[
      {label:"Integration OD Paies",people:["Elodie"],status:"A faire",comment:"Mensuelle | S3"},
      {label:"Saisie salaires differes",people:["Elodie"],status:"A faire",comment:"Mensuelle | S3"},
      {label:"Revue comptes 43",people:["Seynan"],status:"A faire",comment:"Mensuelle | S1 (decalage 1 mois)"},
      {label:"Cadrage OD Paies 01/01 a date",people:["Seynan"],status:"A faire",comment:"Semestrielle"},
      {label:"Saisie Teulades",people:["Elodie"],status:"A faire",comment:"Mensuelle | Fin S2 - Debut S3"},
      {label:"Suivi ATIH",people:["Seynan","Bastien"],status:"A faire",comment:"Semestrielle"},
      {label:"Outil ecart en social",people:["Seynan","Elodie"],status:"A faire",comment:"Mensuelle | Fin S3"},
    ]},
    { name:"Fiscalite", tasks:[
      {label:"Provision CFE / TF / CVAE",people:["Elodie"],status:"A faire",comment:"Mensuelle | S2"},
      {label:"Declaration TVA",people:["Elodie","Seynan"],status:"A faire",comment:"Mensuelle | S2"},
      {label:"Suivi paiement TVA",people:["Elodie"],status:"A faire",comment:"Mensuelle | Fin S4"},
      {label:"Saisie OD de TVA",people:["Daniel"],status:"A faire",comment:"Mensuelle | S4"},
      {label:"Controle TVA",people:["Seynan"],status:"A faire",comment:"Semestrielle"},
    ]},
    { name:"Administration des dossiers", tasks:[
      {label:"Cloture des journaux",people:["Seynan"],status:"A faire",comment:"Mensuelle | Debut S1"},
      {label:"Extourne des OD M-1",people:["Seynan"],status:"A faire",comment:"Mensuelle | S4"},
      {label:"Creer les factures IG",people:[],status:"A faire"},
    ]},
  ]},
  "Cloture Annuelle": { categories: [
    { name:"TRESORERIE", tasks:[
      {label:"Rappro 31/12 + releves",people:["Elodie"],status:"A faire",comment:"24/02 - 28/02"},
      {label:"Recup RB 2025 (5 comptes)",people:["Elodie"],status:"En cours"},
      {label:"Recup RB janvier 26",people:["Elodie"],status:"A faire"},
      {label:"Resolution ecarts 2025",people:["Elodie"],status:"A faire"},
      {label:"Agios a payer",people:["Elodie"],status:"A faire"},
      {label:"Lettrer 58 et 511",people:["Elodie"],status:"A faire"},
      {label:"Circularisations bancaires",people:["Elodie"],status:"A faire"},
    ]},
    { name:"EMPRUNTS", tasks:[
      {label:"Cadrage emprunts",people:["Seynan"],status:"A faire"},
      {label:"Cadrage emprunts OC",people:["Seynan","Florian"],status:"A faire"},
      {label:"Interets courus",people:["Seynan"],status:"A faire"},
      {label:"Cadrage credits baux",people:["Florian","Seynan","Bastien"],status:"En cours"},
    ]},
    { name:"FOURNISSEURS", tasks:[
      {label:"Remplacer/documenter FNP",people:["Elodie","Daniel","Bastien"],status:"A faire"},
      {label:"Dossier GL fournisseurs",people:["Daniel","Antonin"],status:"A faire"},
      {label:"Suivi demandes GL",people:["Daniel","Antonin","Bastien"],status:"A faire"},
      {label:"Justifier comptes frs",people:["Elodie","Daniel","Bastien"],status:"A faire"},
      {label:"Documenter CCA",people:["Elodie","Daniel","Bastien"],status:"A faire"},
      {label:"Verif stocks 2025",people:["Seynan"],status:"A faire"},
      {label:"Methode valorisation stocks",people:["Florian","Seynan","Gregory"],status:"A faire",comment:"Cemedis + E2P"},
    ]},
    { name:"CLIENTS", tasks:[
      {label:"Cadrage creances / clients douteux",people:[],status:"A faire",comment:"A determiner"},
      {label:"FAE/AAE -> factures ventes",people:["Bastien","Seynan"],status:"A faire"},
      {label:"Provisions et ajustements",people:["Seynan"],status:"A faire",comment:"E2P"},
      {label:"Cadrage CA + doc",people:["Florian","Seynan"],status:"A faire",comment:"Cemedis + E2P"},
      {label:"Eclatement CA associations",people:["Elodie"],status:"A faire"},
    ]},
    { name:"IMMOBILISATIONS", tasks:[
      {label:"Balance immo vs Sage",people:["Bastien","Seynan"],status:"A faire"},
      {label:"Dernieres immos (TMC)",people:[],status:"A faire",comment:"E2P"},
      {label:"Factures immos 2025",people:["Bastien","Seynan"],status:"A faire"},
      {label:"Dotations amortissements",people:["Bastien","Seynan"],status:"A faire"},
      {label:"Etats immos et GL",people:["Seynan"],status:"A faire"},
      {label:"Impairment test immos fi",people:["Florian","Seynan"],status:"A faire"},
    ]},
    { name:"SOCIAL", tasks:[
      {label:"Livres de paie + recap",people:["Seynan","Elodie"],status:"A faire",comment:"E2P"},
      {label:"Provisions CP",people:["Seynan","Elodie"],status:"A faire",comment:"E2P"},
      {label:"Nettoyage comptes 43",people:["Seynan","Elodie"],status:"A faire"},
      {label:"Documentation travaux",people:["Seynan","Elodie"],status:"A faire",comment:"E2P"},
      {label:"CAP / PAR social",people:["Seynan","Elodie"],status:"A faire"},
      {label:"Suivi effectifs",people:["Seynan","Elodie"],status:"A faire"},
      {label:"Declaration TSS",people:["Seynan","Elodie"],status:"A faire"},
    ]},
    { name:"FISCALITE", tasks:[
      {label:"Controle TVA + Recap 2025",people:["Seynan"],status:"A faire"},
      {label:"CAP / PAR fiscal",people:["Seynan"],status:"A faire"},
      {label:"Declaration groupe TVA",people:[],status:"A faire"},
    ]},
    { name:"CAPITAUX PROPRES", tasks:[
      {label:"Affectation du resultat",people:["Bastien"],status:"A faire"},
      {label:"Provisions pour risques",people:[],status:"A faire",comment:"Cemedis + avocat"},
    ]},
  ]},
};

function buildTabs(delta, added) {
  const tabs = JSON.parse(JSON.stringify(INIT));
  if (delta) {
    Object.entries(delta).forEach(([key, patch]) => {
      const parts = key.split("::");
      if (parts.length < 3) return;
      const tabName = parts[0], ci = +parts[1], ti = +parts[2];
      // tâche principale (4 parties) ou sous-tâche (5 parties) ou sous-sous-tâche (6 parties)
      const task = tabs[tabName] && tabs[tabName].categories[ci] && tabs[tabName].categories[ci].tasks[ti];
      if (parts.length === 4 && task) {
        if (patch.status !== undefined) task.status = patch.status;
        if (patch.deadline !== undefined) task.deadline = patch.deadline;
        if (patch.dateStart !== undefined) task.dateStart = patch.dateStart;
        if (patch.comment !== undefined) task.comment = patch.comment;
      } else if (parts.length === 5 && task) {
        const si = +parts[3];
        if (!task.subtasks) task.subtasks = [];
        if (!task.subtasks[si]) task.subtasks[si] = {label:"",people:[],status:"A faire"};
        const sub = task.subtasks[si];
        if (patch.status !== undefined) sub.status = patch.status;
        if (patch.deadline !== undefined) sub.deadline = patch.deadline;
        if (patch.dateStart !== undefined) sub.dateStart = patch.dateStart;
        if (patch.comment !== undefined) sub.comment = patch.comment;
        if (patch.label !== undefined) sub.label = patch.label;
        if (patch.people !== undefined) sub.people = patch.people;
        if (patch._deleted !== undefined) sub._deleted = patch._deleted;
      } else if (parts.length === 6 && task) {
        const si = +parts[3], ssi = +parts[4];
        if (!task.subtasks) task.subtasks = [];
        if (!task.subtasks[si]) task.subtasks[si] = {label:"",people:[],status:"A faire",subtasks:[]};
        if (!task.subtasks[si].subtasks) task.subtasks[si].subtasks = [];
        if (!task.subtasks[si].subtasks[ssi]) task.subtasks[si].subtasks[ssi] = {label:"",people:[],status:"A faire"};
        const ssub = task.subtasks[si].subtasks[ssi];
        if (patch.status !== undefined) ssub.status = patch.status;
        if (patch.deadline !== undefined) ssub.deadline = patch.deadline;
        if (patch.dateStart !== undefined) ssub.dateStart = patch.dateStart;
        if (patch.comment !== undefined) ssub.comment = patch.comment;
        if (patch.label !== undefined) ssub.label = patch.label;
        if (patch.people !== undefined) ssub.people = patch.people;
        if (patch._deleted !== undefined) ssub._deleted = patch._deleted;
      }
    });
  }
  if (added) {
    // Trier les clés pour que les __sub__ soient appliqués après les tâches parentes
    const entries = Object.entries(added).sort(([a],[b])=>{
      const aIsTab = !a.startsWith("__");
      const bIsTab = !b.startsWith("__");
      if(aIsTab && !bIsTab) return -1;
      if(!aIsTab && bIsTab) return 1;
      return 0;
    });
    entries.forEach(([k, v]) => {
      // Tâches normales ajoutées
      if (!k.startsWith("__")) {
        if (Array.isArray(v)) v.forEach(e => { if (tabs[k]) tabs[k].categories[e.catIdx].tasks.push({...e.task}); });
        return;
      }
      // Sous-tâches ajoutées via onSubTaskAdd
      if (k.startsWith("__sub__") && v && v.type==="subtask") {
        const {tabName,ci,ti,si,label} = v;
        const task = tabs[tabName]&&tabs[tabName].categories[ci]&&tabs[tabName].categories[ci].tasks[ti];
        if (!task) return;
        if (!task.subtasks) task.subtasks = [];
        const newSub = {label, people:[], status:"A faire"};
        if (si===null || si===undefined) {
          task.subtasks.push(newSub);
        } else {
          if (!task.subtasks[si]) task.subtasks[si] = {label:"",people:[],status:"A faire",subtasks:[]};
          if (!task.subtasks[si].subtasks) task.subtasks[si].subtasks = [];
          task.subtasks[si].subtasks.push(newSub);
        }
      }
    });
  }
  return tabs;
}

// ── Small components ──────────────────────────────────────────────────────────
function Avatar({u, size=32}) {
  const usr = typeof u === "string" ? (USERS.find(x => x.name === u) || {name:u, color:"#aaa", initials:u.slice(0,2).toUpperCase()}) : u;
  return <div title={usr.name} style={{width:size,height:size,borderRadius:"50%",background:usr.color,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:size*0.3,flexShrink:0}}>{usr.initials||(usr.name&&usr.name.slice(0,2).toUpperCase())}</div>;
}
function ProgBar({pct, h=6, color="#2ec4b6"}) {
  return <div style={{flex:1,height:h,background:"#e9ecef",borderRadius:4,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:color,borderRadius:4,transition:"width 0.4s"}}/></div>;
}
function StatusPill({status, onChange}) {
  const col = SC[sc(status)];
  return <select value={status} onChange={e => onChange(e.target.value)} style={{padding:"2px 7px",borderRadius:12,border:"1px solid "+col.border,fontSize:"0.7rem",fontWeight:600,cursor:"pointer",background:col.bg,color:col.text,appearance:"none",WebkitAppearance:"none",textAlign:"center",minWidth:72}}>
    <option value="A faire">A faire</option><option value="En cours">En cours</option><option value="Fait">Fait</option>
  </select>;
}
function ConfirmModal({label, dark, onConfirm, onCancel}) {
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onCancel}>
    <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:14,padding:"24px 28px",maxWidth:380,width:"90%",boxShadow:"0 12px 40px rgba(0,0,0,0.22)"}}>
      <div style={{fontSize:"1.5rem",marginBottom:10,textAlign:"center"}}>🗑️</div>
      <div style={{fontWeight:700,fontSize:"0.95rem",color:txt,marginBottom:6,textAlign:"center"}}>Supprimer cette tache ?</div>
      <div style={{fontSize:"0.82rem",color:muted,marginBottom:20,textAlign:"center",wordBreak:"break-word"}}>{"\""+label+"\""}</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={onConfirm} style={{flex:1,padding:"10px 0",background:"#e63946",color:"white",border:"none",borderRadius:9,cursor:"pointer",fontWeight:700}}>Supprimer</button>
        <button onClick={onCancel} style={{flex:1,padding:"10px 0",background:"transparent",border:"1px solid "+bdr,borderRadius:9,cursor:"pointer",color:muted}}>Annuler</button>
      </div>
    </div>
  </div>;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}) {
  return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,#f5f7fa,#e8ecfd)"}}>
    <div style={{background:"white",borderRadius:20,padding:"40px 32px",boxShadow:"0 10px 40px rgba(67,97,238,0.15)",textAlign:"center",maxWidth:480,width:"92%"}}>
      <div style={{fontSize:"3rem",marginBottom:8}}>🦷</div>
      <h1 style={{fontSize:"1.6rem",color:"#4361ee",margin:"0 0 4px"}}>CEMEDIS</h1>
      <p style={{color:"#6c757d",fontSize:"0.88rem",marginBottom:28}}>Suivi des clotures</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {USERS.map(u => <button key={u.name} onClick={()=>onLogin(u)}
          style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderRadius:14,border:"2px solid #dee2e6",background:"white",cursor:"pointer",textAlign:"left"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#4361ee";e.currentTarget.style.transform="translateY(-2px)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#dee2e6";e.currentTarget.style.transform="none";}}>
          <Avatar u={u} size={40}/>
          <div><div style={{fontWeight:600,fontSize:"0.9rem",color:"#212529"}}>{u.name}</div><div style={{fontSize:"0.72rem",color:"#6c757d"}}>{u.role}</div></div>
        </button>)}
      </div>
    </div>
  </div>;
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarView({tabs, dark, personFilter, statusFilter}) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [tip, setTip] = useState(null);
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const allTasks = useMemo(() => {
    const r = [];
    Object.entries(tabs).forEach(([tn, td]) => td.categories.forEach((cat, ci) => cat.tasks.forEach((task, ti) => {
      if (!task.deadline) return;
      if (personFilter && !task.people.includes(personFilter)) return;
      if (statusFilter && sc(task.status) !== sc(statusFilter)) return;
      r.push({...task, tabName:tn, catName:cat.name, ci, ti});
    })));
    return r;
  }, [tabs, personFilter, statusFilter]);
  const byDay = useMemo(() => {
    const m = {};
    allTasks.forEach(t => { if (!m[t.deadline]) m[t.deadline] = []; m[t.deadline].push(t); });
    return m;
  }, [allTasks]);
  const dim = new Date(calYear, calMonth+1, 0).getDate();
  const fd = (new Date(calYear, calMonth, 1).getDay()+6) % 7;
  const isToday = d => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
  const prevM = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const nextM = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };
  return <div style={{padding:"16px 20px"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <button onClick={prevM} style={{background:"none",border:"1px solid "+bdr,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:txt}}>{"<"}</button>
      <h2 style={{margin:0,fontSize:"1.1rem",fontWeight:600,textTransform:"capitalize",color:"#4361ee"}}>{new Date(calYear,calMonth,1).toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}</h2>
      <button onClick={nextM} style={{background:"none",border:"1px solid "+bdr,borderRadius:8,padding:"6px 12px",cursor:"pointer",color:txt}}>{">"}</button>
      <span style={{marginLeft:"auto",fontSize:"0.78rem",color:muted}}>{allTasks.length} taches avec echeance</span>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
      {["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map(d => <div key={d} style={{textAlign:"center",fontSize:"0.72rem",fontWeight:600,color:muted,padding:"4px 0"}}>{d}</div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
      {Array.from({length:fd}).map((_,i) => <div key={"e"+i}/>)}
      {Array.from({length:dim}).map((_,i) => {
        const day = i+1, iso = calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
        const tasks = byDay[iso] || [], isWE = ((fd+i)%7) >= 5;
        return <div key={day} onMouseEnter={tasks.length ? e => setTip({tasks,iso,rect:e.currentTarget.getBoundingClientRect()}) : undefined} onMouseLeave={() => setTip(null)}
          style={{minHeight:72,padding:"5px 6px",background:isToday(day)?"#4361ee":tasks.length?(dark?"#1e2a4a":"#eef1ff"):card,borderRadius:8,border:"1px solid "+(isToday(day)?"#4361ee":bdr),cursor:tasks.length?"pointer":"default"}}>
          <div style={{fontSize:"0.78rem",fontWeight:isToday(day)?700:500,color:isToday(day)?"white":isWE?muted:txt,marginBottom:3}}>{day}</div>
          {tasks.slice(0,3).map((t,ti) => { const col=SC[sc(t.status)]; return <div key={ti} style={{fontSize:"0.6rem",padding:"1px 4px",borderRadius:4,background:col.bg,color:col.text,marginBottom:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{t.label}</div>; })}
          {tasks.length > 3 && <div style={{fontSize:"0.58rem",color:muted}}>+{tasks.length-3}</div>}
        </div>;
      })}
    </div>
    {tip && <div style={{position:"fixed",zIndex:3000,top:Math.min(tip.rect.bottom+6,window.innerHeight-220),left:Math.max(4,Math.min(tip.rect.left,window.innerWidth-300)),background:card,border:"1px solid "+bdr,borderRadius:12,padding:"12px 14px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",minWidth:260,maxWidth:300,pointerEvents:"none"}}>
      <div style={{fontWeight:600,fontSize:"0.8rem",marginBottom:8,color:"#4361ee"}}>{fmtDate(tip.iso)}</div>
      {tip.tasks.map((t,i) => { const col=SC[sc(t.status)]; return <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,padding:"5px 0",borderBottom:"1px solid "+bdr}}><div style={{width:7,height:7,borderRadius:"50%",background:col.border,flexShrink:0,marginTop:4}}/><div style={{flex:1}}><div style={{fontSize:"0.78rem",fontWeight:500,color:txt}}>{t.label}</div><div style={{fontSize:"0.66rem",color:muted}}>{t.tabName}</div></div><span style={{fontSize:"0.62rem",padding:"2px 7px",borderRadius:10,background:col.bg,color:col.text,fontWeight:600,flexShrink:0}}>{t.status}</span></div>; })}
    </div>}
  </div>;
}

// ── Transversal ───────────────────────────────────────────────────────────────
function TransversalView({tabs, dark, personFilter}) {
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const tabNames = Object.keys(tabs);
  const tabStats = useMemo(() => Object.entries(tabs).map(([tn,td]) => {
    let f=0,e=0,a=0;
    td.categories.forEach(c => c.tasks.forEach(t => { if (personFilter && !t.people.includes(personFilter)) return; const s=sc(t.status); if(s==="fait")f++;else if(s==="encours")e++;else a++; }));
    const tot=f+e+a; return {tabName:tn,fait:f,encours:e,afaire:a,total:tot,pct:tot>0?Math.round(f/tot*100):0};
  }), [tabs, personFilter]);
  const personStats = useMemo(() => ALL_PEOPLE.map(person => {
    const bt={}; let tF=0,tA=0;
    Object.entries(tabs).forEach(([tn,td]) => { let f=0,tot=0; td.categories.forEach(c => c.tasks.forEach(t => { if (!t.people.includes(person)) return; tot++;tA++; if(sc(t.status)==="fait"){f++;tF++;} })); if(tot>0) bt[tn]={fait:f,total:tot}; });
    return {person,byTab:bt,totalF:tF,totalAll:tA,pct:tA>0?Math.round(tF/tA*100):0};
  }).filter(p => p.totalAll > 0), [tabs, personFilter]);
  return <div style={{padding:"16px 20px",display:"flex",flexDirection:"column",gap:20}}>
    <div style={{background:card,borderRadius:14,padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
      <h3 style={{margin:"0 0 16px",fontSize:"1rem",color:"#4361ee"}}>{"Avancement par onglet"+(personFilter?" - "+personFilter:"")}</h3>
      {tabStats.map(ts => <div key={ts.tabName} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        <span style={{width:160,fontSize:"0.8rem",fontWeight:500,color:txt,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ts.tabName}</span>
        <ProgBar pct={ts.pct} h={10} color={ts.pct===100?"#2ec4b6":"#4361ee"}/>
        <span style={{fontSize:"0.72rem",color:muted,width:36,textAlign:"right",flexShrink:0}}>{ts.pct}%</span>
      </div>)}
    </div>
    <div style={{background:card,borderRadius:14,padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflowX:"auto"}}>
      <h3 style={{margin:"0 0 16px",fontSize:"1rem",color:"#4361ee"}}>Matrice personnes x onglets</h3>
      <table style={{borderCollapse:"collapse",width:"100%",fontSize:"0.75rem"}}>
        <thead><tr>
          <th style={{textAlign:"left",padding:"6px 10px",color:muted,fontWeight:600,borderBottom:"2px solid "+bdr,width:100}}>Personne</th>
          {tabNames.map(t => <th key={t} style={{textAlign:"center",padding:"6px 8px",color:muted,fontWeight:600,borderBottom:"2px solid "+bdr,minWidth:90}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{t}</div></th>)}
          <th style={{textAlign:"center",padding:"6px 8px",color:"#4361ee",fontWeight:700,borderBottom:"2px solid "+bdr,minWidth:80}}>Total</th>
        </tr></thead>
        <tbody>{personStats.map(ps => <tr key={ps.person} style={{borderBottom:"1px solid "+bdr}}>
          <td style={{padding:"8px 10px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><Avatar u={ps.person} size={24}/><span style={{fontWeight:600,color:txt}}>{ps.person}</span></div></td>
          {tabNames.map(t => { const d=ps.byTab[t]; if(!d) return <td key={t} style={{textAlign:"center",color:muted,padding:"8px"}}>-</td>; const p=Math.round(d.fait/d.total*100); const col=p===100?SC.fait:p>0?SC.encours:SC.afaire; return <td key={t} style={{textAlign:"center",padding:"6px 8px"}}><div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:"0.68rem",padding:"2px 8px",borderRadius:10,background:col.bg,color:col.text,fontWeight:600}}>{d.fait+"/"+d.total}</span><ProgBar pct={p} h={4} color={col.border}/></div></td>; })}
          <td style={{textAlign:"center",padding:"8px"}}><span style={{fontWeight:700,color:"#4361ee",fontSize:"0.8rem"}}>{ps.pct}%</span><div style={{fontSize:"0.65rem",color:muted}}>{ps.totalF+"/"+ps.totalAll}</div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div style={{background:card,borderRadius:14,padding:"20px 24px",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
      <h3 style={{margin:"0 0 16px",fontSize:"1rem",color:"#e63946"}}>Retards et urgences</h3>
      {(() => {
        const urgent = [];
        Object.entries(tabs).forEach(([tn,td]) => td.categories.forEach((cat,ci) => cat.tasks.forEach((t,ti) => {
          if (!t.deadline) return;
          if (personFilter && !t.people.includes(personFilter)) return;
          if (isOD(t.deadline,t.status) || isDS(t.deadline,t.status)) urgent.push({...t,tabName:tn,catName:cat.name,ci,ti});
        })));
        urgent.sort((a,b) => a.deadline.localeCompare(b.deadline));
        if (!urgent.length) return <p style={{color:muted,fontSize:"0.82rem",margin:0}}>Aucun retard detecte.</p>;
        return urgent.map((t,i) => { const od=isOD(t.deadline,t.status); return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:od?(dark?"#3a1520":"#fde8ea"):(dark?"#3a2a10":"#fef3e6"),marginBottom:6}}><span>{od?"🔴":"🟠"}</span><div style={{flex:1}}><div style={{fontWeight:600,fontSize:"0.82rem",color:txt}}>{t.label}</div><div style={{fontSize:"0.68rem",color:muted}}>{t.tabName+" - "+t.catName}</div></div><div style={{display:"flex",gap:3}}>{t.people.map(p=><Avatar key={p} u={p} size={20}/>)}</div><span style={{fontSize:"0.72rem",fontWeight:700,color:od?"#e63946":"#b97a2e",flexShrink:0}}>{fmtDate(t.deadline)}</span></div>; });
      })()}
    </div>
  </div>;
}

// ── Gantt ─────────────────────────────────────────────────────────────────────
function GanttPopover({task, dark, onSave, onClose}) {
  const [start, setStart] = useState(task.dateStart||task.deadline||"");
  const [end, setEnd] = useState(task.deadline||task.dateStart||"");
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const dur = start&&end&&start<=end ? Math.round((new Date(end+"T00:00:00")-new Date(start+"T00:00:00"))/864e5)+1 : null;
  return <div style={{position:"fixed",inset:0,zIndex:5000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.4)"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:14,padding:"20px 22px",boxShadow:"0 12px 40px rgba(0,0,0,0.22)",minWidth:300,maxWidth:340}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <span style={{fontWeight:700,fontSize:"0.9rem",color:"#4361ee",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240}}>{task.label}</span>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"1.2rem"}}>x</button>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:"0.68rem",fontWeight:600,color:muted,marginBottom:6}}>Duree rapide</div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[[1,"1 j"],[3,"3 j"],[5,"1 sem"],[10,"2 sem"],[20,"1 mois"]].map(([d,l]) => <button key={d} onClick={()=>{const s=start||new Date().toISOString().slice(0,10);setStart(s);setEnd(addDaysG(s,d-1));}} style={{padding:"4px 10px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:txt,cursor:"pointer",fontSize:"0.74rem"}}>{l}</button>)}
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <div style={{flex:1}}><label style={{fontSize:"0.7rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Debut</label><input type="date" value={start} onChange={e=>{setStart(e.target.value);if(e.target.value>end)setEnd(e.target.value);}} style={{width:"100%",padding:"7px 9px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.8rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box",outline:"none"}}/></div>
        <div style={{flex:1}}><label style={{fontSize:"0.7rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Fin</label><input type="date" value={end} onChange={e=>{setEnd(e.target.value);if(e.target.value<start)setStart(e.target.value);}} style={{width:"100%",padding:"7px 9px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.8rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box",outline:"none"}}/></div>
      </div>
      <div style={{fontSize:"0.72rem",color:muted,marginBottom:14,textAlign:"center"}}>{dur!==null?dur+" jour"+(dur>1?"s":"")+" ("+fmtDate(start)+" -> "+fmtDate(end)+")":"Dates invalides"}</div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>{if(start&&end){const s2=start<=end?start:end;const e2=start<=end?end:start;onSave(s2,e2);}}} style={{flex:1,padding:"9px 0",background:"#4361ee",color:"white",border:"none",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:"0.84rem"}}>Appliquer</button>
        <button onClick={onClose} style={{padding:"9px 14px",background:"transparent",border:"1px solid "+bdr,borderRadius:9,cursor:"pointer",color:muted,fontSize:"0.84rem"}}>Annuler</button>
      </div>
    </div>
  </div>;
}

const G_DW=32, G_LW=220, G_RH=32, G_HW=7;
function GanttView({tabs, dark, personFilter, validations, onUpdateTaskDates}) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [zoom, setZoom] = useState(1);
  const [viewStart, setViewStart] = useState(() => { const d=new Date(today); d.setDate(d.getDate()-3); return d; });
  const [collapsed, setCollapsed] = useState({});
  const [tip, setTip] = useState(null);
  const [popover, setPopover] = useState(null);
  const drag = useRef(null), scrollRef = useRef(null);
  const DAY_W = G_DW*zoom, VIEW_DAYS = Math.round(90/zoom);
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const shiftDays = n => setViewStart(p => { const d=new Date(p); d.setDate(d.getDate()+n); return d; });
  const goToday = () => { const d=new Date(today); d.setDate(d.getDate()-3); setViewStart(d); };
  const onWheel = useCallback(e => { if (!e.ctrlKey&&!e.metaKey) return; e.preventDefault(); setZoom(z=>Math.max(0.4,Math.min(3,+(z+(e.deltaY<0?0.15:-0.15)).toFixed(2)))); }, []);
  const days = useMemo(() => Array.from({length:VIEW_DAYS},(_,i)=>{const d=new Date(viewStart);d.setDate(d.getDate()+i);return d;}), [viewStart,VIEW_DAYS]);
  const offIso = iso => { const d=new Date(iso+"T00:00:00"); d.setHours(0,0,0,0); return Math.round((d-viewStart)/864e5); };
  const todayOff = Math.round((today-viewStart)/864e5);
  const hierarchy = useMemo(() => Object.entries(tabs).map(([tn,td]) => {
    const cats = td.categories.map((cat,ci) => {
      const tasks = cat.tasks.map((task,ti) => {
        if (!task.deadline && !task.dateStart) return null;
        // FIX: n'exclure que les tâches qui ont des responsables assignés ET dont le filtre personne ne correspond pas
        // Les tâches sans responsable (people:[]) sont toujours affichées
        if (personFilter && task.people.length > 0 && !task.people.includes(personFilter)) return null;
        const key=tn+"::"+ci+"::"+ti, tv=validations[key]||{};
        const dc=task.people.length>0?task.people.filter(p=>tv[p]).length:(sc(task.status)==="fait"?1:0);
        const tot=task.people.length>0?task.people.length:1;
        return {...task,key,taskVal:tv,doneCount:dc,total:tot,ci,ti,tabName:tn,catName:cat.name,dateStart:task.dateStart||task.deadline,dateEnd:task.deadline||task.dateStart};
      }).filter(Boolean);
      return {name:cat.name,ci,tasks};
    }).filter(c=>c.tasks.length>0);
    return {tabName:tn,cats};
  }).filter(t=>t.cats.length>0), [tabs,personFilter,validations]);
  const monthGroups = useMemo(() => {
    const g=[];
    days.forEach(d=>{const key=d.getFullYear()+"-"+d.getMonth();if(!g.length||g[g.length-1].key!==key)g.push({key,label:d.toLocaleDateString("fr-FR",{month:"long",year:"numeric"}),count:1});else g[g.length-1].count++;});
    return g;
  }, [days]);
  const onDragStart = (e,task,type) => { e.stopPropagation(); drag.current={type,task,startX:e.clientX,origStart:task.dateStart,origEnd:task.dateEnd}; window.addEventListener("mousemove",onDragMove); window.addEventListener("mouseup",onDragEnd); document.body.style.userSelect="none"; document.body.style.cursor=type==="move"?"grabbing":"ew-resize"; };
  const onDragMove = useCallback(e => { if(!drag.current)return; const{type,task,startX,origStart,origEnd}=drag.current; const delta=Math.round((e.clientX-startX)/DAY_W); if(delta===0)return; let ns=origStart,ne=origEnd; if(type==="move"){ns=addDaysG(origStart,delta);ne=addDaysG(origEnd,delta);}if(type==="left")ns=clampIsoG(addDaysG(origStart,delta),null,origEnd);if(type==="right")ne=clampIsoG(addDaysG(origEnd,delta),origStart,null);if(ns!==task.dateStart||ne!==task.dateEnd)onUpdateTaskDates(task.tabName,task.ci,task.ti,ns,ne); }, [DAY_W,onUpdateTaskDates]);
  const onDragEnd = useCallback(() => { drag.current=null; window.removeEventListener("mousemove",onDragMove); window.removeEventListener("mouseup",onDragEnd); document.body.style.userSelect=""; document.body.style.cursor=""; }, [onDragMove]);
  return <div style={{padding:"14px 20px",display:"flex",flexDirection:"column",gap:10,height:"100%"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",flexShrink:0}}>
      <button onClick={()=>shiftDays(-Math.round(VIEW_DAYS/2))} style={{background:"none",border:"1px solid "+bdr,borderRadius:8,padding:"5px 12px",cursor:"pointer",color:txt,fontWeight:700}}>{"<<"}</button>
      <button onClick={()=>shiftDays(-7)} style={{background:"none",border:"1px solid "+bdr,borderRadius:8,padding:"5px 11px",cursor:"pointer",color:txt,fontWeight:700}}>{"<"}</button>
      <button onClick={goToday} style={{background:"#4361ee",color:"white",border:"none",borderRadius:8,padding:"5px 13px",cursor:"pointer",fontSize:"0.78rem",fontWeight:600}}>Aujourd&#39;hui</button>
      <button onClick={()=>shiftDays(7)} style={{background:"none",border:"1px solid "+bdr,borderRadius:8,padding:"5px 11px",cursor:"pointer",color:txt,fontWeight:700}}>{">"}</button>
      <button onClick={()=>shiftDays(Math.round(VIEW_DAYS/2))} style={{background:"none",border:"1px solid "+bdr,borderRadius:8,padding:"5px 12px",cursor:"pointer",color:txt,fontWeight:700}}>{">>"}</button>
      <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:8,background:dark?"#1e2a4a":"#f0f2f8",borderRadius:10,padding:"4px 10px",border:"1px solid "+bdr}}>
        <button onClick={()=>setZoom(z=>Math.max(0.4,+(z-0.2).toFixed(2)))} style={{background:"none",border:"none",cursor:"pointer",color:txt,fontSize:"1rem",padding:"0 2px"}}>-</button>
        <span style={{fontSize:"0.72rem",color:muted,width:36,textAlign:"center"}}>{Math.round(zoom*100)+"%"}</span>
        <button onClick={()=>setZoom(z=>Math.min(3,+(z+0.2).toFixed(2)))} style={{background:"none",border:"none",cursor:"pointer",color:txt,fontSize:"1rem",padding:"0 2px"}}>+</button>
      </div>
      <span style={{fontSize:"0.68rem",color:muted}}>Ctrl+molette | Drag bords | Double-clic</span>
      <div style={{marginLeft:"auto",display:"flex",gap:10,fontSize:"0.72rem",color:muted,flexWrap:"wrap"}}>
        {[["#2ec4b6","Fait"],["#4361ee","A faire"],["#f4a261","Urgent"],["#e63946","Retard"]].map(([c,l])=><div key={l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:7,borderRadius:2,background:c}}/>{l}</div>)}
      </div>
    </div>
    <div ref={scrollRef} onWheel={onWheel} style={{background:card,borderRadius:14,boxShadow:"0 2px 12px rgba(0,0,0,0.06)",overflowX:"auto",overflowY:"auto",flex:1}}>
      <div style={{minWidth:G_LW+DAY_W*VIEW_DAYS,position:"relative"}}>
        <div style={{position:"sticky",top:0,zIndex:20,background:card}}>
          <div style={{display:"flex",borderBottom:"1px solid "+bdr}}>
            <div style={{width:G_LW,flexShrink:0,borderRight:"1px solid "+bdr}}/>
            {monthGroups.map(g=><div key={g.key} style={{width:g.count*DAY_W,flexShrink:0,padding:"4px 8px",fontSize:"0.7rem",fontWeight:700,color:"#4361ee",textTransform:"capitalize",borderRight:"1px solid "+bdr,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{g.label}</div>)}
          </div>
          <div style={{display:"flex",borderBottom:"2px solid "+bdr}}>
            <div style={{width:G_LW,flexShrink:0,padding:"5px 14px",fontSize:"0.68rem",fontWeight:600,color:muted,borderRight:"1px solid "+bdr}}>Tache</div>
            {days.map((d,i)=>{const isWE=d.getDay()===0||d.getDay()===6,isTod=i===todayOff;return <div key={i} style={{width:DAY_W,flexShrink:0,textAlign:"center",padding:"3px 0",fontSize:"0.6rem",fontWeight:isTod?700:400,color:isTod?"#4361ee":isWE?muted:txt,background:isTod?"#eef1ff":isWE?(dark?"#1e1e3a":"#f9f9fb"):"transparent",borderRight:"1px solid "+bdr+"22",overflow:"hidden"}}><div>{d.getDate()}</div>{zoom>=1&&<div style={{fontSize:"0.5rem",color:muted}}>{d.toLocaleDateString("fr-FR",{weekday:"short"}).slice(0,3)}</div>}</div>;})}
          </div>
        </div>
        {hierarchy.length===0&&<div style={{padding:"40px",textAlign:"center",color:muted}}>{"Aucune tache avec dates"+(personFilter?" pour "+personFilter:"")+"."}</div>}
        {hierarchy.map(({tabName,cats})=>{
          const isCol=collapsed[tabName];
          return <div key={tabName}>
            <div style={{display:"flex",background:dark?"#1e2a4a":"#e8ecfd",borderBottom:"1px solid "+bdr,borderTop:"1px solid "+bdr}}>
              <div onClick={()=>setCollapsed(p=>({...p,[tabName]:!p[tabName]}))} style={{width:G_LW,flexShrink:0,padding:"6px 12px",fontSize:"0.78rem",fontWeight:700,color:"#4361ee",borderRight:"1px solid "+bdr,cursor:"pointer",display:"flex",alignItems:"center",gap:6,userSelect:"none"}}><span>{isCol?">":"v"}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tabName}</span></div>
              <div style={{flex:1,position:"relative"}}>{todayOff>=0&&todayOff<VIEW_DAYS&&<div style={{position:"absolute",left:todayOff*DAY_W+DAY_W/2,top:0,bottom:0,width:2,background:"#4361ee33",pointerEvents:"none"}}/>}</div>
            </div>
            {!isCol&&cats.map(({name:catName,ci,tasks})=><div key={ci}>
              <div style={{display:"flex",background:dark?"#161e36":"#f4f6fb",borderBottom:"1px solid "+bdr+"22"}}>
                <div style={{width:G_LW,flexShrink:0,padding:"4px 12px 4px 24px",fontSize:"0.72rem",fontWeight:600,color:muted,borderRight:"1px solid "+bdr,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{"> "+catName}</div>
                <div style={{flex:1,height:24,position:"relative"}}>{todayOff>=0&&todayOff<VIEW_DAYS&&<div style={{position:"absolute",left:todayOff*DAY_W+DAY_W/2,top:0,bottom:0,width:1,background:"#4361ee22",pointerEvents:"none"}}/>}</div>
              </div>
              {tasks.slice().sort((a,b)=>a.dateStart.localeCompare(b.dateStart)).map((task,ti)=>{
                const offS=offIso(task.dateStart),offE=offIso(task.dateEnd),inView=offE>=0&&offS<VIEW_DAYS;
                const visS=Math.max(offS,0),visE=Math.min(offE,VIEW_DAYS-1),barL=visS*DAY_W,barW=(visE-visS+1)*DAY_W-4;
                const s=sc(task.status),pct=Math.round(task.doneCount/task.total*100);
                const od=isOD(task.dateEnd,task.status),ds=isDS(task.dateEnd,task.status);
                const barColor=s==="fait"?"#2ec4b6":od?"#e63946":ds?"#f4a261":"#4361ee";
                return <div key={ti} style={{display:"flex",borderBottom:"1px solid "+bdr+"22",height:G_RH}} onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(255,255,255,0.03)":"rgba(67,97,238,0.04)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{width:G_LW,flexShrink:0,padding:"0 10px 0 32px",borderRight:"1px solid "+bdr,display:"flex",alignItems:"center",gap:6,overflow:"hidden"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:barColor,flexShrink:0}}/>
                    <span style={{fontSize:"0.74rem",color:s==="fait"?muted:txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:s==="fait"?"line-through":"none"}} title={task.label}>{task.label}</span>
                  </div>
                  <div style={{flex:1,position:"relative",overflow:"hidden"}}>
                    {days.map((d,i)=>{const isWE=d.getDay()===0||d.getDay()===6;return isWE?<div key={i} style={{position:"absolute",left:i*DAY_W,top:0,bottom:0,width:DAY_W,background:dark?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.025)",pointerEvents:"none"}}/>:null;})}
                    {todayOff>=0&&todayOff<VIEW_DAYS&&<div style={{position:"absolute",left:todayOff*DAY_W+DAY_W/2,top:0,bottom:0,width:2,background:"#4361ee44",zIndex:1,pointerEvents:"none"}}/>}
                    {!inView&&offS<0&&<div style={{position:"absolute",left:4,top:"50%",transform:"translateY(-50%)",fontSize:"0.7rem",color:muted,opacity:0.5}}>{"< "+fmtDate(task.dateStart)}</div>}
                    {!inView&&offS>=VIEW_DAYS&&<div style={{position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",fontSize:"0.7rem",color:muted,opacity:0.5}}>{fmtDate(task.dateEnd)+" >"}</div>}
                    {inView&&barW>0&&<div onMouseEnter={e=>{if(!drag.current)setTip({task,rect:e.currentTarget.getBoundingClientRect()});}} onMouseLeave={()=>setTip(null)} onDoubleClick={e=>{e.stopPropagation();setTip(null);setPopover({task});}} onMouseDown={e=>{if(e.target===e.currentTarget||e.target.dataset.zone==="move")onDragStart(e,task,"move");}}
                      style={{position:"absolute",left:barL+2,top:(G_RH-20)/2,width:barW,height:20,borderRadius:5,background:barColor,zIndex:2,cursor:"grab",boxShadow:"0 2px 6px "+barColor+"55",overflow:"visible",display:"flex",alignItems:"center"}}>
                      {task.people.length>1&&pct>0&&pct<100&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:pct+"%",background:"rgba(255,255,255,0.28)",borderRadius:"5px 0 0 5px",pointerEvents:"none"}}/>}
                      <div data-zone="left" onMouseDown={e=>{e.stopPropagation();onDragStart(e,task,"left");}} style={{position:"absolute",left:0,top:0,bottom:0,width:G_HW,cursor:"ew-resize",background:"rgba(255,255,255,0.25)",borderRadius:"5px 0 0 5px",zIndex:3,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:1,height:10,background:"rgba(255,255,255,0.7)",pointerEvents:"none"}}/></div>
                      <div data-zone="move" style={{flex:1,overflow:"hidden",padding:"0 10px",pointerEvents:"none",textAlign:"center"}}>{zoom>=0.9&&barW>50&&<span style={{fontSize:"0.55rem",color:"white",fontWeight:600,whiteSpace:"nowrap"}}>{s==="fait"?"OK ":""}{task.label}</span>}</div>
                      <div data-zone="right" onMouseDown={e=>{e.stopPropagation();onDragStart(e,task,"right");}} style={{position:"absolute",right:0,top:0,bottom:0,width:G_HW,cursor:"ew-resize",background:"rgba(255,255,255,0.25)",borderRadius:"0 5px 5px 0",zIndex:3,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:1,height:10,background:"rgba(255,255,255,0.7)",pointerEvents:"none"}}/></div>
                    </div>}
                    {inView&&zoom>=0.8&&barW>0&&<div style={{position:"absolute",left:Math.min(barL+barW+4,VIEW_DAYS*DAY_W-30),top:"50%",transform:"translateY(-50%)",display:"flex",gap:1,zIndex:3,pointerEvents:"none"}}>
                      {task.people.slice(0,zoom>=1.5?4:2).map(p=>{const done=task.people.length>1?!!(validations[task.key]||{})[p]:s==="fait";const uc=(USERS.find(u=>u.name===p)||{color:"#aaa"}).color;const ui=(USERS.find(u=>u.name===p)||{initials:p.slice(0,2).toUpperCase()}).initials;return <div key={p} title={p} style={{width:13,height:13,borderRadius:"50%",background:done?"#2ec4b6":uc,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"0.38rem",fontWeight:700,opacity:done?1:0.6,border:"1px solid white",flexShrink:0}}>{done?"v":ui}</div>;})}
                    </div>}
                  </div>
                </div>;
              })}
            </div>)}
          </div>;
        })}
      </div>
    </div>
    {tip&&(()=>{const{task}=tip,s=sc(task.status),col=SC[s],pct=Math.round(task.doneCount/task.total*100),od=isOD(task.dateEnd,task.status),ds=isDS(task.dateEnd,task.status),d2=Math.round((new Date(task.dateEnd+"T00:00:00")-new Date(task.dateStart+"T00:00:00"))/864e5)+1;return <div style={{position:"fixed",zIndex:4000,top:Math.min(tip.rect.bottom+6,window.innerHeight-200),left:Math.max(4,Math.min(tip.rect.left,window.innerWidth-290)),background:card,border:"1px solid "+bdr,borderRadius:12,padding:"12px 14px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",minWidth:240,maxWidth:285,pointerEvents:"none"}}><div style={{fontWeight:700,fontSize:"0.82rem",color:txt,marginBottom:6}}>{task.label}</div><div style={{display:"flex",gap:5,marginBottom:6,flexWrap:"wrap"}}><span style={{fontSize:"0.68rem",padding:"2px 8px",borderRadius:10,background:col.bg,color:col.text,fontWeight:600}}>{task.status}</span>{od&&<span style={{fontSize:"0.68rem",padding:"2px 8px",borderRadius:10,background:"#fde8ea",color:"#e63946",fontWeight:600}}>En retard</span>}{ds&&!od&&<span style={{fontSize:"0.68rem",padding:"2px 8px",borderRadius:10,background:"#fef3e6",color:"#b97a2e",fontWeight:600}}>Bientot du</span>}</div><div style={{fontSize:"0.74rem",color:muted,marginBottom:2}}>{fmtDate(task.dateStart)+" -> "+fmtDate(task.dateEnd)}</div><div style={{fontSize:"0.7rem",color:muted}}>{d2+" jour"+(d2>1?"s":"")+" | Double-clic pour modifier"}</div></div>;})()}
    {popover&&<GanttPopover task={popover.task} dark={dark} onSave={(s,e)=>{onUpdateTaskDates(popover.task.tabName,popover.task.ci,popover.task.ti,s,e);setPopover(null);}} onClose={()=>setPopover(null)}/>}
  </div>;
}

// ── Edit Task Modal ────────────────────────────────────────────────────────────
function EditTaskModal({task, tabData, dark, onSave, onClose}) {
  const [form, setForm] = useState({
    label: task.label||"", people: [...(task.people||[])], status: task.status||"A faire",
    dateStart: task.dateStart||"", deadline: task.deadline||"",
    comment: task.comment||"", category: task.catIdx||0
  });
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const durDays = form.dateStart&&form.deadline&&form.dateStart<=form.deadline ? Math.round((new Date(form.deadline+"T00:00:00")-new Date(form.dateStart+"T00:00:00"))/864e5)+1 : null;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:18,padding:"28px 24px",width:"92%",maxWidth:480,boxShadow:"0 20px 60px rgba(0,0,0,0.25)",maxHeight:"90vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}><h3 style={{margin:0,color:"#4361ee",fontSize:"1.1rem"}}>Modifier la tache</h3><button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.3rem",cursor:"pointer",color:muted}}>x</button></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Intitule</label><input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} autoFocus style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",outline:"none",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}/></div>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Categorie</label><select value={form.category} onChange={e=>setForm({...form,category:+e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}>{tabData&&tabData.categories.map((c,i)=><option key={i} value={i}>{c.name}</option>)}</select></div>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Responsables</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{ALL_PEOPLE.map(p=>{const sel=form.people.includes(p);return <span key={p} onClick={()=>setForm({...form,people:sel?form.people.filter(x=>x!==p):[...form.people,p]})} style={{padding:"4px 11px",borderRadius:14,fontSize:"0.76rem",cursor:"pointer",border:"1px solid "+(sel?"#4361ee":bdr),background:sel?"#4361ee":"transparent",color:sel?"white":txt,userSelect:"none"}}>{p}</span>;})}</div></div>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Statut</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}><option value="A faire">A faire</option><option value="En cours">En cours</option><option value="Fait">Fait</option></select></div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Date de debut</label><input type="date" value={form.dateStart} onChange={e=>setForm({...form,dateStart:e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}/></div>
          <div style={{flex:1}}><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Date de fin</label><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}/></div>
        </div>
        {durDays!==null&&<div style={{fontSize:"0.75rem",color:"#4361ee",background:dark?"#1e2a4a":"#eef1ff",borderRadius:8,padding:"6px 12px",textAlign:"center"}}>{durDays+" jour"+(durDays>1?"s":"")+" ("+fmtDate(form.dateStart)+" -> "+fmtDate(form.deadline)+")"}</div>}
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Note</label><textarea value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} rows={2} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.82rem",outline:"none",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box",resize:"vertical"}}/></div>
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>{if(form.label.trim())onSave(form);}} disabled={!form.label.trim()} style={{flex:1,padding:"11px 0",background:form.label.trim()?"#4361ee":"#adb5bd",color:"white",border:"none",borderRadius:10,cursor:form.label.trim()?"pointer":"not-allowed",fontWeight:600,fontSize:"0.88rem"}}>Enregistrer</button>
          <button onClick={onClose} style={{padding:"11px 18px",background:"transparent",color:muted,border:"1px solid "+bdr,borderRadius:10,cursor:"pointer",fontSize:"0.88rem"}}>Annuler</button>
        </div>
      </div>
    </div>
  </div>;
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({tabs, activeTab, dark, onAdd, onClose}) {
  const [form, setForm] = useState({label:"",people:[],category:0,status:"A faire",dateStart:"",deadline:""});
  const tabData=tabs[activeTab], card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const durDays = form.dateStart&&form.deadline&&form.dateStart<=form.deadline ? Math.round((new Date(form.deadline+"T00:00:00")-new Date(form.dateStart+"T00:00:00"))/864e5)+1 : null;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:18,padding:"28px 24px",width:"92%",maxWidth:460,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}><h3 style={{margin:0,color:"#4361ee",fontSize:"1.1rem"}}>Nouvelle tache</h3><button onClick={onClose} style={{background:"none",border:"none",fontSize:"1.3rem",cursor:"pointer",color:muted}}>x</button></div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Intitule</label><input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} onKeyDown={e=>{if(e.key==="Enter"&&form.label.trim())onAdd(form);}} autoFocus style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",outline:"none",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}/></div>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Categorie</label><select value={form.category} onChange={e=>setForm({...form,category:+e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}>{tabData&&tabData.categories.map((c,i)=><option key={i} value={i}>{c.name}</option>)}</select></div>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Responsables</label><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{ALL_PEOPLE.map(p=>{const sel=form.people.includes(p);return <span key={p} onClick={()=>setForm({...form,people:sel?form.people.filter(x=>x!==p):[...form.people,p]})} style={{padding:"4px 11px",borderRadius:14,fontSize:"0.76rem",cursor:"pointer",border:"1px solid "+(sel?"#4361ee":bdr),background:sel?"#4361ee":"transparent",color:sel?"white":txt,userSelect:"none"}}>{p}</span>;})}</div></div>
        <div><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Statut</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}><option value="A faire">A faire</option><option value="En cours">En cours</option><option value="Fait">Fait</option></select></div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Date de debut</label><input type="date" value={form.dateStart} onChange={e=>setForm({...form,dateStart:e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}/></div>
          <div style={{flex:1}}><label style={{fontSize:"0.76rem",fontWeight:600,color:muted,display:"block",marginBottom:3}}>Date de fin</label><input type="date" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} style={{width:"100%",padding:"9px 12px",border:"1px solid "+bdr,borderRadius:8,fontSize:"0.84rem",background:dark?"#1e2a4a":"white",color:txt,boxSizing:"border-box"}}/></div>
        </div>
        {durDays!==null&&<div style={{fontSize:"0.75rem",color:"#4361ee",background:dark?"#1e2a4a":"#eef1ff",borderRadius:8,padding:"6px 12px",textAlign:"center"}}>{durDays+" jour"+(durDays>1?"s":"")+" ("+fmtDate(form.dateStart)+" -> "+fmtDate(form.deadline)+")"}</div>}
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>{if(form.label.trim())onAdd(form);}} disabled={!form.label.trim()} style={{flex:1,padding:"11px 0",background:form.label.trim()?"#4361ee":"#adb5bd",color:"white",border:"none",borderRadius:10,cursor:form.label.trim()?"pointer":"not-allowed",fontWeight:600}}>Ajouter</button>
          <button onClick={onClose} style={{padding:"11px 18px",background:"transparent",color:muted,border:"1px solid "+bdr,borderRadius:10,cursor:"pointer"}}>Annuler</button>
        </div>
      </div>
    </div>
  </div>;
}


// ── Helpers sous-tâches ───────────────────────────────────────────────────────
function computeParentStatus(subtasks) {
  const active = (subtasks||[]).filter(s=>!s._deleted);
  if (!active.length) return null;
  if (active.every(s=>sc(s.status)==="fait")) return "Fait";
  if (active.some(s=>sc(s.status)!=="afaire")) return "En cours";
  return "A faire";
}

function SubTaskRow({task, taskKey, depth, dark, comments, validations, user,
  onChangeStatus, onSetDeadline, onSetDateStart, onTogglePersonVal,
  onAddSubTask, onDeleteSubTask, onEditSubTask,
  onAddComment, onEditComment, onDeleteComment, onEditNote}) {
  const [open,      setOpen]      = useState(false);
  const [showSubs,  setShowSubs]  = useState(false);
  const [addMode,   setAddMode]   = useState(false);
  const [newLabel,  setNewLabel]  = useState("");
  const [editingMe, setEditingMe] = useState(false);
  const [editForm,  setEditForm]  = useState(null);
  const [openComments, setOpenComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [editingComment, setEditingComment] = useState(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(task.comment||"");
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  const s=sc(task.status), col=SC[s];
  const od=isOD(task.deadline,task.status), ds=isDS(task.deadline,task.status);
  const dl=durLabel(task.dateStart,task.deadline);
  const activeSubs=(task.subtasks||[]).filter(st=>!st._deleted);
  const cList=comments[taskKey]||[], cCount=cList.length+(task.comment?1:0);
  const taskVal=validations[taskKey]||{};
  const indentPx = depth*18;

  if (task._deleted) return null;

  return <div style={{marginLeft:indentPx,borderLeft: depth>0?"2px solid "+(dark?"#3a3a5e":"#dee2e6"):"none",paddingLeft:depth>0?8:0}}>
    {/* ── Ligne principale ── */}
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",borderRadius:7,
      background: depth===0?(dark?"rgba(255,255,255,0.02)":"rgba(67,97,238,0.03)"):(dark?"rgba(255,255,255,0.01)":"rgba(0,0,0,0.01)"),
      border:"1px solid "+(od?"#e63946":ds?"#f4a261":bdr),marginBottom:2,
      borderLeft:"3px solid "+(od?"#e63946":ds?"#f4a261":col.border)}}>
      {/* toggle sous-tâches */}
      {depth<2&&<div onClick={()=>setShowSubs(p=>!p)}
        style={{width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",color:muted,fontSize:"0.65rem",flexShrink:0,userSelect:"none"}}>
        {activeSubs.length>0?(showSubs?"▾":"▸"):"·"}
      </div>}
      {depth>=2&&<div style={{width:14,flexShrink:0}}/>}
      {/* checkbox statut */}
      {task.people&&task.people.length<=1&&<div onClick={()=>onChangeStatus(sc(task.status)==="fait"?"A faire":sc(task.status)==="encours"?"Fait":"En cours")}
        style={{width:15,height:15,borderRadius:3,border:s==="fait"?"2px solid #2ec4b6":s==="encours"?"2px solid #f4a261":"2px solid "+bdr,
          background:s==="fait"?"#2ec4b6":s==="encours"?"#fef3e6":"transparent",
          display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:"0.55rem",fontWeight:700,color:s==="fait"?"white":"#f4a261"}}>
        {s==="fait"?"v":s==="encours"?"~":""}
      </div>}
      {/* label */}
      {editingMe
        ?<input value={editForm.label} onChange={e=>setEditForm({...editForm,label:e.target.value})}
            onKeyDown={e=>{if(e.key==="Enter"){onEditSubTask({...editForm});setEditingMe(false);}if(e.key==="Escape")setEditingMe(false);}}
            autoFocus style={{flex:1,padding:"2px 6px",border:"1px solid #4361ee",borderRadius:5,fontSize:"0.78rem",background:dark?"#1e2a4a":"white",color:txt,outline:"none"}}/>
        :<span style={{flex:1,fontSize:"0.78rem",fontWeight:500,textDecoration:s==="fait"?"line-through":"none",color:s==="fait"?muted:txt}}>{task.label}</span>}
      {/* personnes */}
      {task.people&&task.people.length>1&&(()=>{
        const dc=task.people.filter(p=>taskVal[p]).length,tot2=task.people.length,allDone=dc===tot2;
        return <div style={{display:"flex",alignItems:"center",gap:3,background:allDone?(dark?"#0d3a35":"#e6f9f7"):(dark?"#1e2a4a":"#f0f2f8"),border:"1px solid "+(allDone?"#2ec4b6":bdr),borderRadius:16,padding:"2px 6px 2px 3px"}}>
          {task.people.map(p=>{const done2=!!taskVal[p];const uc=(USERS.find(u=>u.name===p)||{color:"#aaa"}).color;return <div key={p} onClick={()=>onTogglePersonVal(p)} title={p} style={{width:16,height:16,borderRadius:"50%",background:done2?"#2ec4b6":uc,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:"0.42rem",fontWeight:700,cursor:"pointer",opacity:done2?1:0.45,flexShrink:0}}>{done2?"v":(USERS.find(u=>u.name===p)||{initials:p.slice(0,2).toUpperCase()}).initials}</div>;})}
          <span style={{fontSize:"0.6rem",color:allDone?"#0d8a7e":muted}}>{dc+"/"+tot2}</span>
        </div>;
      })()}
      {task.people&&task.people.length===1&&<Avatar u={task.people[0]} size={16}/>}
      {/* dates */}
      <input type="date" value={task.dateStart||""} onChange={e=>onSetDateStart(e.target.value)} title="Debut"
        style={{width:task.dateStart?76:16,padding:"1px 2px",borderRadius:5,border:"1px solid "+bdr,fontSize:"0.62rem",background:dark?"#16213e":"white",color:txt,opacity:task.dateStart?1:0.3,transition:"width 0.2s"}}/>
      <input type="date" value={task.deadline||""} onChange={e=>onSetDeadline(e.target.value)} title="Fin"
        style={{width:task.deadline?76:16,padding:"1px 2px",borderRadius:5,border:"1px solid "+(od?"#e63946":ds?"#f4a261":bdr),fontSize:"0.62rem",background:od?(dark?"#3a1520":"#fde8ea"):ds?(dark?"#3a2a10":"#fef3e6"):(dark?"#16213e":"white"),color:od?"#e63946":ds?"#b97a2e":txt,opacity:task.deadline?1:0.3,transition:"width 0.2s"}}/>
      {dl&&<span style={{fontSize:"0.55rem",color:"#4361ee",background:dark?"#1e2a4a":"#eef1ff",padding:"1px 4px",borderRadius:5,whiteSpace:"nowrap",flexShrink:0}}>{dl}</span>}
      {/* statut pill */}
      <select value={task.status} onChange={e=>onChangeStatus(e.target.value)}
        style={{padding:"1px 5px",borderRadius:10,border:"1px solid "+col.border,fontSize:"0.65rem",fontWeight:600,cursor:"pointer",background:col.bg,color:col.text,appearance:"none",WebkitAppearance:"none",minWidth:62}}>
        <option value="A faire">A faire</option><option value="En cours">En cours</option><option value="Fait">Fait</option>
      </select>
      {/* boutons */}
      {editingMe
        ?<>
          <button onClick={()=>{onEditSubTask({...editForm});setEditingMe(false);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.75rem",color:"#4361ee",padding:"0 2px"}}>✓</button>
          <button onClick={()=>setEditingMe(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.75rem",color:muted,padding:"0 2px"}}>✕</button>
        </>
        :<>
          <button onClick={()=>{setEditForm({label:task.label,people:task.people||[],status:task.status,dateStart:task.dateStart||"",deadline:task.deadline||"",comment:task.comment||""});setEditingMe(true);}}
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.72rem",color:muted,padding:"0 2px",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#4361ee"} onMouseLeave={e=>e.currentTarget.style.color=muted}>✏️</button>
          {depth<2&&<button onClick={()=>setAddMode(p=>!p)} title="Ajouter sous-tâche"
            style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.72rem",color:muted,padding:"0 2px",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#2ec4b6"} onMouseLeave={e=>e.currentTarget.style.color=muted}>⊕</button>}
          <button onClick={()=>onDeleteSubTask()} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.72rem",color:muted,padding:"0 2px",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#e63946"} onMouseLeave={e=>e.currentTarget.style.color=muted}>🗑️</button>
          <button onClick={()=>setOpenComments(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.78rem",color:cCount>0?"#4361ee":muted,position:"relative",padding:"0 2px",flexShrink:0}}>
            💬{cCount>0&&<span style={{position:"absolute",top:-3,right:-3,background:"#4361ee",color:"white",fontSize:"0.42rem",width:11,height:11,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{cCount}</span>}
          </button>
        </>}
      {activeSubs.length>0&&<span style={{fontSize:"0.6rem",color:muted,flexShrink:0,background:dark?"#1e2a4a":"#f0f2f8",padding:"1px 5px",borderRadius:8}}>
        {activeSubs.filter(st=>sc(st.status)==="fait").length}/{activeSubs.length}
      </span>}
    </div>

    {/* ── Commentaires inline ── */}
    {openComments&&<div style={{marginLeft:14+indentPx,padding:"6px 10px",background:dark?"#1e2a4a":"#f8f9fa",borderRadius:"0 0 7px 7px",marginBottom:4,border:"1px solid "+bdr,borderTop:"none"}}>
      {editingNote
        ?<div style={{marginBottom:6}}>
          <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} autoFocus rows={2}
            style={{width:"100%",padding:"5px 8px",border:"2px solid #4361ee",borderRadius:6,fontSize:"0.73rem",outline:"none",background:dark?"#16213e":"white",color:txt,boxSizing:"border-box",resize:"vertical"}}/>
          <div style={{display:"flex",gap:4,marginTop:3}}>
            <button onClick={()=>{onEditNote(noteText);setEditingNote(false);}} style={{padding:"3px 10px",background:"#4361ee",color:"white",border:"none",borderRadius:5,cursor:"pointer",fontSize:"0.7rem",fontWeight:600}}>OK</button>
            <button onClick={()=>setEditingNote(false)} style={{padding:"3px 8px",background:"transparent",border:"1px solid "+bdr,borderRadius:5,cursor:"pointer",color:muted,fontSize:"0.7rem"}}>Annuler</button>
            <button onClick={()=>{onEditNote("");setNoteText("");setEditingNote(false);}} style={{padding:"3px 8px",background:"transparent",border:"1px solid #e63946",borderRadius:5,cursor:"pointer",color:"#e63946",fontSize:"0.7rem"}}>Supprimer</button>
          </div>
        </div>
        :<div style={{display:"flex",alignItems:"flex-start",gap:5,padding:"3px 0",borderBottom:"1px solid "+bdr,marginBottom:4}}>
          <div style={{flex:1,fontSize:"0.72rem"}}>{task.comment?<><span style={{fontWeight:600,color:"#4361ee"}}>Note : </span><span style={{color:txt}}>{task.comment}</span></>:<span style={{color:muted,fontStyle:"italic"}}>Aucune note</span>}</div>
          <button onClick={()=>{setNoteText(task.comment||"");setEditingNote(true);}} style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"0.7rem"}} onMouseEnter={e=>e.currentTarget.style.color="#4361ee"} onMouseLeave={e=>e.currentTarget.style.color=muted}>✏️</button>
        </div>}
      {cList.map((c,i)=>{
        const isEd=editingComment&&editingComment.idx===i;
        return <div key={i} style={{padding:"3px 0",borderBottom:"1px solid "+bdr,fontSize:"0.72rem"}}>
          {isEd?<div>
            <textarea value={editingComment.text} onChange={e=>setEditingComment({...editingComment,text:e.target.value})} autoFocus rows={2}
              style={{width:"100%",padding:"4px 7px",border:"2px solid #4361ee",borderRadius:5,fontSize:"0.72rem",outline:"none",background:dark?"#16213e":"white",color:txt,boxSizing:"border-box",resize:"vertical"}}/>
            <div style={{display:"flex",gap:4,marginTop:3}}>
              <button onClick={()=>{onEditComment(i,editingComment.text);setEditingComment(null);}} style={{padding:"2px 8px",background:"#4361ee",color:"white",border:"none",borderRadius:5,cursor:"pointer",fontSize:"0.68rem",fontWeight:600}}>OK</button>
              <button onClick={()=>setEditingComment(null)} style={{padding:"2px 7px",background:"transparent",border:"1px solid "+bdr,borderRadius:5,cursor:"pointer",color:muted,fontSize:"0.68rem"}}>Annuler</button>
            </div>
          </div>:<div style={{display:"flex",alignItems:"flex-start",gap:5}}>
            <div style={{flex:1}}><span style={{fontWeight:600,color:"#4361ee"}}>{c.author}</span><span style={{fontSize:"0.62rem",color:muted,marginLeft:4}}>{c.date}</span>{c.edited&&<span style={{fontSize:"0.55rem",color:muted,marginLeft:3,fontStyle:"italic"}}>(modifié)</span>}<div style={{marginTop:1,color:txt}}>{c.text}</div></div>
            <button onClick={()=>setEditingComment({idx:i,text:c.text})} style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"0.68rem"}} onMouseEnter={e=>e.currentTarget.style.color="#4361ee"} onMouseLeave={e=>e.currentTarget.style.color=muted}>✏️</button>
            <button onClick={()=>onDeleteComment(i)} style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"0.68rem"}} onMouseEnter={e=>e.currentTarget.style.color="#e63946"} onMouseLeave={e=>e.currentTarget.style.color=muted}>🗑️</button>
          </div>}
        </div>;})}
      <div style={{display:"flex",gap:4,marginTop:5}}>
        <input value={commentInput} onChange={e=>setCommentInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&commentInput.trim()){onAddComment(commentInput);setCommentInput("");}}}
          placeholder="Ajouter un commentaire..." style={{flex:1,padding:"4px 8px",border:"1px solid "+bdr,borderRadius:6,fontSize:"0.72rem",outline:"none",background:dark?"#16213e":"white",color:txt}}/>
        <button onClick={()=>{if(commentInput.trim()){onAddComment(commentInput);setCommentInput("");}}} style={{padding:"4px 9px",background:"#4361ee",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:"0.7rem"}}>OK</button>
      </div>
    </div>}

    {/* ── Formulaire ajout sous-tâche ── */}
    {addMode&&<div style={{marginLeft:14,display:"flex",gap:5,alignItems:"center",marginBottom:4,paddingLeft:indentPx}}>
      <span style={{fontSize:"0.65rem",color:muted,flexShrink:0}}>{"└"}</span>
      <input value={newLabel} onChange={e=>setNewLabel(e.target.value)} autoFocus
        onKeyDown={e=>{if(e.key==="Enter"&&newLabel.trim()){onAddSubTask(newLabel.trim());setNewLabel("");setAddMode(false);setShowSubs(true);}if(e.key==="Escape"){setNewLabel("");setAddMode(false);}}}
        placeholder="Nouvelle sous-tâche..." style={{flex:1,padding:"4px 8px",border:"2px solid #2ec4b6",borderRadius:6,fontSize:"0.76rem",outline:"none",background:dark?"#1e2a4a":"white",color:txt}}/>
      <button onClick={()=>{if(newLabel.trim()){onAddSubTask(newLabel.trim());setNewLabel("");setAddMode(false);setShowSubs(true);}}} style={{padding:"4px 10px",background:"#2ec4b6",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:"0.74rem",fontWeight:600}}>OK</button>
      <button onClick={()=>{setNewLabel("");setAddMode(false);}} style={{padding:"4px 8px",background:"none",border:"1px solid "+bdr,borderRadius:6,cursor:"pointer",color:muted,fontSize:"0.74rem"}}>x</button>
    </div>}

    {/* ── Sous-tâches enfants ── */}
    {showSubs&&activeSubs.map((sub,si)=><SubTaskRow key={si} task={sub} taskKey={taskKey+"::"+si} depth={depth+1} dark={dark}
      comments={comments} validations={validations} user={user}
      onChangeStatus={v=>{onEditSubTask({...sub,status:v},si);}}
      onSetDeadline={v=>onEditSubTask({...sub,deadline:v},si)}
      onSetDateStart={v=>onEditSubTask({...sub,dateStart:v},si)}
      onTogglePersonVal={p=>{const tv={...(validations[taskKey+"::"+si]||{})};tv[p]=!tv[p];onEditSubTask({...sub,_valPatch:{[p]:tv[p]}},si);}}
      onAddSubTask={lbl=>onAddSubTask(lbl,si)}
      onDeleteSubTask={()=>onEditSubTask({...sub,_deleted:true},si)}
      onEditSubTask={(upd,ssi)=>onEditSubTask(upd,si,ssi)}
      onAddComment={t=>{onAddComment(t,taskKey+"::"+si);}}
      onEditComment={(idx,txt)=>{onEditComment(idx,txt,taskKey+"::"+si);}}
      onDeleteComment={(idx)=>{onDeleteComment(idx,taskKey+"::"+si);}}
      onEditNote={text=>onEditSubTask({...sub,comment:text},si)}
    />)}
  </div>;
}

// ── Task List ──────────────────────────────────────────────────────────────────
function TaskListView({tabData,activeTab,dark,personFilter,statusFilter,search,comments,validations,onCycleStatus,onChangeStatus,onSetDeadline,onSetDateStart,onAddComment,onEditComment,onDeleteComment,onEditNote,onEditTask,onDeleteTask,onAddCategory,onTogglePersonValidation,onSubTaskAdd,onSubTaskChange,onSubTaskToggleVal,user}) {
  const [collapsedCats, setCollapsedCats] = useState({});
  const [openComments,  setOpenComments]  = useState({});
  const [commentInput,  setCommentInput]  = useState({});
  const [editingComment,setEditingComment]= useState(null); // {key, idx, text}
  const [editingNote,   setEditingNote]   = useState(null); // {ci, ti, key, text}
  const [openSubTasks,  setOpenSubTasks]  = useState({});
  const [addSubMode,    setAddSubMode]    = useState({});
  const [subInput,      setSubInput]      = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingTask,   setEditingTask]   = useState(null);
  const [addCatMode,    setAddCatMode]    = useState(false);
  const [newCatName,    setNewCatName]    = useState("");
  const card=dark?"#16213e":"white", bdr=dark?"#3a3a5e":"#dee2e6", txt=dark?"#e0e0e0":"#212529", muted=dark?"#8888aa":"#6c757d";
  if (!tabData) return null;
  return <div style={{padding:"12px 16px"}}>
    {tabData.categories.map((cat,ci) => {
      const q=search.toLowerCase();
      const vis=cat.tasks.map((t,ti)=>({t,ti})).filter(({t})=>{
        if(personFilter&&!t.people.includes(personFilter))return false;
        if(statusFilter&&sc(t.status)!==sc(statusFilter))return false;
        if(q&&!t.label.toLowerCase().includes(q)&&!t.people.join(" ").toLowerCase().includes(q))return false;
        return true;
      });
      if(!vis.length&&(personFilter||statusFilter||q))return null;
      const done=cat.tasks.filter(t=>sc(t.status)==="fait").length, tot=cat.tasks.length, pp=tot>0?Math.round(done/tot*100):0;
      const collapsed=collapsedCats[activeTab+"-"+ci];
      return <div key={ci} style={{marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 4px",borderBottom:"1px solid "+bdr,marginBottom:collapsed?0:6}}>
          <div onClick={()=>setCollapsedCats(p=>({...p,[activeTab+"-"+ci]:!p[activeTab+"-"+ci]}))} style={{display:"flex",alignItems:"center",gap:8,flex:1,cursor:"pointer",userSelect:"none"}}>
            <span style={{fontWeight:700,fontSize:"0.88rem",color:txt}}>{cat.name}</span>
            <span style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:10,background:pp===100?SC.fait.bg:"#e9ecef",color:pp===100?SC.fait.text:muted}}>{done+"/"+tot}</span>
            <ProgBar pct={pp} h={5}/>
            <span style={{fontSize:"0.68rem",color:muted,flexShrink:0}}>{collapsed?">":"v"}</span>
          </div>
        </div>
        {!collapsed&&<div style={{display:"flex",flexDirection:"column",gap:3}}>
          {vis.map(({t:task,ti}) => {
            const key=activeTab+"::"+ci+"::"+ti, s=sc(task.status), col=SC[s], isMe=task.people.includes(user.name);
            const cList=comments[key]||[], cCount=cList.length+(task.comment?1:0);
            const od=isOD(task.deadline,task.status), ds=isDS(task.deadline,task.status);
            const taskVal=validations[key]||{};
            const dl=durLabel(task.dateStart,task.deadline);
            return <div key={ti} style={{borderRadius:8,overflow:"visible",border:"1px solid "+(od?"#e63946":ds?"#f4a261":bdr),marginBottom:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:isMe?(dark?"#1e2a4a":"#eef1ff"):card,borderLeft:"4px solid "+(od?"#e63946":ds?"#f4a261":col.border)}}>
                {task.people.length<=1&&<div onClick={()=>onCycleStatus(ci,ti)} style={{width:18,height:18,borderRadius:4,border:s==="fait"?"2px solid #2ec4b6":s==="encours"?"2px solid #f4a261":"2px solid "+bdr,background:s==="fait"?"#2ec4b6":s==="encours"?"#fef3e6":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:"0.6rem",fontWeight:700,color:s==="fait"?"white":"#f4a261"}}>{s==="fait"?"v":s==="encours"?"~":""}</div>}
                <span style={{flex:1,fontSize:"0.82rem",fontWeight:500,textDecoration:s==="fait"?"line-through":"none",color:s==="fait"?muted:txt}}>{task.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  {task.people.length>1&&(()=>{
                    const dc=task.people.filter(p=>taskVal[p]).length, tot2=task.people.length, pct2=Math.round(dc/tot2*100), allDone=dc===tot2;
                    return <div style={{display:"flex",alignItems:"center",gap:5,background:allDone?(dark?"#0d3a35":"#e6f9f7"):(dark?"#1e2a4a":"#f0f2f8"),border:"1px solid "+(allDone?"#2ec4b6":bdr),borderRadius:20,padding:"3px 8px 3px 5px"}}>
                      <div style={{display:"flex",gap:2}}>{task.people.map(p=>{const done2=!!taskVal[p];const uc=(USERS.find(u=>u.name===p)||{color:"#aaa"}).color;const ui=(USERS.find(u=>u.name===p)||{initials:p.slice(0,2).toUpperCase()}).initials;return <div key={p} onClick={()=>onTogglePersonValidation(ci,ti,p)} title={p+" - "+(done2?"Valide":"Non valide")} style={{width:20,height:20,borderRadius:"50%",background:done2?"#2ec4b6":uc,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontWeight:700,fontSize:"0.52rem",cursor:"pointer",opacity:done2?1:0.45,transition:"all 0.18s",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.opacity="1"} onMouseLeave={e=>e.currentTarget.style.opacity=done2?"1":"0.45"}>{done2?"v":ui}</div>;})}
                      </div>
                      <span style={{fontSize:"0.65rem",fontWeight:600,color:allDone?"#0d8a7e":muted,whiteSpace:"nowrap"}}>{dc+"/"+tot2}</span>
                      <div style={{width:32,height:4,background:dark?"#3a3a5e":"#dee2e6",borderRadius:2,overflow:"hidden",flexShrink:0}}><div style={{height:"100%",width:pct2+"%",background:allDone?"#2ec4b6":"#4361ee",borderRadius:2,transition:"width 0.3s"}}/></div>
                    </div>;
                  })()}
                  {task.people.length<=1&&task.people.map(p=><Avatar key={p} u={p} size={20}/>)}
                  {task.people.length===0&&<span style={{fontSize:"0.68rem",color:muted}}>-</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:1}}>
                    <span style={{fontSize:"0.55rem",color:muted,flexShrink:0}}>du</span>
                    <input type="date" value={task.dateStart||""} onChange={e=>onSetDateStart(ci,ti,e.target.value)} title="Date de debut"
                      style={{width:task.dateStart?82:20,padding:"2px 3px",borderRadius:6,border:"1px solid "+bdr,fontSize:"0.67rem",background:dark?"#16213e":"white",color:txt,cursor:"pointer",opacity:task.dateStart?1:0.35,transition:"width 0.2s"}}/>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:1}}>
                    <span style={{fontSize:"0.55rem",color:muted,flexShrink:0}}>au</span>
                    <input type="date" value={task.deadline||""} onChange={e=>onSetDeadline(ci,ti,e.target.value)} title="Date de fin / Echeance"
                      style={{width:task.deadline?82:20,padding:"2px 3px",borderRadius:6,border:"1px solid "+(od?"#e63946":ds?"#f4a261":bdr),fontSize:"0.67rem",background:od?(dark?"#3a1520":"#fde8ea"):ds?(dark?"#3a2a10":"#fef3e6"):(dark?"#16213e":"white"),color:od?"#e63946":ds?"#b97a2e":txt,cursor:"pointer",opacity:task.deadline?1:0.35,transition:"width 0.2s"}}/>
                    {od&&<span style={{fontSize:"0.65rem"}}>🔴</span>}
                    {ds&&!od&&<span style={{fontSize:"0.65rem"}}>🟠</span>}
                  </div>
                  {dl&&<span style={{fontSize:"0.6rem",color:"#4361ee",background:dark?"#1e2a4a":"#eef1ff",padding:"1px 5px",borderRadius:6,whiteSpace:"nowrap",flexShrink:0}}>{dl}</span>}
                </div>
                <StatusPill status={task.status} onChange={v=>onChangeStatus(ci,ti,v)}/>
                <button onClick={()=>setEditingTask({ci,ti,catIdx:ci})} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.8rem",color:muted,flexShrink:0,padding:"2px 3px"}} onMouseEnter={e=>e.currentTarget.style.color="#4361ee"} onMouseLeave={e=>e.currentTarget.style.color=muted}>✏️</button>
                <button onClick={()=>setConfirmDelete({ci,ti,label:task.label})} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.8rem",color:muted,flexShrink:0,padding:"2px 3px"}} onMouseEnter={e=>e.currentTarget.style.color="#e63946"} onMouseLeave={e=>e.currentTarget.style.color=muted}>🗑️</button>
                <button onClick={()=>setOpenComments(p=>({...p,[key]:!p[key]}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.85rem",color:cCount>0?"#4361ee":muted,position:"relative",flexShrink:0,padding:"2px"}}>
                  💬{cCount>0&&<span style={{position:"absolute",top:-3,right:-4,background:"#4361ee",color:"white",fontSize:"0.48rem",width:13,height:13,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{cCount}</span>}
                </button>
              </div>
              {/* ── Barre sous-tâches ── */}
              {(()=>{
                const activeST=(task.subtasks||[]).filter(st=>!st._deleted);
                const doneST=activeST.filter(st=>sc(st.status)==="fait").length;
                const isOpen=!!openSubTasks[key];
                return <button
                  onClick={()=>setOpenSubTasks(p=>({...p,[key]:!p[key]}))}
                  ref={el=>{if(el)el.style.cssText=`
                    display:flex!important;align-items:center!important;gap:6px!important;
                    width:100%!important;padding:4px 12px!important;cursor:pointer!important;
                    background:${isOpen?(dark?"rgba(46,196,182,0.14)":"rgba(46,196,182,0.08)"):(dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)")}!important;
                    border:none!important;border-top:1px solid ${dark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}!important;
                    text-align:left!important;font-family:inherit!important;box-sizing:border-box!important;
                    min-height:22px!important;flex-shrink:0!important;
                  `;}}>
                  <span style={{fontSize:"0.6rem",color:"#2ec4b6",fontWeight:700,letterSpacing:"0.5px",flexShrink:0}}>
                    {isOpen?"▾":"▸"} SOUS-TACHES
                  </span>
                  {activeST.length>0
                    ?<span style={{fontSize:"0.62rem",padding:"1px 7px",borderRadius:8,background:dark?"rgba(46,196,182,0.2)":"#e6f9f7",color:"#0d8a7e",fontWeight:600,border:"1px solid rgba(46,196,182,0.3)",marginLeft:4}}>
                      {doneST}/{activeST.length} faites
                    </span>
                    :<span style={{fontSize:"0.6rem",color:muted,fontStyle:"italic",marginLeft:4}}>cliquer pour ajouter</span>}
                </button>;
              })()}
              {openComments[key]&&<div style={{padding:"8px 12px",background:dark?"#1e2a4a":"#f8f9fa",borderTop:"1px solid "+bdr}}>
                {/* ── Note inline ── */}
                {editingNote&&editingNote.key===key
                  ?<div style={{marginBottom:6}}>
                    <div style={{fontSize:"0.7rem",fontWeight:600,color:"#4361ee",marginBottom:3}}>Note :</div>
                    <textarea value={editingNote.text} onChange={e=>setEditingNote({...editingNote,text:e.target.value})} autoFocus rows={2}
                      style={{width:"100%",padding:"6px 9px",border:"2px solid #4361ee",borderRadius:7,fontSize:"0.76rem",outline:"none",background:dark?"#16213e":"white",color:txt,boxSizing:"border-box",resize:"vertical"}}/>
                    <div style={{display:"flex",gap:5,marginTop:4}}>
                      <button onClick={()=>{onEditNote(editingNote.ci,editingNote.ti,editingNote.text);setEditingNote(null);}} style={{padding:"4px 12px",background:"#4361ee",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:"0.74rem",fontWeight:600}}>OK</button>
                      <button onClick={()=>setEditingNote(null)} style={{padding:"4px 10px",background:"transparent",border:"1px solid "+bdr,borderRadius:6,cursor:"pointer",color:muted,fontSize:"0.74rem"}}>Annuler</button>
                      <button onClick={()=>{onEditNote(editingNote.ci,editingNote.ti,"");setEditingNote(null);}} style={{padding:"4px 10px",background:"transparent",border:"1px solid #e63946",borderRadius:6,cursor:"pointer",color:"#e63946",fontSize:"0.74rem"}}>Supprimer</button>
                    </div>
                  </div>
                  :<div style={{display:"flex",alignItems:"flex-start",gap:6,padding:"4px 0",borderBottom:"1px solid "+bdr,marginBottom:4,minHeight:24}}>
                    <div style={{flex:1,fontSize:"0.75rem"}}>
                      {task.comment
                        ?<><span style={{fontWeight:600,color:"#4361ee"}}>Note : </span><span style={{color:txt}}>{task.comment}</span></>
                        :<span style={{color:muted,fontStyle:"italic",fontSize:"0.72rem"}}>Aucune note</span>}
                    </div>
                    <button onClick={()=>setEditingNote({ci,ti,key,text:task.comment||""})} title="Modifier la note"
                      style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"0.78rem",padding:"0 2px",flexShrink:0,lineHeight:1}}
                      onMouseEnter={e=>e.currentTarget.style.color="#4361ee"} onMouseLeave={e=>e.currentTarget.style.color=muted}>✏️</button>
                  </div>
                }
                {/* ── Commentaires ── */}
                {cList.map((c,i)=>{
                  const isEditing = editingComment&&editingComment.key===key&&editingComment.idx===i;
                  return <div key={i} style={{padding:"4px 0",borderBottom:"1px solid "+bdr,fontSize:"0.75rem"}}>
                    {isEditing
                      ?<div>
                        <textarea value={editingComment.text} onChange={e=>setEditingComment({...editingComment,text:e.target.value})} autoFocus rows={2}
                          style={{width:"100%",padding:"5px 8px",border:"2px solid #4361ee",borderRadius:6,fontSize:"0.75rem",outline:"none",background:dark?"#16213e":"white",color:txt,boxSizing:"border-box",resize:"vertical"}}/>
                        <div style={{display:"flex",gap:5,marginTop:3}}>
                          <button onClick={()=>{onEditComment(key,i,editingComment.text);setEditingComment(null);}} style={{padding:"3px 10px",background:"#4361ee",color:"white",border:"none",borderRadius:6,cursor:"pointer",fontSize:"0.72rem",fontWeight:600}}>OK</button>
                          <button onClick={()=>setEditingComment(null)} style={{padding:"3px 8px",background:"transparent",border:"1px solid "+bdr,borderRadius:6,cursor:"pointer",color:muted,fontSize:"0.72rem"}}>Annuler</button>
                        </div>
                      </div>
                      :<div style={{display:"flex",alignItems:"flex-start",gap:6}}>
                        <div style={{flex:1}}>
                          <span style={{fontWeight:600,color:"#4361ee"}}>{c.author}</span>
                          <span style={{fontSize:"0.65rem",color:muted,marginLeft:5}}>{c.date}</span>
                          {c.edited&&<span style={{fontSize:"0.58rem",color:muted,marginLeft:4,fontStyle:"italic"}}>(modifié)</span>}
                          <div style={{marginTop:1,color:txt}}>{c.text}</div>
                        </div>
                        <div style={{display:"flex",gap:2,flexShrink:0}}>
                          <button onClick={()=>setEditingComment({key,idx:i,text:c.text})} title="Modifier"
                            style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"0.75rem",padding:"0 2px",lineHeight:1}}
                            onMouseEnter={e=>e.currentTarget.style.color="#4361ee"} onMouseLeave={e=>e.currentTarget.style.color=muted}>✏️</button>
                          <button onClick={()=>onDeleteComment(key,i)} title="Supprimer"
                            style={{background:"none",border:"none",cursor:"pointer",color:muted,fontSize:"0.75rem",padding:"0 2px",lineHeight:1}}
                            onMouseEnter={e=>e.currentTarget.style.color="#e63946"} onMouseLeave={e=>e.currentTarget.style.color=muted}>🗑️</button>
                        </div>
                      </div>
                    }
                  </div>;
                })}
                <div style={{display:"flex",gap:5,marginTop:6}}>
                  <input value={commentInput[key]||""} onChange={e=>setCommentInput(p=>({...p,[key]:e.target.value}))} onKeyDown={e=>{if(e.key==="Enter"&&(commentInput[key]||"").trim()){onAddComment(key,commentInput[key]);setCommentInput(p=>({...p,[key]:""}));}}} placeholder="Ajouter un commentaire..." style={{flex:1,padding:"5px 9px",border:"1px solid "+bdr,borderRadius:7,fontSize:"0.76rem",outline:"none",background:dark?"#16213e":"white",color:txt}}/>
                  <button onClick={()=>{if((commentInput[key]||"").trim()){onAddComment(key,commentInput[key]);setCommentInput(p=>({...p,[key]:""}));}}} style={{padding:"5px 11px",background:"#4361ee",color:"white",border:"none",borderRadius:7,cursor:"pointer",fontSize:"0.75rem"}}>OK</button>
                </div>
              </div>}
              {/* ── Zone sous-tâches ── */}
              {openSubTasks[key]&&<div style={{padding:"6px 10px 8px",background:dark?"rgba(46,196,182,0.04)":"rgba(46,196,182,0.03)",borderTop:"1px solid "+bdr}}>
                <div style={{fontSize:"0.68rem",fontWeight:600,color:"#2ec4b6",marginBottom:6,display:"flex",alignItems:"center",gap:6}}>
                  <span>Sous-tâches</span>
                  {(task.subtasks||[]).filter(st=>!st._deleted).length>0&&
                    <span style={{background:dark?"#1e2a4a":"#e6f9f7",border:"1px solid #2ec4b6",borderRadius:8,padding:"1px 7px",color:"#0d8a7e",fontSize:"0.62rem"}}>
                      {(task.subtasks||[]).filter(st=>!st._deleted&&sc(st.status)==="fait").length}/{(task.subtasks||[]).filter(st=>!st._deleted).length}
                    </span>}
                </div>
                {(task.subtasks||[]).map((sub,si)=>!sub._deleted&&<SubTaskRow key={si} task={sub} taskKey={key+"::"+si} depth={0} dark={dark}
                  comments={comments} validations={validations} user={user}
                  onChangeStatus={v=>onSubTaskChange(ci,ti,si,null,{status:v})}
                  onSetDeadline={v=>onSubTaskChange(ci,ti,si,null,{deadline:v})}
                  onSetDateStart={v=>onSubTaskChange(ci,ti,si,null,{dateStart:v})}
                  onTogglePersonVal={p=>onSubTaskToggleVal(ci,ti,si,null,p)}
                  onAddSubTask={(lbl,_ssi)=>onSubTaskAdd(ci,ti,si,lbl)}
                  onDeleteSubTask={()=>onSubTaskChange(ci,ti,si,null,{_deleted:true})}
                  onEditSubTask={(upd,ssi)=>{if(ssi!==undefined)onSubTaskChange(ci,ti,si,ssi,upd);else onSubTaskChange(ci,ti,si,null,upd);}}
                  onAddComment={t=>onAddComment(key+"::"+si,t)}
                  onEditComment={(idx,txt)=>onEditComment(key+"::"+si,idx,txt)}
                  onDeleteComment={idx=>onDeleteComment(key+"::"+si,idx)}
                  onEditNote={text=>onSubTaskChange(ci,ti,si,null,{comment:text})}
                />)}
                {/* Ajout sous-tâche niveau 1 */}
                {addSubMode[key]
                  ?<div style={{display:"flex",gap:5,alignItems:"center",marginTop:4}}>
                    <input value={subInput[key]||""} onChange={e=>setSubInput(p=>({...p,[key]:e.target.value}))} autoFocus
                      onKeyDown={e=>{if(e.key==="Enter"&&(subInput[key]||"").trim()){onSubTaskAdd(ci,ti,null,(subInput[key]||"").trim());setSubInput(p=>({...p,[key]:""}));setAddSubMode(p=>({...p,[key]:false}));}if(e.key==="Escape")setAddSubMode(p=>({...p,[key]:false}));}}
                      placeholder="Nouvelle sous-tâche..." style={{flex:1,padding:"5px 9px",border:"2px solid #2ec4b6",borderRadius:7,fontSize:"0.76rem",outline:"none",background:dark?"#1e2a4a":"white",color:txt}}/>
                    <button onClick={()=>{if((subInput[key]||"").trim()){onSubTaskAdd(ci,ti,null,(subInput[key]||"").trim());setSubInput(p=>({...p,[key]:""}));setAddSubMode(p=>({...p,[key]:false}));}}} style={{padding:"5px 11px",background:"#2ec4b6",color:"white",border:"none",borderRadius:7,cursor:"pointer",fontSize:"0.75rem",fontWeight:600}}>OK</button>
                    <button onClick={()=>setAddSubMode(p=>({...p,[key]:false}))} style={{padding:"5px 9px",background:"none",border:"1px solid "+bdr,borderRadius:7,cursor:"pointer",color:muted,fontSize:"0.75rem"}}>x</button>
                  </div>
                  :<button onClick={()=>setAddSubMode(p=>({...p,[key]:true}))} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1px dashed #2ec4b6",borderRadius:7,padding:"5px 12px",cursor:"pointer",color:"#2ec4b6",fontSize:"0.74rem",marginTop:4,width:"100%"}}
                    onMouseEnter={e=>e.currentTarget.style.background=dark?"rgba(46,196,182,0.08)":"rgba(46,196,182,0.06)"}
                    onMouseLeave={e=>e.currentTarget.style.background="none"}>+ Ajouter une sous-tâche</button>}
              </div>}
            </div>;
          })}
        </div>}
      </div>;
    })}
    <div style={{marginTop:16,borderTop:"1px dashed "+bdr,paddingTop:12}}>
      {!addCatMode
        ?<button onClick={()=>setAddCatMode(true)} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"1px dashed "+bdr,borderRadius:8,padding:"7px 14px",cursor:"pointer",color:muted,fontSize:"0.8rem",width:"100%"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="#4361ee";e.currentTarget.style.color="#4361ee";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=bdr;e.currentTarget.style.color=muted;}}>+ Ajouter une categorie</button>
        :<div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&newCatName.trim()){onAddCategory(newCatName.trim());setNewCatName("");setAddCatMode(false);}if(e.key==="Escape"){setNewCatName("");setAddCatMode(false);}}} placeholder="Nom de la categorie..." style={{flex:1,padding:"8px 12px",border:"2px solid #4361ee",borderRadius:8,fontSize:"0.84rem",outline:"none",background:dark?"#1e2a4a":"white",color:txt}}/>
          <button onClick={()=>{if(newCatName.trim()){onAddCategory(newCatName.trim());setNewCatName("");setAddCatMode(false);}}} style={{padding:"8px 14px",background:"#4361ee",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600}}>OK</button>
          <button onClick={()=>{setNewCatName("");setAddCatMode(false);}} style={{padding:"8px 12px",background:"none",border:"1px solid "+bdr,borderRadius:8,cursor:"pointer",color:muted}}>x</button>
        </div>
      }
    </div>
    {editingTask&&<EditTaskModal task={{...tabData.categories[editingTask.ci].tasks[editingTask.ti],catIdx:editingTask.ci}} tabData={tabData} dark={dark} onSave={form=>{onEditTask(editingTask.ci,editingTask.ti,form);setEditingTask(null);}} onClose={()=>setEditingTask(null)}/>}
    {confirmDelete&&<ConfirmModal label={confirmDelete.label} dark={dark} onConfirm={()=>{onDeleteTask(confirmDelete.ci,confirmDelete.ti);setConfirmDelete(null);}} onCancel={()=>setConfirmDelete(null)}/>}
  </div>;
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({dark,user,tabs,activeTab,setActiveTab,view,setView,personFilter,setPersonFilter,statusFilter,setStatusFilter,search,setSearch,collapsed,setCollapsed,customTabs,onAddTab,onDeleteTab,onDuplicateTab,onRenameTab}) {
  const [addTabMode,     setAddTabMode]     = useState(false);
  const [newTabName,     setNewTabName]     = useState("");
  const [duplicatingTab, setDuplicatingTab] = useState(null);
  const [dupName,        setDupName]        = useState("");
  const [renamingTab,    setRenamingTab]    = useState(null);
  const [renameVal,      setRenameVal]      = useState("");
  const [confirmDelTab,  setConfirmDelTab]  = useState(null);
  const bg=dark?"#12122a":"#1e2a5a", bdr=dark?"#2a2a5e":"#2a3f8f", muted="rgba(255,255,255,0.55)";
  const tabNames = Object.keys(tabs);
  const tabStats = useMemo(() => {
    const m = {};
    tabNames.forEach(t => { let f=0,tot=0; tabs[t].categories.forEach(c=>c.tasks.forEach(tk=>{tot++;if(sc(tk.status)==="fait")f++;})); m[t]={f,tot,pct:tot>0?Math.round(f/tot*100):0}; });
    return m;
  }, [tabs]);
  const VIEWS = [{id:"tasks",icon:"📋",label:"Taches"},{id:"calendar",icon:"📅",label:"Calendrier"},{id:"gantt",icon:"📊",label:"Gantt"},{id:"transversal",icon:"🔀",label:"Vue globale"}];
  return <div style={{width:collapsed?52:240,background:bg,flexShrink:0,display:"flex",flexDirection:"column",transition:"width 0.22s ease",overflow:"hidden",borderRight:"1px solid "+bdr}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",padding:collapsed?"10px 0":"12px 14px",borderBottom:"1px solid "+bdr}}>
      {!collapsed&&<span style={{color:"white",fontWeight:700,fontSize:"0.9rem",letterSpacing:1}}>CEMEDIS</span>}
      <button onClick={()=>setCollapsed(!collapsed)} style={{background:"rgba(255,255,255,0.12)",border:"none",borderRadius:7,padding:"5px 7px",cursor:"pointer",color:"white",fontSize:"0.9rem",lineHeight:1}}>{collapsed?">":"<"}</button>
    </div>
    {!collapsed&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderBottom:"1px solid "+bdr}}><Avatar u={user} size={28}/><div><div style={{color:"white",fontWeight:600,fontSize:"0.82rem"}}>{user.name}</div><div style={{color:muted,fontSize:"0.68rem"}}>{user.role}</div></div></div>}
    <div style={{flex:1,overflowY:"auto",padding:collapsed?"8px 6px":"10px 0"}}>
      <div style={{marginBottom:collapsed?12:0}}>
        {!collapsed&&<div style={{fontSize:"0.62rem",fontWeight:700,color:muted,textTransform:"uppercase",letterSpacing:1,padding:"6px 14px 3px"}}>Vues</div>}
        {VIEWS.map(v=><div key={v.id} onClick={()=>setView(v.id)} style={{display:"flex",alignItems:"center",gap:10,padding:collapsed?"8px 0":"7px 14px",cursor:"pointer",justifyContent:collapsed?"center":"flex-start",background:view===v.id?"rgba(255,255,255,0.15)":"transparent",borderRadius:collapsed?8:0,margin:collapsed?"0 auto":"0",width:collapsed?38:undefined,borderLeft:!collapsed&&view===v.id?"3px solid #2ec4b6":"3px solid transparent"}}><span style={{fontSize:"1rem"}}>{v.icon}</span>{!collapsed&&<span style={{color:view===v.id?"white":muted,fontSize:"0.82rem",fontWeight:view===v.id?600:400}}>{v.label}</span>}</div>)}
      </div>
      {view==="tasks"&&<div>
        {!collapsed&&<div style={{fontSize:"0.62rem",fontWeight:700,color:muted,textTransform:"uppercase",letterSpacing:1,padding:"10px 14px 3px"}}>Onglets</div>}
        {tabNames.map(t => {
          const st = tabStats[t];
          return <div key={t} style={{display:"flex",alignItems:"center",background:activeTab===t?"rgba(255,255,255,0.12)":"transparent",borderLeft:!collapsed&&activeTab===t?"3px solid #4361ee":"3px solid transparent",borderRadius:collapsed?6:0,margin:collapsed?"2px auto":"0",width:collapsed?38:undefined}}>
            <div onClick={()=>setActiveTab(t)} title={collapsed?t:undefined} style={{display:"flex",alignItems:"center",gap:8,flex:1,padding:collapsed?"6px 0":"6px 14px",cursor:"pointer",minWidth:0,justifyContent:collapsed?"center":"flex-start"}}>
              {collapsed
                ?<div style={{width:8,height:8,borderRadius:"50%",background:st.pct===100?"#2ec4b6":st.f>0?"#f4a261":"#e63946"}}/>
                :<div style={{flex:1,overflow:"hidden"}}><div style={{color:activeTab===t?"white":muted,fontSize:"0.78rem",fontWeight:activeTab===t?600:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t}</div><div style={{display:"flex",alignItems:"center",gap:4,marginTop:2}}><ProgBar pct={st.pct} h={3} color="#2ec4b6"/><span style={{fontSize:"0.6rem",color:muted,flexShrink:0}}>{st.pct+"%"}</span></div></div>
              }
            </div>
            {!collapsed&&<>
              <button onClick={e=>{e.stopPropagation();setDuplicatingTab(t);setDupName(t+" (copie)");}} title="Dupliquer" style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:"0.75rem",padding:"0 3px",lineHeight:1,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#2ec4b6"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>⧉</button>
              <button onClick={e=>{e.stopPropagation();setRenamingTab(t);setRenameVal(t);}} title="Renommer" style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:"0.75rem",padding:"0 3px",lineHeight:1,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#f4a261"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>✎</button>
              <button onClick={e=>{e.stopPropagation();setConfirmDelTab(t);}} title="Supprimer" style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.3)",fontSize:"0.7rem",padding:"0 8px 0 3px",lineHeight:1,flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.color="#e63946"} onMouseLeave={e=>e.currentTarget.style.color="rgba(255,255,255,0.3)"}>x</button>
            </>}
          </div>;
        })}
        {!collapsed&&(addTabMode
          ?<div style={{padding:"6px 10px",display:"flex",gap:5,alignItems:"center"}}><input value={newTabName} onChange={e=>setNewTabName(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&newTabName.trim()){onAddTab(newTabName.trim());setNewTabName("");setAddTabMode(false);}if(e.key==="Escape"){setNewTabName("");setAddTabMode(false);}}} placeholder="Nom de l onglet..." style={{flex:1,padding:"5px 9px",borderRadius:7,border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.1)",color:"white",fontSize:"0.76rem",outline:"none"}}/><button onClick={()=>{if(newTabName.trim()){onAddTab(newTabName.trim());setNewTabName("");setAddTabMode(false);}}} style={{padding:"5px 9px",background:"#4361ee",color:"white",border:"none",borderRadius:7,cursor:"pointer",fontSize:"0.74rem",fontWeight:600}}>OK</button><button onClick={()=>{setNewTabName("");setAddTabMode(false);}} style={{padding:"5px 8px",background:"none",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,cursor:"pointer",color:muted,fontSize:"0.74rem"}}>x</button></div>
          :<div onClick={()=>setAddTabMode(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",cursor:"pointer",color:muted,fontSize:"0.76rem",borderLeft:"3px solid transparent"}} onMouseEnter={e=>e.currentTarget.style.color="white"} onMouseLeave={e=>e.currentTarget.style.color=muted}>+ Nouvel onglet</div>
        )}
      </div>}
      {!collapsed&&<div>
        <div style={{fontSize:"0.62rem",fontWeight:700,color:muted,textTransform:"uppercase",letterSpacing:1,padding:"10px 14px 3px"}}>Filtres</div>
        <div style={{padding:"3px 14px 6px"}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher..." style={{width:"100%",padding:"6px 10px",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,fontSize:"0.75rem",background:"rgba(255,255,255,0.1)",color:"white",outline:"none",boxSizing:"border-box"}}/></div>
        <div style={{fontSize:"0.66rem",color:muted,padding:"2px 14px 4px"}}>Personne</div>
        <div style={{padding:"0 10px 6px",display:"flex",flexWrap:"wrap",gap:4}}>
          {[null,...ALL_PEOPLE].map(p=><span key={p||"all"} onClick={()=>setPersonFilter(personFilter===p?null:p)} style={{padding:"3px 9px",borderRadius:12,fontSize:"0.68rem",cursor:"pointer",border:"1px solid "+(personFilter===p?"#2ec4b6":"rgba(255,255,255,0.2)"),background:personFilter===p?"#2ec4b6":"rgba(255,255,255,0.08)",color:personFilter===p?"white":muted,userSelect:"none"}}>{p||"Tous"}</span>)}
        </div>
        <div style={{fontSize:"0.66rem",color:muted,padding:"2px 14px 4px"}}>Statut</div>
        <div style={{padding:"0 10px 8px",display:"flex",flexWrap:"wrap",gap:4}}>
          {["A faire","En cours","Fait"].map(s=>{const active=statusFilter===s,col=SC[sc(s)];return <span key={s} onClick={()=>setStatusFilter(active?null:s)} style={{padding:"3px 9px",borderRadius:12,fontSize:"0.68rem",cursor:"pointer",border:"1px solid "+(active?col.border:"rgba(255,255,255,0.2)"),background:active?col.bg:"rgba(255,255,255,0.08)",color:active?col.text:muted,userSelect:"none"}}>{s}</span>;})}
        </div>
      </div>}
    </div>
    {renamingTab&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setRenamingTab(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:dark?"#16213e":"white",borderRadius:14,padding:"24px 22px",width:"90%",maxWidth:380,boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
        <div style={{fontWeight:700,fontSize:"0.95rem",color:"#f4a261",marginBottom:14}}>Renommer l&#39;onglet</div>
        <label style={{fontSize:"0.75rem",fontWeight:600,color:dark?"#8888aa":"#6c757d",display:"block",marginBottom:5}}>Nouveau nom</label>
        <input value={renameVal} onChange={e=>setRenameVal(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&renameVal.trim()&&renameVal!==renamingTab){onRenameTab(renamingTab,renameVal.trim());setRenamingTab(null);}if(e.key==="Escape")setRenamingTab(null);}} style={{width:"100%",padding:"9px 12px",border:"2px solid #f4a261",borderRadius:8,fontSize:"0.85rem",outline:"none",background:dark?"#1e2a4a":"white",color:dark?"#e0e0e0":"#212529",boxSizing:"border-box",marginBottom:14}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{if(renameVal.trim()&&renameVal!==renamingTab){onRenameTab(renamingTab,renameVal.trim());setRenamingTab(null);}}} disabled={!renameVal.trim()||renameVal===renamingTab} style={{flex:1,padding:"10px 0",background:renameVal.trim()&&renameVal!==renamingTab?"#f4a261":"#adb5bd",color:"white",border:"none",borderRadius:9,cursor:renameVal.trim()&&renameVal!==renamingTab?"pointer":"not-allowed",fontWeight:700,fontSize:"0.88rem"}}>Renommer</button>
          <button onClick={()=>setRenamingTab(null)} style={{padding:"10px 14px",background:"transparent",border:"1px solid "+(dark?"#3a3a5e":"#dee2e6"),borderRadius:9,cursor:"pointer",color:dark?"#8888aa":"#6c757d",fontSize:"0.88rem"}}>Annuler</button>
        </div>
      </div>
    </div>}
    {confirmDelTab&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setConfirmDelTab(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:dark?"#16213e":"white",borderRadius:14,padding:"24px 28px",maxWidth:380,width:"90%",boxShadow:"0 12px 40px rgba(0,0,0,0.22)"}}>
        <div style={{fontSize:"1.5rem",marginBottom:10,textAlign:"center"}}>🗑️</div>
        <div style={{fontWeight:700,fontSize:"0.95rem",color:dark?"#e0e0e0":"#212529",marginBottom:6,textAlign:"center"}}>Supprimer cet onglet ?</div>
        <div style={{fontSize:"0.82rem",color:dark?"#8888aa":"#6c757d",marginBottom:20,textAlign:"center"}}>{"\""+confirmDelTab+"\""}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{onDeleteTab(confirmDelTab);setConfirmDelTab(null);}} style={{flex:1,padding:"10px 0",background:"#e63946",color:"white",border:"none",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:"0.88rem"}}>Supprimer</button>
          <button onClick={()=>setConfirmDelTab(null)} style={{flex:1,padding:"10px 0",background:"transparent",border:"1px solid "+(dark?"#3a3a5e":"#dee2e6"),borderRadius:9,cursor:"pointer",color:dark?"#8888aa":"#6c757d",fontSize:"0.88rem"}}>Annuler</button>
        </div>
      </div>
    </div>}
    {duplicatingTab&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setDuplicatingTab(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:dark?"#16213e":"white",borderRadius:14,padding:"24px 22px",width:"90%",maxWidth:380,boxShadow:"0 12px 40px rgba(0,0,0,0.25)"}}>
        <div style={{fontWeight:700,fontSize:"0.95rem",color:"#4361ee",marginBottom:6}}>Dupliquer l&#39;onglet</div>
        <div style={{fontSize:"0.8rem",color:dark?"#8888aa":"#6c757d",marginBottom:14}}>{"Copie de : "+duplicatingTab}</div>
        <label style={{fontSize:"0.75rem",fontWeight:600,color:dark?"#8888aa":"#6c757d",display:"block",marginBottom:5}}>Nom du nouvel onglet</label>
        <input value={dupName} onChange={e=>setDupName(e.target.value)} autoFocus onKeyDown={e=>{if(e.key==="Enter"&&dupName.trim()){onDuplicateTab(duplicatingTab,dupName.trim());setDuplicatingTab(null);}if(e.key==="Escape")setDuplicatingTab(null);}} style={{width:"100%",padding:"9px 12px",border:"2px solid #4361ee",borderRadius:8,fontSize:"0.85rem",outline:"none",background:dark?"#1e2a4a":"white",color:dark?"#e0e0e0":"#212529",boxSizing:"border-box",marginBottom:14}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{if(dupName.trim()){onDuplicateTab(duplicatingTab,dupName.trim());setDuplicatingTab(null);}}} disabled={!dupName.trim()} style={{flex:1,padding:"10px 0",background:dupName.trim()?"#4361ee":"#adb5bd",color:"white",border:"none",borderRadius:9,cursor:dupName.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:"0.88rem"}}>Dupliquer</button>
          <button onClick={()=>setDuplicatingTab(null)} style={{padding:"10px 14px",background:"transparent",border:"1px solid "+(dark?"#3a3a5e":"#dee2e6"),borderRadius:9,cursor:"pointer",color:dark?"#8888aa":"#6c757d",fontSize:"0.88rem"}}>Annuler</button>
        </div>
      </div>
    </div>}
  </div>;
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,        setUser]        = useState(null);
  const [dark,        setDark]        = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [sMode,       setSMode]       = useState(SM.unknown);
  const [tabs,        setTabs]        = useState(null);
  const [delta,       setDelta]       = useState({});
  const [added,       setAdded]       = useState({});
  const [comments,    setComments]    = useState({});
  const [history,     setHistory]     = useState([]);
  const [validations, setVal]         = useState({});
  const [activeTab,   setActiveTab]   = useState("Situation Janvier");
  const [view,        setView]        = useState("tasks");
  const [personFilter,setPF]          = useState(null);
  const [statusFilter,setSF]          = useState(null);
  const [search,      setSearch]      = useState("");
  const [sideCollapsed,setSC]         = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showHist,    setShowHist]    = useState(false);
  const [customTabs,  setCT]          = useState([]);
  const [saveStatus,  setSaveStatus]  = useState("idle");
  const [saveError,   setSaveError]   = useState("");
  const [migrated,    setMigrated]    = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState("");
  const [importError, setImportError] = useState("");
  const saveTimer = useRef(null), lastSave = useRef(0);

  useEffect(() => {
    (async () => {
      const m = await detectStorage(); setSMode(m);
      if (m !== SM.none) {
        try {
          let saved = await sGet(SK);
          if (!saved) {
            const legacy = await sGet("cemedis-v2") || await sGet("cemedis-state-v1");
            if (legacy) {
              const ca = {};
              Object.entries(legacy.added||{}).forEach(([k,v]) => { if (!k.startsWith("__") && Array.isArray(v)) ca[k] = v; });
              saved = {delta:legacy.delta||{}, added:ca, comments:legacy.comments||{}, history:legacy.history||[], validations:legacy.validations||{}};
              try { await sSet(SK, saved); } catch(e2) {}
              setMigrated(true);
            }
          }
          if (saved) {
            setDelta(saved.delta||{}); setAdded(saved.added||{});
            setComments(saved.comments||{}); setHistory(saved.history||[]);
            setVal(saved.validations||{});
            setTabs(buildTabs(saved.delta||{}, saved.added||{}));
          } else setTabs(buildTabs());
        } catch(e) { setTabs(buildTabs()); }
      } else setTabs(buildTabs());
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (sMode !== SM.persistent) return;
    const id = setInterval(async () => {
      if (Date.now()-lastSave.current < 5000) return;
      try { const s=await sGet(SK); if(s){setDelta(s.delta||{});setAdded(s.added||{});setComments(s.comments||{});setHistory(s.history||[]);setVal(s.validations||{});setTabs(buildTabs(s.delta||{},s.added||{}));} } catch(e) {}
    }, 20000);
    return () => clearInterval(id);
  }, [sMode]);

  const scheduleSave = useCallback((nd,na,nc,nh,nv) => {
    setSaveStatus("saving"); setSaveError("");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const naClean = {};
        Object.entries(na).forEach(([k,v]) => { if (!k.startsWith("__") && Array.isArray(v) && v.length > 0) naClean[k] = v; });
        const payload = {delta:nd, added:naClean, comments:nc, history:nh.slice(0,50), validations:nv};
        if (JSON.stringify(payload).length > 400000) { payload.history = nh.slice(0,10); payload.comments = {}; }
        await sSet(SK, payload);
        lastSave.current = Date.now(); setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2500);
      } catch(e) {
        setSaveError(e&&e.message?e.message.slice(0,40):"err");
        setSaveStatus("error"); setTimeout(() => { setSaveStatus("idle"); setSaveError(""); }, 10000);
      }
    }, 600);
  }, []);

  const pushHist = (action,nd,na,nc,nh,nv) => {
    const h2 = [{time:nowStr(),action},...nh].slice(0,80);
    setHistory(h2); scheduleSave(nd,na,nc,h2,nv||validations); return h2;
  };

  const applyPatch = (tabName,ci,ti,patch) => {
    const key = tabName+"::"+ci+"::"+ti;
    const nd = {...delta, [key]:{...(delta[key]||{}),...patch}};
    setDelta(nd);
    setTabs(prev => { const n={...prev}; n[tabName]={...n[tabName],categories:n[tabName].categories.map((cat,ci2)=>ci2!==ci?cat:{...cat,tasks:cat.tasks.map((t,ti2)=>ti2!==ti?t:{...t,...patch})})}; return n; });
    return nd;
  };

  const onCycleStatus = (ci,ti) => {
    const t = tabs[activeTab].categories[ci].tasks[ti];
    if (t.people.length > 1) return;
    const cycle = {"A faire":"En cours","En cours":"Fait","Fait":"A faire"};
    const next = cycle[t.status]||"En cours";
    const nd = applyPatch(activeTab,ci,ti,{status:next});
    pushHist(user.name+": "+t.label+" -> "+next, nd,added,comments,history,validations);
  };

  const onChangeStatus = (ci,ti,v) => {
    const t = tabs[activeTab].categories[ci].tasks[ti];
    const nd = applyPatch(activeTab,ci,ti,{status:v});
    pushHist(user.name+": "+t.label+" -> "+v, nd,added,comments,history,validations);
  };

  const onSetDeadline = (ci,ti,v) => {
    const nd = applyPatch(activeTab,ci,ti,{deadline:v||""});
    pushHist(user.name+": echeance -> "+fmtDate(v), nd,added,comments,history,validations);
  };

  const onSetDateStart = (ci,ti,v) => {
    const nd = applyPatch(activeTab,ci,ti,{dateStart:v||""});
    pushHist(user.name+": debut -> "+fmtDate(v), nd,added,comments,history,validations);
  };

  const onTogglePersonValidation = (ci,ti,person) => {
    const key = activeTab+"::"+ci+"::"+ti;
    const task = tabs[activeTab].categories[ci].tasks[ti];
    const tv = {...(validations[key]||{})};
    tv[person] = !tv[person];
    const nv = {...validations, [key]:tv};
    setVal(nv);
    const dc = task.people.filter(p=>tv[p]).length;
    const ns = dc===0?"A faire":dc===task.people.length?"Fait":"En cours";
    const nd = applyPatch(activeTab,ci,ti,{status:ns});
    pushHist(person+(tv[person]?" valide ":" annule ")+task.label+" ("+dc+"/"+task.people.length+")", nd,added,comments,history,nv);
  };

  const onAddComment = (key,t) => {
    if (!t.trim()) return;
    const nc = {...comments, [key]:[...(comments[key]||[]),{author:user.name,date:nowStr(),text:t.trim()}]};
    setComments(nc); pushHist(user.name+" commente: "+t.trim().substring(0,40), delta,added,nc,history,validations);
  };

  const onEditComment = (key,idx,newText) => {
    if (!newText.trim()) return;
    const list = [...(comments[key]||[])];
    list[idx] = {...list[idx], text:newText.trim(), edited:true};
    const nc = {...comments, [key]:list};
    setComments(nc); pushHist(user.name+": modifie commentaire", delta,added,nc,history,validations);
  };

  const onDeleteComment = (key,idx) => {
    const list = [...(comments[key]||[])];
    list.splice(idx,1);
    const nc = {...comments, [key]:list};
    setComments(nc); pushHist(user.name+": supprime commentaire", delta,added,nc,history,validations);
  };

  const onEditNote = (ci,ti,text) => {
    const nd = applyPatch(activeTab,ci,ti,{comment:text||""});
    pushHist(user.name+": note modifiee", nd,added,comments,history,validations);
  };

  // ── recalcule le statut parent selon ses sous-tâches ──
  const recomputeParent = (tabName,ci,ti,tabsSnap) => {
    const t = tabsSnap[tabName].categories[ci].tasks[ti];
    const active = (t.subtasks||[]).filter(s=>!s._deleted);
    if (!active.length) return null;
    if (active.every(s=>sc(s.status)==="fait")) return "Fait";
    if (active.some(s=>sc(s.status)!=="afaire")) return "En cours";
    return "A faire";
  };

  // Patch générique sous-tâche niveau 1 ou 2
  // si ssi===null → niveau 1 (clé tab::ci::ti::si)
  // si ssi!==null → niveau 2 (clé tab::ci::ti::si::ssi)
  const onSubTaskChange = (ci,ti,si,ssi,patch) => {
    const baseKey = activeTab+"::"+ci+"::"+ti;
    const key = ssi!==null && ssi!==undefined ? baseKey+"::"+si+"::"+ssi : baseKey+"::"+si;
    const nd = {...delta, [key]:{...(delta[key]||{}),...patch}};
    setDelta(nd);
    // Mettre à jour tabs state localement
    setTabs(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      const task = n[activeTab].categories[ci].tasks[ti];
      if (!task.subtasks) task.subtasks = [];
      if (ssi!==null && ssi!==undefined) {
        if (!task.subtasks[si]) task.subtasks[si] = {label:"",people:[],status:"A faire",subtasks:[]};
        if (!task.subtasks[si].subtasks) task.subtasks[si].subtasks = [];
        if (!task.subtasks[si].subtasks[ssi]) task.subtasks[si].subtasks[ssi] = {label:"",people:[],status:"A faire"};
        Object.assign(task.subtasks[si].subtasks[ssi], patch);
        // recalcul statut sous-tâche niveau 1
        const activeL2 = task.subtasks[si].subtasks.filter(s=>!s._deleted);
        if (activeL2.length) {
          if (activeL2.every(s=>sc(s.status)==="fait")) task.subtasks[si].status = "Fait";
          else if (activeL2.some(s=>sc(s.status)!=="afaire")) task.subtasks[si].status = "En cours";
          else task.subtasks[si].status = "A faire";
          const siKey = baseKey+"::"+si;
          nd[siKey] = {...(nd[siKey]||{}), status:task.subtasks[si].status};
        }
      } else {
        if (!task.subtasks[si]) task.subtasks[si] = {label:"",people:[],status:"A faire"};
        Object.assign(task.subtasks[si], patch);
      }
      // Recalcul statut parent (niveau tâche)
      const activeL1 = task.subtasks.filter(s=>!s._deleted);
      if (activeL1.length) {
        let newStatus;
        if (activeL1.every(s=>sc(s.status)==="fait")) newStatus = "Fait";
        else if (activeL1.some(s=>sc(s.status)!=="afaire")) newStatus = "En cours";
        else newStatus = "A faire";
        task.status = newStatus;
        nd[baseKey] = {...(nd[baseKey]||{}), status:newStatus};
      }
      return n;
    });
    pushHist(user.name+": sous-tâche modifiee", nd,added,comments,history,validations);
  };

  // Toggle validation d'une personne sur une sous-tâche
  const onSubTaskToggleVal = (ci,ti,si,ssi,person) => {
    const baseKey = activeTab+"::"+ci+"::"+ti;
    const key = ssi!==null && ssi!==undefined ? baseKey+"::"+si+"::"+ssi : baseKey+"::"+si;
    const tv = {...(validations[key]||{})};
    tv[person] = !tv[person];
    const nv = {...validations, [key]:tv};
    setVal(nv);
    // Calculer nouveau statut selon validations
    setTabs(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      const task = n[activeTab].categories[ci].tasks[ti];
      let sub = ssi!==null && ssi!==undefined ? task.subtasks[si].subtasks[ssi] : task.subtasks[si];
      const dc = (sub.people||[]).filter(p=>tv[p]).length;
      sub.status = dc===0?"A faire":dc===(sub.people||[]).length?"Fait":"En cours";
      // recalcul parents
      const activeL1 = task.subtasks.filter(s=>!s._deleted);
      if (activeL1.length) {
        if (activeL1.every(s=>sc(s.status)==="fait")) task.status = "Fait";
        else if (activeL1.some(s=>sc(s.status)!=="afaire")) task.status = "En cours";
        else task.status = "A faire";
      }
      return n;
    });
    pushHist(person+(tv[person]?" valide ":" annule ")+"sous-tâche", delta,added,comments,history,nv);
  };

  // Ajouter une sous-tâche (si===null → niveau 1, si!==null → niveau 2 sous task.subtasks[si])
  const onSubTaskAdd = (ci,ti,si,label) => {
    if (!label.trim()) return;
    setTabs(prev => {
      const n = JSON.parse(JSON.stringify(prev));
      const task = n[activeTab].categories[ci].tasks[ti];
      if (!task.subtasks) task.subtasks = [];
      if (si===null || si===undefined) {
        task.subtasks.push({label:label.trim(),people:[],status:"A faire"});
      } else {
        if (!task.subtasks[si].subtasks) task.subtasks[si].subtasks = [];
        task.subtasks[si].subtasks.push({label:label.trim(),people:[],status:"A faire"});
      }
      return n;
    });
    // Persister dans added
    const na = {...added};
    const aKey = "__sub__"+activeTab+"::"+ci+"::"+ti+"::"+Date.now();
    na[aKey] = {type:"subtask",tabName:activeTab,ci,ti,si:si??null,label:label.trim()};
    setAdded(na);
    pushHist(user.name+": + sous-tâche "+label.trim(), delta,na,comments,history,validations);
  };

  const onAddTask = (form) => {
    if (!form.label.trim()) return;
    const na = {...added};
    if (!na[activeTab]) na[activeTab] = [];
    na[activeTab] = [...na[activeTab], {catIdx:form.category, task:{label:form.label.trim(),people:form.people,status:form.status,dateStart:form.dateStart||"",deadline:form.deadline||""}}];
    setAdded(na);
    setTabs(prev => { const n={...prev}; n[activeTab]={...n[activeTab],categories:n[activeTab].categories.map((c,i)=>i!==form.category?c:{...c,tasks:[...c.tasks,{label:form.label.trim(),people:form.people,status:form.status,dateStart:form.dateStart||"",deadline:form.deadline||""}]})}; return n; });
    pushHist(user.name+": + "+form.label.trim(), delta,na,comments,history,validations);
    setShowAdd(false);
  };

  const onEditTask = (ci,ti,form) => {
    const old = tabs[activeTab].categories[ci].tasks[ti];
    const upd = {...old, label:form.label.trim(), people:form.people, status:form.status, dateStart:form.dateStart||"", deadline:form.deadline||"", comment:form.comment||""};
    const key = activeTab+"::"+ci+"::"+ti;
    const nd = {...delta, [key]:{...(delta[key]||{}), status:upd.status, deadline:upd.deadline, dateStart:upd.dateStart}};
    setDelta(nd);
    setTabs(prev => { const n=JSON.parse(JSON.stringify(prev)); if(form.category===ci){n[activeTab].categories[ci].tasks[ti]=upd;}else{n[activeTab].categories[ci].tasks.splice(ti,1);n[activeTab].categories[form.category].tasks.push(upd);} return n; });
    const na = {...added, ["__edit__"+activeTab+"::"+ci+"::"+ti]:{ci,ti,task:upd}};
    setAdded(na);
    pushHist(user.name+": modifie "+upd.label, nd,na,comments,history,validations);
  };

  const onDeleteTask = (ci,ti) => {
    const lbl = tabs[activeTab].categories[ci].tasks[ti].label;
    setTabs(prev => { const n=JSON.parse(JSON.stringify(prev)); n[activeTab].categories[ci].tasks.splice(ti,1); return n; });
    const na = {...added, ["__del__"+activeTab+"::"+ci+"::"+ti]:{ci,ti,deletedAt:nowStr()}};
    setAdded(na);
    pushHist(user.name+": supprime "+lbl, delta,na,comments,history,validations);
  };

  const onAddCategory = (name) => {
    setTabs(prev => { const n=JSON.parse(JSON.stringify(prev)); n[activeTab].categories.push({name,tasks:[]}); return n; });
    const na = {...added, ["__cat__"+activeTab+"::"+Date.now()]:{tabName:activeTab,name}};
    setAdded(na);
    pushHist(user.name+": + categorie "+name, delta,na,comments,history,validations);
  };

  const onAddTab = (name) => {
    if (!name.trim()||tabs[name]) return;
    setTabs(prev => ({...prev,[name]:{categories:[]}}));
    setCT(prev => [...prev,name]); setActiveTab(name);
    const na = {...added, ["__newtab__"+name+"::"+Date.now()]:{tabName:name}};
    setAdded(na);
    pushHist(user.name+": + onglet "+name, delta,na,comments,history,validations);
  };

  const onDeleteTab = (name) => {
    setTabs(prev => { const n={...prev}; delete n[name]; return n; });
    setCT(prev => prev.filter(t=>t!==name));
    if (activeTab===name) { const keys=Object.keys(tabs).filter(t=>t!==name); setActiveTab(keys[0]||""); }
    const na = {...added, ["__deltab__"+name+"::"+Date.now()]:{tabName:name}};
    setAdded(na);
    pushHist(user.name+": supprime onglet "+name, delta,na,comments,history,validations);
  };

  const onRenameTab = (oldName,newName) => {
    if (!newName.trim()||tabs[newName]) return;
    setTabs(prev => { const n={}; Object.entries(prev).forEach(([k,v])=>n[k===oldName?newName:k]=v); return n; });
    setCT(prev => prev.map(t=>t===oldName?newName:t));
    if (activeTab===oldName) setActiveTab(newName);
    const na = {...added, ["__renametab__"+oldName+"::"+Date.now()]:{oldName,newName}};
    setAdded(na);
    pushHist(user.name+": renomme \""+oldName+"\" -> \""+newName+"\"", delta,na,comments,history,validations);
  };

  const onDuplicateTab = (srcName,newName) => {
    if (!newName.trim()||tabs[newName]) return;
    const srcData = JSON.parse(JSON.stringify(tabs[srcName]));
    srcData.categories.forEach(cat => cat.tasks.forEach(task => { task.status="A faire"; delete task.dateStart; }));
    setTabs(prev => ({...prev,[newName]:srcData}));
    setCT(prev => [...prev,newName]); setActiveTab(newName);
    const na = {...added, ["__newtab__"+newName+"::"+Date.now()]:{tabName:newName,dupFrom:srcName}};
    setAdded(na);
    pushHist(user.name+": duplique \""+srcName+"\" -> \""+newName+"\"", delta,na,comments,history,validations);
  };

  const onUpdateTaskDates = (tabName,ci,ti,ds,de) => {
    const key = tabName+"::"+ci+"::"+ti;
    const nd = {...delta, [key]:{...(delta[key]||{}), deadline:de, dateStart:ds}};
    setDelta(nd);
    setTabs(prev => { const n=JSON.parse(JSON.stringify(prev)); n[tabName].categories[ci].tasks[ti].deadline=de; n[tabName].categories[ci].tasks[ti].dateStart=ds; return n; });
    pushHist(user.name+": dates -> "+fmtDate(ds)+" "+fmtDate(de), nd,added,comments,history,validations);
  };

  const onExport = () => {
    const blob = new Blob([JSON.stringify({delta,added,comments,history,validations},null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="cemedis-export.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = () => {
    setImportError("");
    try {
      const p = JSON.parse(importText);
      if (!p||typeof p!=="object") throw new Error("Format invalide");
      const nd=p.delta||{}, na=p.added||{}, nc=p.comments||{}, nh=p.history||[], nv=p.validations||{};
      setDelta(nd); setAdded(na); setComments(nc); setHistory(nh); setVal(nv);
      setTabs(buildTabs(nd,na)); scheduleSave(nd,na,nc,nh,nv);
      setShowImport(false); setImportText(""); setMigrated(true);
    } catch(e) { setImportError("JSON invalide: "+(e.message||"erreur")); }
  };

  const onImportFile = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = ev => setImportText(ev.target.result); r.readAsText(f);
  };

  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f7fa",flexDirection:"column",gap:10}}><div style={{fontSize:"2rem"}}>⏳</div><div style={{color:"#4361ee",fontWeight:600}}>Chargement...</div></div>;
  if (!user) return <LoginScreen onLogin={u=>{setUser(u);setPF(u.name);}}/>;

  const bg=dark?"#1a1a2e":"#f0f2f8", txt2=dark?"#e0e0e0":"#212529";
  const tabData = tabs&&tabs[activeTab];
  let fait=0,enc=0,af=0;
  if (tabData) tabData.categories.forEach(c=>c.tasks.forEach(t=>{const s=sc(t.status);if(s==="fait")fait++;else if(s==="encours")enc++;else af++;}));
  const tot=fait+enc+af, pct=tot>0?Math.round(fait/tot*100):0;
  const saveBadge = saveStatus==="saving"?{bg:"#fef3e6",c:"#b97a2e",l:"Sauvegarde..."}
    :saveStatus==="saved"?{bg:"#e6f9f7",c:"#0d8a7e",l:"Sauvegarde OK"}
    :saveStatus==="error"?{bg:"#fde8ea",c:"#e63946",l:"Erreur: "+saveError}
    :null;

  return <div style={{height:"100vh",display:"flex",flexDirection:"column",background:bg,color:txt2,fontFamily:"'Segoe UI',-apple-system,sans-serif",fontSize:"0.85rem",overflow:"hidden"}}>
    <style>{`
      *{box-sizing:border-box;}
      button{font-family:inherit;display:inline-flex;align-items:center;}
      input,select,textarea{font-family:inherit;}
    `}</style>
    <div style={{background:dark?"linear-gradient(90deg,#2a2a5e,#1a1a3e)":"linear-gradient(90deg,#4361ee,#3a0ca3)",color:"white",padding:"0 16px",height:46,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,zIndex:100}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontWeight:700,fontSize:"1rem",letterSpacing:1}}>🦷 CEMEDIS</span>
        {saveBadge&&<span style={{fontSize:"0.7rem",padding:"2px 10px",borderRadius:10,background:saveBadge.bg,color:saveBadge.c,fontWeight:500}}>{saveBadge.l}</span>}
        {sMode===SM.persistent&&<span style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:8,background:"rgba(46,196,182,0.2)",color:"#2ec4b6",border:"1px solid rgba(46,196,182,0.27)"}}>Partage</span>}
        {sMode===SM.local&&<span onClick={async()=>{setSMode(SM.unknown);resetStorage();const m=await detectStorage();setSMode(m);if(m===SM.persistent){try{const s=await sGet(SK);if(s){setDelta(s.delta||{});setAdded(s.added||{});setComments(s.comments||{});setHistory(s.history||[]);setVal(s.validations||{});setTabs(buildTabs(s.delta||{},s.added||{}));}}catch(e){}}}} title="Cliquer pour tenter reconnexion storage partagé" style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:8,background:"rgba(244,162,97,0.2)",color:"#f4a261",border:"1px solid rgba(244,162,97,0.27)",cursor:"pointer",userSelect:"none"}}>Local 🔄</span>}
        {sMode===SM.unknown&&<span style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:8,background:"rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.7)",border:"1px solid rgba(255,255,255,0.2)"}}>⏳ Connexion...</span>}
        {sMode===SM.none&&<span onClick={async()=>{setSMode(SM.unknown);resetStorage();const m=await detectStorage();setSMode(m);}} title="Cliquer pour réessayer" style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:8,background:"rgba(230,57,70,0.2)",color:"#e63946",border:"1px solid rgba(230,57,70,0.27)",cursor:"pointer"}}>Hors ligne 🔄</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        {view==="tasks"&&tabData&&<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.1)",padding:"4px 12px",borderRadius:12,fontSize:"0.72rem"}}><span style={{color:"#2ec4b6",fontWeight:700}}>{fait}</span><span style={{color:"#f4a261"}}>{enc}</span><span style={{color:"#e63946"}}>{af}</span><span style={{color:"rgba(255,255,255,0.7)",fontWeight:700}}>{pct+"%"}</span></div>}
        <button onClick={onExport} style={{background:"rgba(255,255,255,0.12)",color:"white",border:"none",padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:"0.8rem"}}>Export</button>
        <button onClick={()=>{setShowImport(true);setImportText("");setImportError("");}} style={{background:"rgba(255,255,255,0.12)",color:"white",border:"none",padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:"0.8rem"}}>Import</button>
        <button onClick={()=>setShowAdd(true)} style={{background:"#2ec4b6",color:"white",border:"none",padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:"0.78rem",fontWeight:600}}>+</button>
        <button onClick={()=>setDark(!dark)} style={{background:"rgba(255,255,255,0.12)",color:"white",border:"none",padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:"0.8rem"}}>{dark?"☀":"🌙"}</button>
        <button onClick={()=>setShowHist(!showHist)} style={{background:"rgba(255,255,255,0.12)",color:"white",border:"none",padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:"0.8rem"}}>📜</button>
        <button onClick={()=>{setUser(null);setPF(null);}} style={{background:"rgba(255,255,255,0.12)",color:"white",border:"none",padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:"0.8rem"}}>🚪</button>
      </div>
    </div>
    <div style={{flex:1,display:"flex",overflow:"hidden"}}>
      <Sidebar dark={dark} user={user} tabs={tabs||{}} activeTab={activeTab} setActiveTab={setActiveTab} view={view} setView={setView} personFilter={personFilter} setPersonFilter={setPF} statusFilter={statusFilter} setStatusFilter={setSF} search={search} setSearch={setSearch} collapsed={sideCollapsed} setCollapsed={setSC} customTabs={customTabs} onAddTab={onAddTab} onDeleteTab={onDeleteTab} onDuplicateTab={onDuplicateTab} onRenameTab={onRenameTab}/>
      <div style={{flex:1,overflowY:"auto"}}>
        {migrated&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 18px",background:"#e6f9f7",borderBottom:"1px solid #2ec4b6",fontSize:"0.8rem",color:"#0d8a7e"}}><span>Migration reussie depuis une version anterieure.</span><button onClick={()=>setMigrated(false)} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"#0d8a7e",fontWeight:700,fontSize:"0.85rem"}}>x</button></div>}
        {view==="tasks"&&<TaskListView tabData={tabData} activeTab={activeTab} dark={dark} personFilter={personFilter} statusFilter={statusFilter} search={search} comments={comments} validations={validations} onCycleStatus={onCycleStatus} onChangeStatus={onChangeStatus} onSetDeadline={onSetDeadline} onSetDateStart={onSetDateStart} onAddComment={onAddComment} onEditComment={onEditComment} onDeleteComment={onDeleteComment} onEditNote={onEditNote} onEditTask={onEditTask} onDeleteTask={onDeleteTask} onAddCategory={onAddCategory} onTogglePersonValidation={onTogglePersonValidation} onSubTaskAdd={onSubTaskAdd} onSubTaskChange={onSubTaskChange} onSubTaskToggleVal={onSubTaskToggleVal} user={user}/>}
        {view==="calendar"&&<CalendarView tabs={tabs||{}} dark={dark} personFilter={personFilter} statusFilter={statusFilter}/>}
        {view==="gantt"&&<GanttView tabs={tabs||{}} dark={dark} personFilter={personFilter} validations={validations} onUpdateTaskDates={onUpdateTaskDates}/>}
        {view==="transversal"&&<TransversalView tabs={tabs||{}} dark={dark} personFilter={personFilter}/>}
      </div>
    </div>
    {showAdd&&<AddTaskModal tabs={tabs} activeTab={activeTab} dark={dark} user={user} onAdd={onAddTask} onClose={()=>setShowAdd(false)}/>}
    {showImport&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowImport(false)}>
      <div onClick={e=>e.stopPropagation()} style={{background:dark?"#16213e":"white",borderRadius:16,padding:"28px 24px",width:"92%",maxWidth:500,boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><h3 style={{margin:0,color:"#4361ee",fontSize:"1rem"}}>Importer des donnees</h3><button onClick={()=>setShowImport(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1.2rem",color:dark?"#8888aa":"#6c757d"}}>x</button></div>
        <p style={{fontSize:"0.8rem",color:dark?"#8888aa":"#6c757d",margin:"0 0 12px"}}>{"1. Dans l'ancienne version, clique sur Export pour telecharger cemedis-export.json"}<br/>{"2. Charge le fichier ou colle le contenu JSON puis clique Importer"}</p>
        <div style={{marginBottom:10}}><label style={{display:"inline-block",padding:"7px 14px",background:"#4361ee",color:"white",borderRadius:8,cursor:"pointer",fontSize:"0.8rem",fontWeight:600}}>Choisir fichier .json<input type="file" accept=".json,application/json" onChange={onImportFile} style={{display:"none"}}/></label>{importText&&<span style={{fontSize:"0.75rem",color:"#2ec4b6",marginLeft:10}}>Fichier charge</span>}</div>
        <textarea value={importText} onChange={e=>{setImportText(e.target.value);setImportError("");}} placeholder="ou colle le contenu JSON ici..." rows={8} style={{width:"100%",padding:"10px 12px",border:"1px solid "+(dark?"#3a3a5e":"#dee2e6"),borderRadius:8,fontSize:"0.75rem",fontFamily:"monospace",background:dark?"#1e2a4a":"#f8f9fa",color:dark?"#e0e0e0":"#212529",boxSizing:"border-box",resize:"vertical",outline:"none"}}/>
        {importError&&<div style={{color:"#e63946",fontSize:"0.76rem",marginTop:6}}>{importError}</div>}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={onImport} disabled={!importText.trim()} style={{flex:1,padding:"10px 0",background:importText.trim()?"#4361ee":"#adb5bd",color:"white",border:"none",borderRadius:10,cursor:importText.trim()?"pointer":"not-allowed",fontWeight:700,fontSize:"0.88rem"}}>Importer</button>
          <button onClick={()=>setShowImport(false)} style={{padding:"10px 18px",background:"transparent",border:"1px solid "+(dark?"#3a3a5e":"#dee2e6"),borderRadius:10,cursor:"pointer",color:dark?"#8888aa":"#6c757d",fontSize:"0.88rem"}}>Annuler</button>
        </div>
      </div>
    </div>}
    {showHist&&<div style={{position:"fixed",top:46,right:0,width:300,bottom:0,background:dark?"#16213e":"white",boxShadow:"-4px 0 20px rgba(0,0,0,0.12)",zIndex:999,overflowY:"auto",padding:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontWeight:700,fontSize:"0.88rem",color:"#4361ee"}}>Historique</span><button onClick={()=>setShowHist(false)} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1rem",color:dark?"#8888aa":"#6c757d"}}>x</button></div>
      {history.length===0?<p style={{color:dark?"#8888aa":"#6c757d",fontSize:"0.8rem"}}>Aucune modification.</p>:history.map((h,i)=><div key={i} style={{padding:"6px 0",borderBottom:"1px solid "+(dark?"#3a3a5e":"#dee2e6"),fontSize:"0.76rem"}}><div style={{fontSize:"0.66rem",color:dark?"#8888aa":"#6c757d"}}>{h.time}</div><div style={{marginTop:1}}>{h.action}</div></div>)}
    </div>}
  </div>;
}
