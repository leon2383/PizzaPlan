import React, { useEffect, useMemo, useState } from "react";
import "./style.css";\nif ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));

const STORE_KEY = "pizzaplan_v1";
const days = [
  {name:"Montag", shifts:[]},
  {name:"Dienstag", shifts:[]},
  {name:"Mittwoch", shifts:["Abend"]},
  {name:"Donnerstag", shifts:["Abend"]},
  {name:"Freitag", shifts:["Abend"]},
  {name:"Samstag", shifts:["Abend"]},
  {name:"Sonntag", shifts:["Mittag","Abend"]},
];

function mondayFor(offset=0) {
  const d = new Date(); const dow=d.getDay(); d.setDate(d.getDate()+(dow===0?-6:1-dow)+offset*7);
  d.setHours(0,0,0,0); return d;
}
function fmt(d){ return d.toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit"}); }
function weekNumber(date) {
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-yearStart)/86400000)+1)/7);
}
export default function App(){
  const [employees,setEmployees]=useState(["Mitarbeiter 1","Mitarbeiter 2"]);
  const [name,setName]=useState("");
  const [offset,setOffset]=useState(0);
  const [holiday,setHoliday]=useState(false);
  const [assignments,setAssignments]=useState({});
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    try { const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"null");
      if(saved){setEmployees(saved.employees||[]);setAssignments(saved.assignments||{});}
    }catch{}
  },[]);
  useEffect(()=>{
    try { localStorage.setItem(STORE_KEY,JSON.stringify({employees,assignments})); }catch{}
  },[employees,assignments]);
  const monday=mondayFor(offset);
  const dateFor=(i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return d;};
  const key=(i,s)=>`${dateFor(i).toISOString().slice(0,10)}_${s}`;
  const required=(i,s)=>holiday&&i>=2&&i<=4?2:(i===5||i===6?2:1);
  const add=()=>{const n=name.trim();if(!n)return;if(employees.includes(n)){setNotice("Dieser Name ist bereits vorhanden.");return;}setEmployees(p=>[...p,n]);setName("");setNotice("");};
  const remove=(e)=>{setEmployees(p=>p.filter(x=>x!==e));setAssignments(p=>{const q={...p};Object.keys(q).forEach(k=>q[k]=q[k].filter(x=>x!==e));return q;});};
  const toggle=(i,s,e)=>{const k=key(i,s);setAssignments(p=>{const arr=p[k]||[];return {...p,[k]:arr.includes(e)?arr.filter(x=>x!==e):[...arr,e]};});};
  const clearWeek=()=>{if(!confirm("Alle Einteilungen dieser Woche entfernen?"))return;const start=monday.toISOString().slice(0,10);const end=dateFor(6).toISOString().slice(0,10);setAssignments(p=>{const q={...p};for(const k of Object.keys(q)){const date=k.slice(0,10);if(date>=start&&date<=end)delete q[k];}return q;});};
  const exportWeek=()=>{
    let lines=["PizzaPlan – KW "+weekNumber(monday),""];
    days.forEach((day,i)=>{lines.push(day.name+" ("+fmt(dateFor(i))+")");if(!day.shifts.length)lines.push("Ruhetag");day.shifts.forEach(s=>{const arr=assignments[key(i,s)]||[];lines.push(s+": "+(arr.length?arr.join(", "):"—"));});lines.push("");});
    const blob=new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="PizzaPlan-KW"+weekNumber(monday)+".txt";a.click();URL.revokeObjectURL(url);
  };
  return <div className="app">
    <header><div className="brand"><span className="pizza">🍕</span><div><h1>PizzaPlan</h1><small>Service · Dienstplanung</small></div></div><span className="tag">BETA</span></header>
    <main>
      <section className="week panel"><button className="arrow" onClick={()=>setOffset(v=>v-1}>‹</button><div className="weekinfo"><strong>Kalenderwoche {weekNumber(monday)}</strong><span>{fmt(monday)} – {fmt(dateFor(6))}</span></div><button className="arrow" onClick={()=>setOffset(v=>v+1)}>›</button></section>
      <section className="holiday panel"><div><strong>Feiertagsmodus</strong><p>Mittwoch–Freitag mit 2 Mitarbeitenden planen</p></div><button className={"switch "+(holiday?"on":"")} role="switch" aria-checked={holiday} onClick={()=>setHoliday(v=>!v)}><span/></button></section>
      <section><div className="sectionhead"><h2>Wochenplan</h2><button className="plain" onClick={clearWeek}>Woche leeren</button></div>
      {days.map((day,i)=><article className="day panel" key={day.name}><div className="dayhead"><h3>{day.name}</h3><span>{fmt(dateFor(i))}</span></div>
      {!day.shifts.length?<div className="closed">Ruhetag</div>:day.shifts.map(s=>{const k=key(i,s),assigned=assignments[k]||[],needed=required(i,s);return <div className="shift" key={s}><div className="shifthead"><b>{s}</b><span className={assigned.length===needed?"count good":"count"}>{assigned.length} / {needed} eingeteilt</span></div><div className="chips">{employees.map(e=><button key={e} className={"chip "+(assigned.includes(e)?"selected":"")} onClick={()=>toggle(i,s,e)}>{assigned.includes(e)?'✓ ':'＋ '}{e}</button>)}</div>{assigned.length>needed&&<div className="warn">Mehr als die Sollbesetzung.</div>}{!employees.length&&<small>Erst Mitarbeiter hinzufügen.</small>}</div>})}</article>)}
      </section>
      <section className="panel staff"><h2>Mitarbeiter</h2><div className="addrow"><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Name hinzufügen"/><button className="add" onClick={add}>+</button></div>{notice&&<p className="notice">{notice}</p>}{employees.map(e=><div className="person" key={e}><span>{e}</span><button onClick={()=>remove(e)}>Entfernen</button></div>)}{!employees.length&&<p className="muted">Noch keine Mitarbeitenden.</p>}</section>
      <section className="actions"><button className="primary" onClick={exportWeek}>Woche exportieren</button><button className="secondary" onClick={()=>setOffset(0)}>Zur aktuellen Woche</button></section>
      <p className="footnote">PizzaPlan · Daten werden lokal auf diesem Gerät gespeichert.</p>
    </main>
  </div>;
}
