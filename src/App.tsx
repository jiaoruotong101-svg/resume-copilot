import {useEffect,useState} from 'react';
import {emptyProfile,validateProfile,type ResumeProfile} from './profile';
import {loadLibraryText,loadProfile,removeProfile,saveResumeLibrary} from './storage';
import {mergeResumeLibraryTemplate,parseResumeText} from './parser';
import {HuaweiAdapter,type PageResult} from './adapter';

const statuses={filled:'已填写',review:'需确认',unknown:'手动填写',skipped:'已保留',ok:'一致'};

export default function App() {
  const [profile,setProfile]=useState<ResumeProfile>(emptyProfile);
  const [tab,setTab]=useState<'fill'|'profile'>('profile');
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [notice,setNotice]=useState('');
  const [failure,setFailure]=useState(false);
  const [result,setResult]=useState<PageResult|null>(null);
  const [url,setUrl]=useState('');
  const [deleteArmed,setDeleteArmed]=useState(false);
  const [onlyPending,setOnlyPending]=useState(false);
  const extension=!!globalThis.chrome?.runtime?.id;

  useEffect(()=>{Promise.all([loadProfile(),loadLibraryText()]).then(([savedProfile,savedText])=>{setProfile(savedProfile);setText(savedText);setReady(true);if(savedProfile.basicInfo.name)setTab('fill');}).catch(()=>{setNotice('读取内容库失败，请检查本地存储；为保护原数据，已暂停编辑。');setFailure(true);});},[]);
  useEffect(()=>{
    if(!extension) return;
    const refresh=()=>{void chrome.tabs.query({active:true,currentWindow:true}).then(tabs=>{setUrl(tabs[0]?.url??'');setResult(null);});};
    const updated=(id:number,change:{url?:string;status?:string},updatedTab:chrome.tabs.Tab)=>{if(updatedTab.active&&(change.url||change.status==='loading'))refresh();};
    refresh();chrome.tabs.onActivated.addListener(refresh);chrome.tabs.onUpdated.addListener(updated);
    return ()=>{chrome.tabs.onActivated.removeListener(refresh);chrome.tabs.onUpdated.removeListener(updated);};
  },[extension]);

  function changeText(value:string){setText(value);setDirty(true);setResult(null);setDeleteArmed(false);}
  async function act(fn:()=>Promise<void>) {setBusy(true);setNotice('');setFailure(false);try {await fn();}catch(e){setNotice(e instanceof Error?e.message:'操作失败，请重试');setFailure(true);}finally{setBusy(false);}}
  function parseLibrary(){if(!text.trim())throw new Error('请先粘贴内容或补全通用模板');const parsed=parseResumeText(text);setProfile(parsed);setDirty(true);setResult(null);setNotice(`已识别 ${parsed.libraryFields.length} 个有内容的字段，请核对下方预览后保存。`);}
  async function saveLibrary(){
    if(!text.trim()) throw new Error('简历内容库不能为空');
    const parsed=parseResumeText(text),errors=validateProfile(parsed);
    if(errors.length) throw new Error(errors.join('；'));
    await saveResumeLibrary(parsed,text);setProfile(parsed);setDirty(false);setResult(null);setNotice('简历内容库已保存在本机，可以前往填写助手。');
  }
  async function run(fill:boolean) {
    if(dirty) throw new Error('请先保存已修改的简历内容库，再操作网页');
    const issues=validateProfile(profile);if(issues.length)throw new Error(issues.join('；'));
    if(!extension) throw new Error('这是界面预览。请在 Chrome / Edge 中加载 dist 文件夹后使用填表功能');
    const [active]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!active?.id||!new HuaweiAdapter().matches(active.url??'')) throw new Error('未识别到华为招聘标签页。请确认当前页面属于 https://career.huawei.com，并在扩展管理页允许本扩展访问该网站');
    setUrl(active.url??'');
    try {await chrome.scripting.executeScript({target:{tabId:active.id},files:['content.js']});}catch{throw new Error('无法访问当前页面。请允许本扩展访问 career.huawei.com，然后刷新网页重试');}
    const response=await chrome.tabs.sendMessage(active.id,{type:'COPILOT_RUN',fill,profile});
    if(response.error) throw new Error(response.error);
    const [latest]=await chrome.tabs.query({active:true,currentWindow:true});
    if(latest?.id!==active.id) throw new Error('操作期间切换了标签页，请回到原页面检查结果');
    setResult(response.result);setNotice(fill?'填写完成，请逐项核对。最终申请由你在网页上提交。':'页面扫描完成，请查看字段匹配结果。');
  }

  const canFill=new HuaweiAdapter().matches(url);
  const coreCount=[profile.basicInfo.name,profile.basicInfo.phone,profile.basicInfo.email].filter(Boolean).length;
  return <main>
    <header><div className="brand"><svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><rect x="3" y="3" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.8"/><path d="m8 13 3 3 7-7" stroke="currentColor" strokeWidth="1.8"/></svg><strong>求职 Copilot</strong></div><span className="version">{extension?`V${chrome.runtime.getManifest().version}`:'预览'}</span></header>
    <nav aria-label="主要功能"><button className={tab==='fill'?'active':''} onClick={()=>setTab('fill')}>填写助手</button><button className={tab==='profile'?'active':''} onClick={()=>setTab('profile')}>简历内容库{dirty?' · 未保存':''}</button></nav>
    {!extension&&<p className="preview">界面预览模式 · 网页填表需加载浏览器扩展</p>}
    {notice&&<p className={failure?'notice error':'notice'} role={failure?'alert':'status'}>{notice}</p>}
    <fieldset className="workspace" disabled={busy||!ready}>
    {tab==='profile'?<>
      <section className="intro"><h1>维护一次，按页面匹配。</h1><p>使用“字段名：内容”格式；内容库只保存在本机。</p></section>
      <section>
        <div className="section-heading"><h2>简历文字内容库</h2><button className="text-button" onClick={()=>changeText(mergeResumeLibraryTemplate(text))}>补全通用模板</button></div>
        <p className="hint">没有的信息留空。多段经历复制章节并修改序号；职责描述支持换行。保存时会自动解析。</p>
        <label>内容库<textarea className="library" rows={28} value={text} placeholder="点击“补全通用模板”，填写后保存。" onChange={e=>changeText(e.target.value)}/></label>
        <button className="secondary full" onClick={()=>void act(async()=>parseLibrary())}>解析并预览</button>
      </section>
      <section><div className="section-heading"><h2>识别预览</h2><span>{dirty?'文字已修改，请重新预览或保存':`${profile.libraryFields.length} 个有内容字段`}</span></div>
        <dl><div><dt>姓名</dt><dd>{profile.basicInfo.name||'未识别'}</dd></div><div><dt>手机号</dt><dd>{profile.basicInfo.phone?'已识别':'未识别'}</dd></div><div><dt>邮箱</dt><dd>{profile.basicInfo.email||'未识别'}</dd></div><div><dt>教育经历</dt><dd>{profile.education.length} 段</dd></div></dl>
        {!!profile.education.length&&<ul className="preview-list">{profile.education.map((education,index)=><li key={index}>{education.school}{education.major?` · ${education.major}`:''}{education.degree?` · ${education.degree}`:''}</li>)}</ul>}
      </section>
      <details><summary>隐私与数据管理</summary><p className="hint">证件、政治面貌、薪资、授权等敏感字段可以保存在内容库中，但扩展默认不会自动填写。内容库未加密，请勿在共用电脑保存。</p>
        <button className="danger" onClick={()=>void act(async()=>{if(!deleteArmed){setDeleteArmed(true);setNotice('再次点击“确认删除”才会清除本机内容库。');return;}await removeProfile();setProfile(emptyProfile());setText('');setDirty(false);setResult(null);setDeleteArmed(false);setNotice('本机简历内容库已删除');})}>{deleteArmed?'确认删除':'删除本机内容库'}</button>
      </details>
      <div className="save-bar"><button className="primary" onClick={()=>void act(saveLibrary)}>{busy?'正在处理…':'保存简历内容库'}</button><span>{dirty?'修改尚未保存':'本地存储 · 不上传云端'}</span></div>
    </>:<>
      <section className="intro"><h1>读取当前页面，再匹配内容库。</h1><p>每次操作都会重新扫描当前可见表单，不使用上一页的字段结构。</p></section>
      <section className="site"><span className="site-dot" data-ready={canFill}/><div><h2>{canFill?'Huawei Careers':'等待华为招聘页面'}</h2><p>{canFill?'已连接，先扫描匹配再填写': '请将当前标签切换到 career.huawei.com'}</p></div></section>
      <section><div className="section-heading"><h2>内容库状态</h2><button className="text-button" onClick={()=>setTab('profile')}>编辑内容库</button></div><dl><div><dt>核心信息</dt><dd>{coreCount} / 3</dd></div><div><dt>可匹配字段</dt><dd>{profile.libraryFields.length} 项</dd></div><div><dt>教育经历</dt><dd>{profile.education.length} 段</dd></div><div><dt>保存状态</dt><dd>{dirty?'有未保存修改':'已同步本机'}</dd></div></dl></section>
      <button className="secondary full" disabled={!canFill||dirty} onClick={()=>void act(()=>run(false))}>扫描并匹配当前页面</button>
      <button className="primary full" disabled={!canFill||!result||!profile.basicInfo.name||dirty} onClick={()=>void act(()=>run(true))}>{busy?'正在处理…':'填写已匹配字段'}</button><p className="hint">{dirty?'请先保存内容库。':!result?'先扫描页面，核对下方拟填写内容。':'保留网页已有内容；填写后请重新扫描核对。'}</p>
      <section><h2>字段匹配结果</h2>{!result?<div className="empty">尚未扫描页面。<p>先扫描，确认匹配结果后再填写。</p></div>:<>
        <div className="result-summary"><span>已填写 <b>{result.fields.filter(f=>f.status==='filled').length}</b></span><span>一致 <b>{result.fields.filter(f=>f.status==='ok').length}</b></span><span>需处理 <b>{result.fields.filter(f=>['review','unknown'].includes(f.status)).length}</b></span></div>
        <button className="filter-button" aria-pressed={onlyPending} onClick={()=>setOnlyPending(!onlyPending)}>{onlyPending?'显示全部字段':'只看待处理字段'}</button>
        {result.warnings.map((warning,index)=><p className="notice" key={index}>{warning}</p>)}<ul className="results">{result.fields.filter(field=>!onlyPending||['review','unknown'].includes(field.status)).map(field=><li key={field.id}><div><strong>{field.label}</strong><span className={'status '+field.status}>{statuses[field.status]}</span></div><p>{field.message}</p>{field.expected&&<details className="field-preview"><summary>查看拟填写内容</summary><p>{field.expected}</p></details>}</li>)}</ul>
      </>}</section>
    </>}
    </fieldset><footer>内容库留在本机，申请由你提交。</footer>
  </main>;
}
