let db=null;
let slots=[]; let speakers=[]; let candidates=[]; let myVotes=new Set(); let fundraisingTargets=[];
let access={name:localStorage.getItem('reviewerName')||'', code:localStorage.getItem('inviteCode')||'', verified:false, can_vote:false, can_add:false, can_export:false, can_view_fundraising:false, role:null, is_public:false};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const slotLabel=s=>`${s.scenario} · ${s.time_label} · ${s.title}`;
function status(t,cls=''){const el=$('connectionStatus'); el.textContent=t; el.className='status-strip '+cls;}
function msg(id,t,cls='muted'){const el=$(id); el.textContent=t; el.className='message '+cls;}
function priorityClass(p){p=String(p||'').toLowerCase(); if(p.includes('team'))return'team'; if(p.includes('asp'))return'asp'; if(p.includes('high'))return'high'; return'medium';}
function classifyLinkType(u){u=String(u||'').toLowerCase(); if(u.includes('linkedin.'))return'linkedin'; if(u.includes('scholar.google')||u.includes('orcid.'))return'scholar'; if(u.includes('github.'))return'github'; return'website';}
function speakerLinkList(s){const out=[],seenType=new Set(); const add=(url,type)=>{if(!url)return; url=String(url).trim(); if(!url||url==='#')return; type=type||classifyLinkType(url); if(seenType.has(type))return; seenType.add(type); out.push({url,type});}; add(s.linkedin_url,'linkedin'); add(s.website_url,'website'); add(s.portfolio_url,'portfolio'); add(s.scholar_url,'scholar'); add(s.profile_url); return out;}
function primaryLink(s){const l=speakerLinkList(s); return l.length?l[0].url:'';}
function linkIcon(t){const I={
linkedin:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05 4.02 0 4.76 2.65 4.76 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21H9V9Z"/></svg>',
website:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>',
portfolio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
scholar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/></svg>',
github:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>'
}; return I[t]||I.website;}
function linksRow(s){const links=speakerLinkList(s); if(!links.length)return''; return `<div class="spk-links">${links.map(l=>`<a class="spk-link spk-${l.type}" href="${esc(l.url)}" target="_blank" rel="noopener" title="${esc(l.type)}" aria-label="${esc(l.type)} link" onclick="event.stopPropagation()">${linkIcon(l.type)}</a>`).join('')}</div>`;}
// Real photos committed under assets/speakers/ (keyed by name slug). Anyone not listed falls back to a generated monogram.
const SPEAKER_PHOTOS={'amr-awadallah':'amr-awadallah.jpg','omar-maher':'omar-maher.webp','mona-diab':'mona-diab.jpg','aboul-ella-hassanien':'aboul-ella-hassanien.jpg','mahmoud-abdel-aty':'mahmoud-abdel-aty.jpg','maggie-mashaly':'maggie-mashaly.jpg','nermin-kamal-negied':'nermin-kamal-negied.jpg','haitham-s-hamza':'haitham-s-hamza.jpg','mona-farouk':'mona-farouk.jpg','laila-hussein-shoukry':'laila-hussein-shoukry.jpg','hazem-ali':'hazem-ali.jpg','mahmoud-khaled-abdelkader':'mahmoud-khaled-abdelkader.jpg','hossam-eldin-mahmoud':'hossam-eldin-mahmoud.jpg','youssef-bastawisy':'youssef-bastawisy.jpg','osama-elzero':'osama-elzero.jpg','asmaa-ahmed-e-osman':'asmaa-ahmed-e-osman.jpg','ali-elshenawy':'ali-elshenawy.jpg','ahmed-abdellatif':'ahmed-abdellatif.jpg','muhammad-gawish':'muhammad-gawish.jpg','mohamed-shawky':'mohamed-shawky.jpg','ramy-ahmed':'ramy-ahmed.jpg'};
function spkSlug(name){return String(name||'').toLowerCase().replace(/\b(dr|prof|professor|eng|mr|mrs|ms|miss)\.?\s+/g,'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function spkInitials(name){const n=String(name||'').replace(/\b(dr|prof|professor|eng|mr|mrs|ms|miss)\.?\s+/gi,'').trim().split(/\s+/).filter(Boolean); if(!n.length)return'?'; const a=n[0][0]||''; const b=n.length>1?n[n.length-1][0]:''; return (a+b).toUpperCase();}
function spkHue(name){let h=0; const s=String(name||''); for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0; return h%360;}
function spkMonogram(name){const hue=spkHue(name),h2=(hue+38)%360,ini=spkInitials(name); const svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl('+hue+', 58%, 46%)"/><stop offset="1" stop-color="hsl('+h2+', 64%, 30%)"/></linearGradient></defs><rect width="120" height="120" fill="url(#g)"/><text x="60" y="60" dy=".35em" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="46" font-weight="700" fill="#ffffff">'+ini+'</text></svg>'; return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
function speakerAvatar(s){const name=s.name||''; const fb=spkMonogram(name); let real=s.photo_url||s.image_url||s.avatar_url||s.photo||''; if(!real){const f=SPEAKER_PHOTOS[spkSlug(name)]; if(f)real='assets/speakers/'+f;} if(real)return '<img class="spk-avatar" src="'+esc(real)+'" data-fb="'+esc(fb)+'" alt="'+esc(name)+'" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=this.dataset.fb">'; return '<img class="spk-avatar" src="'+esc(fb)+'" alt="'+esc(name)+'" loading="lazy" decoding="async">';}
function initClient(){
  if(!window.INDABAX_SUPABASE_URL || window.INDABAX_SUPABASE_URL.includes('YOUR_PROJECT')){ status('Supabase config is not set. Add your project URL and anon key in assets/config.js.', 'error'); return null; }
  return window.supabase.createClient(window.INDABAX_SUPABASE_URL, window.INDABAX_SUPABASE_ANON_KEY);
}
async function loadData(){
  if(!db)return;
  if(!access.verified || !access.code){ status('Ready. Enter the access code shared with you to open the workspace.', 'ok'); renderAccessControls(); return; }
  status('Loading program workspace…');
  const {data,error}=await db.rpc('get_program_data',{p_invite_code:access.code});
  if(error||!data){console.error(error); status('Could not load the program workspace. Check the access code or setup.', 'error'); return;}
  slots=data.slots||[]; speakers=data.speakers||[]; candidates=data.candidates||[];
  status('Program workspace loaded.', 'ok');
  populateProposalSlots(); await loadMyVotes(); renderAccessControls(); renderAll();
}
async function verifyAccess(){
  const name=$('reviewerName').value.trim(); const code=$('inviteCode').value.trim();
  if(!code){msg('accessMessage','Enter the access code.');return;}
  const displayName=name||'Guest';
  const {data,error}=await db.rpc('verify_reviewer',{p_display_name:displayName,p_invite_code:code});
  if(error||!data||!data.ok){msg('accessMessage',(data&&data.message)||'Access denied. Check the name and invite code.','error');return;}
  access={...access,name:displayName,code,verified:true,can_vote:!!data.can_vote,can_add:!!data.can_add,can_export:!!data.can_export,can_view_fundraising:!!data.can_view_fundraising,role:data.role,is_public:!!data.is_public};
  localStorage.setItem('reviewerName',displayName); localStorage.setItem('inviteCode',code);
  msg('accessMessage','Workspace opened successfully.','ok');
  await loadData(); if(access.can_view_fundraising) await loadFundraising();
}
function renderAccessControls(){
  const canAdd=access.verified&&access.can_add;
  $('add-speaker-panel').classList.toggle('disabled',!canAdd);
  $('admin').classList.toggle('hidden',!(access.verified&&access.can_export));
  $('adminNav').classList.toggle('hidden',!(access.verified&&access.can_export));
  $('fundraising').classList.toggle('hidden',!(access.verified&&access.can_view_fundraising));
  $('fundraisingNav').classList.toggle('hidden',!(access.verified&&access.can_view_fundraising));
  const fTab=$('fundraisingTab'); if(fTab) fTab.classList.toggle('hidden',!(access.verified&&access.can_view_fundraising));
  const sTab=$('suggestTab'); if(sTab) sTab.classList.toggle('hidden',!(access.verified&&access.can_add));
  // hide the "Open workspace" access card + its nav link once signed in
  $('access').classList.toggle('hidden', !!access.verified);
  const aNav=$('accessNav'); if(aNav) aNav.classList.toggle('hidden', !!access.verified);
}
async function loadMyVotes(){
  myVotes=new Set();
  if(!db||!access.code||!access.can_vote)return;
  const {data,error}=await db.rpc('my_votes',{p_invite_code:access.code});
  if(!error&&data)data.forEach(v=>myVotes.add(v.slot_candidate_id));
}
async function castVote(id){
  if(!access.verified){msg('accessMessage','Verify access first.');location.hash='#access';return;}
  if(!access.can_vote){return;}
  const {data,error}=await db.rpc('cast_vote',{p_invite_code:access.code,p_slot_candidate_id:id});
  if(error||!data||!data.ok){alert((data&&data.message)||'Vote could not be saved.');return;}
  myVotes.add(id); renderAll();
}
async function removeVote(id){
  if(!access.verified||!access.can_vote){return;}
  const {data,error}=await db.rpc('remove_vote',{p_invite_code:access.code,p_slot_candidate_id:id});
  if(error||!data||!data.ok){alert((data&&data.message)||'Vote could not be removed.');return;}
  myVotes.delete(id); renderAll();
}
async function submitProposal(e){
  e.preventDefault();
  if(!access.verified||!access.can_add){msg('proposalMessage','Speaker suggestions are not enabled for this access.','error');return;}
  const payload={p_invite_code:access.code,p_slot_id:$('proposalSlot').value,p_name:$('proposalName').value.trim(),p_title:$('proposalTitle').value.trim(),p_org:$('proposalOrg').value.trim(),p_focus:$('proposalFocus').value.trim(),p_profile_url:$('proposalLink').value.trim(),p_fit_note:$('proposalFit').value.trim()};
  if(!payload.p_slot_id||!payload.p_name){msg('proposalMessage','Select an event and enter speaker name.');return;}
  const {data,error}=await db.rpc('submit_speaker_proposal',payload);
  if(error||!data||!data.ok){msg('proposalMessage',(data&&data.message)||'Proposal could not be saved.','error');return;}
  e.target.reset(); msg('proposalMessage','Speaker proposal saved and added to the selected event.','ok'); await loadData();
}
function candidateCard(c){
  const s=c.speakers; const voted=myVotes.has(c.id); const source=c.source==='team_proposed'?'Team proposed':(c.priority||s.priority||'Medium');
  let voteHtml='';
  if(access.verified&&access.can_vote){ voteHtml=voted?`<div class="vote-row"><button class="vote-btn voted" disabled>Voted</button><button class="vote-btn remove" onclick="removeVote('${c.id}')">Remove my vote</button></div>`:`<div class="vote-row"><button class="vote-btn" onclick="castVote('${c.id}')">Vote</button></div>`; }
  return `<div class="candidate"><div class="candidate-head">${speakerAvatar(s)}<div class="cand-id"><strong>${esc(s.name)}</strong><small>${esc(s.title)}${s.org?', '+esc(s.org):''}</small></div><span class="pill ${priorityClass(source)}">${esc(source)}</span></div><div class="pill-row">${(s.focus||[]).slice(0,4).map(f=>`<span class="pill">${esc(f)}</span>`).join('')}</div>${s.fit?`<div class="fit">${esc(s.fit)}</div>`:''}${linksRow(s)}${voteHtml}</div>`;
}
function renderScenario(scenario,containerId){
  const list=slots.filter(s=>s.scenario===scenario).sort((a,b)=>a.sort_order-b.sort_order);
  $(containerId).innerHTML=list.map(slot=>{const cs=candidates.filter(c=>c.slot_id===slot.id); const body=cs.length?`<div class="candidate-grid">${cs.map(candidateCard).join('')}</div>`:'<div class="empty">No speaker candidates assigned to this slot.</div>'; return `<article class="schedule-card"><div class="slot-head"><div class="time">${esc(slot.time_label)}</div><div class="slot-title">${esc(slot.title)}</div><div class="room">${esc(slot.room)}</div><div class="slot-role">${esc(slot.role_type)}</div></div><div class="slot-body">${body}</div></article>`;}).join('');
}
function renderSpeakers(){
  const q=($('searchSpeakers').value||'').toLowerCase(); const p=$('filterPriority').value; const ids=new Set(candidates.map(c=>c.speaker_id)); let list=speakers.filter(s=>ids.has(s.id));
  if(q)list=list.filter(s=>[s.name,s.title,s.org,(s.focus||[]).join(' '),s.fit].join(' ').toLowerCase().includes(q));
  if(p)list=list.filter(s=>p==='Team proposed'?s.status==='team_proposed':s.priority===p);
  $('speakerDirectory').innerHTML=list.map((s,i)=>{const pr=s.status==='team_proposed'?'Team proposed':(s.priority||'Medium'); const pl=primaryLink(s); return `<div class="speaker-card${pl?' clickable':''}"${pl?` data-href="${esc(pl)}" role="link" tabindex="0" aria-label="Open profile for ${esc(s.name)}"`:''}><div class="spk-head">${speakerAvatar(s)}<div class="spk-id"><h3>${esc(s.name)}</h3><div class="title">${esc(s.title)}${s.org?', '+esc(s.org):''}</div></div><span class="rank">${i+1}</span></div><div class="pill-row"><span class="pill ${priorityClass(pr)}">${esc(pr)}</span>${(s.focus||[]).slice(0,5).map(f=>`<span class="pill">${esc(f)}</span>`).join('')}</div><div class="fit">${esc(s.fit||'')}</div>${linksRow(s)}</div>`;}).join('')||'<div class="empty">No speakers match the selected filters.</div>';
}
function populateProposalSlots(){ $('proposalSlot').innerHTML='<option value="">Select event / session</option>'+slots.map(s=>`<option value="${esc(s.id)}">${esc(slotLabel(s))}</option>`).join(''); }
async function loadFundraising(){
  if(!access.can_view_fundraising)return;
  const {data,error}=await db.rpc('get_fundraising_targets',{p_invite_code:access.code});
  if(error){$('fundraisingList').innerHTML='<div class="empty">Fundraising access denied.</div>';return;}
  fundraisingTargets=data||[]; renderFundraising();
}
function renderFundraising(){
  const q=($('searchFunders').value||'').toLowerCase(); let list=fundraisingTargets;
  if(q) list=list.filter(f=>Object.values(f).join(' ').toLowerCase().includes(q));
  $('fundraisingList').innerHTML=list.map(f=>`<div class="funder-card"><div class="topline"><h3>${esc(f.name)}</h3><span class="rank">${esc(f.rank)}</span></div><div class="pill-row"><span class="pill high">${esc(f.priority)}</span><span class="pill medium">${esc(f.likelihood)}</span><span class="pill">${esc(f.category)}</span></div><div class="funder-meta"><div><b>Suggested ask:</b> ${esc(f.ask)}</div><div><b>Contact path:</b> ${esc(f.contact_path)}</div><div><b>Why likely:</b> ${esc(f.rationale)}</div><div><b>Status:</b> ${esc(f.status)}</div></div></div>`).join('')||'<div class="empty">No funders match the filter.</div>';
}
async function loadAdminSummary(){
  if(!access.verified||!access.can_export){msg('adminMessage','Admin dashboard is not available for this access.','error');return;}
  const {data,error}=await db.rpc('admin_vote_summary',{p_admin_code:access.code});
  if(error){msg('adminMessage','Could not load vote summary.','error');return;}
  msg('adminMessage','Vote summary loaded.','ok');
  $('adminSummary').innerHTML=renderTable(data||[]);
}
function renderTable(rows){if(!rows.length)return'<div class="empty">No votes recorded yet.</div>'; const headers=['scenario','time_label','event_title','speaker_name','votes']; return `<table><thead><tr>${headers.map(h=>`<th>${h.replaceAll('_',' ')}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${headers.map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
async function adminExport(format){
  if(!access.verified||!access.can_export){msg('adminMessage','Admin export is not available for this access.','error');return;}
  const {data,error}=await db.rpc('admin_export_votes',{p_admin_code:access.code});
  if(error){msg('adminMessage','Export failed.','error');return;}
  const rows=data||[]; const now=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  if(format==='json')download(`indabax-votes-${now}.json`,JSON.stringify(rows,null,2),'application/json');
  else download(`indabax-votes-${now}.csv`,toCsv(rows),'text/csv;charset=utf-8');
}
function toCsv(rows){if(!rows.length)return''; const headers=Object.keys(rows[0]); const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"'; return [headers.map(cell).join(','),...rows.map(r=>headers.map(h=>cell(r[h])).join(','))].join('\n');}
function download(filename,content,type){const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);}
function renderAll(){renderAccessControls(); renderScenario('A','scenarioAContainer'); renderScenario('B','scenarioBContainer'); renderSpeakers(); if(access.can_view_fundraising) renderFundraising();}
window.addEventListener('DOMContentLoaded',async()=>{
  const params=new URLSearchParams(location.search);
  const paramName=params.get('name');
  const paramCode=params.get('code')||params.get('invite');
  if(paramName){ access.name=paramName; localStorage.setItem('reviewerName',paramName); }
  if(paramCode){ access.code=paramCode; localStorage.setItem('inviteCode',paramCode); }
  $('reviewerName').value=access.name;
  $('inviteCode').value=access.code;
  $('verifyAccessBtn').addEventListener('click',verifyAccess);
  ['reviewerName','inviteCode'].forEach(id=>$(id).addEventListener('keydown',e=>{ if(e.key==='Enter') verifyAccess(); }));
  $('speakerForm').addEventListener('submit',submitProposal);
  $('searchSpeakers').addEventListener('input',renderSpeakers);
  $('filterPriority').addEventListener('change',renderSpeakers);
  $('speakerDirectory').addEventListener('click',e=>{ if(e.target.closest('a'))return; const card=e.target.closest('.speaker-card.clickable'); if(card&&card.dataset.href) window.open(card.dataset.href,'_blank','noopener'); });
  $('speakerDirectory').addEventListener('keydown',e=>{ if(e.key!=='Enter')return; const card=e.target.closest&&e.target.closest('.speaker-card.clickable'); if(card&&card.dataset.href) window.open(card.dataset.href,'_blank','noopener'); });
  $('searchFunders').addEventListener('input',renderFundraising);
  $('adminSummaryBtn').addEventListener('click',loadAdminSummary);
  $('exportCsvBtn').addEventListener('click',()=>adminExport('csv'));
  $('exportJsonBtn').addEventListener('click',()=>adminExport('json'));
  db=initClient();
  if(db){
    status('Ready. Enter the access code shared with you to open the workspace.', 'ok');
    if(access.code){ await verifyAccess(); } else { renderAccessControls(); }
  }
});
