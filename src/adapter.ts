import {type ResumeProfile,validateProfile} from './profile';
export type FieldElement=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
type SectionKind='basic'|'intent'|'education'|'work'|'project'|'campus'|'other';
export interface FormField {id:string;label:string;type:string;element:FieldElement;mappedResumeField?:string;confidence:number;reason?:string;sectionKind?:SectionKind;entryIndex?:number}
export interface FieldResult {id:string;label:string;path?:string;expected?:string;confidence:number;status:'filled'|'review'|'skipped'|'unknown'|'ok';message:string}
export interface PageResult {url:string;title:string;fields:FieldResult[];warnings:string[]}
export interface JobSiteAdapter {matches(url:string):boolean;detectPageType():'resume'|'unknown';getFormFields():FormField[];fillField(field:FormField,value:string):Promise<boolean>;validate(profile:ResumeProfile):Promise<PageResult>}
const normalize=(s:string)=>s.toLowerCase().replace(/[\s*：:()（）_-]/g,'');
const semanticAliases:string[][]=[
  ['姓名','中文姓名','真实姓名','name','fullname'],
  ['手机号','手机号码','联系电话','联系电话号码','移动电话','phone','mobile','telephone'],
  ['邮箱','电子邮箱','电子邮件','email'],
  ['现居城市','现居住地','居住城市','目前所在地','当前所在地'],
  ['单位名称','公司','公司名称','工作单位','任职单位','雇主名称'],
  ['任职部门','部门','所在部门','工作部门'],
  ['担任职位','职位','职务','岗位','任职职位','职位名称'],
  ['开始时间','起始时间','任职开始时间','工作开始时间','项目开始时间'],
  ['结束时间','截止时间','离职时间','任职结束时间','工作结束时间','项目结束时间'],
  ['工作地点','任职地点','单位所在地'],
  ['下属人数','直属下属人数','直接管理人数'],
  ['证明人','证明联系人','证明人姓名'],
  ['证明电话','证明人电话','证明联系人电话'],
  ['主要职责与业绩','职责与业绩','工作职责与业绩','工作内容','工作职责','主要职责'],
  ['项目名称','项目名'],
  ['项目角色','项目职务','项目职位','项目中角色'],
  ['学校','学校名称','院校','院校名称','毕业院校'],
  ['学院','院系','就读院系','所在院系'],
  ['专业','专业名称','所学专业','就读专业'],
  ['入学时间','入学日期','教育开始时间'],
  ['毕业时间','毕业日期','预计毕业时间','毕业或预计毕业时间','获得毕业证或学位证时间'],
  ['毕业院校所在国家地区','学校所在国家地区','院校所在国家地区','院校所在地'],
  ['学历','最高学历'],
  ['学制','学习年限'],
  ['研究方向','专业方向'],
  ['行业','所属行业','所在行业'],
  ['职能','岗位职能','职位职能'],
  ['目前工作单位','当前工作单位','现工作单位'],
  ['工作年限','工作经验年限','从业年限'],
  ['自我评价','个人评价','自我介绍','个人优势'],
  ['是否接受工作地点变更','是否接受工作地变更','是否接受工作地点调整']
];
const aliasIndex=new Map(semanticAliases.flatMap((group,index)=>group.map(alias=>[normalize(alias),index] as const)));
const canonicalLabel=(label:string)=>aliasIndex.get(normalize(label));
function sectionKindOf(text:string):SectionKind {
  const value=normalize(text);
  if(/教育|education/.test(value)) return 'education';
  if(/工作|实习|work|intern/.test(value)) return 'work';
  if(/项目|project/.test(value)) return 'project';
  if(/校园|社团|campus/.test(value)) return 'campus';
  if(/求职|意向|intent/.test(value)) return 'intent';
  if(/基本|basicinfo/.test(value)) return 'basic';
  return 'other';
}
function bigrams(value:string):Set<string> {
  const normalized=normalize(value).replace(/当前|目前|所在|名称|信息|情况/g,'');
  const result=new Set<string>();
  for(let index=0;index<normalized.length-1;index++) result.add(normalized.slice(index,index+2));
  return result;
}
function similarity(a:string,b:string):number {
  const left=bigrams(a),right=bigrams(b);if(!left.size||!right.size)return 0;
  let overlap=0;for(const item of left)if(right.has(item))overlap++;
  return 2*overlap/(left.size+right.size);
}
const sensitive=/政治|婚姻|薪资|调剂|偏好|出差|加班|服从|亲属|竞业|offer|入职|身份证|户籍|声明|同意|授权|隐私|验证码|密码|证明人|证明电话|password|captcha|consent|salary|passport|national.?id|referee/i;
const dictionary:Record<string,string[]>={
  'basicInfo.name':['姓名','中文姓名','真实姓名','name','fullname'],
  'basicInfo.phone':['手机','手机号码','手机号','联系电话','电话','phone','mobile','telephone'],
  'basicInfo.email':['邮箱','电子邮箱','电子邮件','email'],
  'basicInfo.gender':['性别','gender'],
  'basicInfo.birthday':['出生日期','生日','birthday'],
  'basicInfo.location':['现居住地','现居城市','居住城市','目前所在地','当前所在地'],
  'education.school':['学校','学校名称','毕业院校','院校名称','院校','school','university'],
  'education.college':['学院','院系','就读院系','college'],
  'education.major':['所学专业','专业','专业名称','major'],
  'education.degree':['学历','最高学历','degree'],
  'education.startDate':['入学时间','入学日期','startdate'],
  'education.endDate':['毕业时间','毕业日期','毕业或预计毕业时间','获得毕业证或学位证时间','enddate'],
  'education.gpa':['gpa','平均绩点','绩点'],
  'education.rank':['专业排名','成绩排名','排名']
};
export function mapLabel(label:string):{path?:string;confidence:number;reason?:string} {
  if(sensitive.test(label)) return {confidence:0,reason:'敏感信息或授权项，请用户填写'};
  if(/毕业院校.*(?:国家|地区)|学校.*(?:国家|地区)|院校所在地/.test(label)) return {confidence:0,reason:'院校地区字段需单独匹配'};
  const n=normalize(label);
  for(const [path,aliases] of Object.entries(dictionary)) if(aliases.some(a=>normalize(a)===n)) return {path,confidence:.98};
  if(/类别|方向|意向|期望|学位|联系人|紧急|英文/.test(label)) return {confidence:0,reason:'字段含义不明确，请用户填写'};
  for(const [path,aliases] of Object.entries(dictionary)) if(aliases.some(a=>a.length>=3&&n.includes(normalize(a)))) return {path,confidence:.8};
  return {confidence:0,reason:'无法识别，请用户填写'};
}
type QueryRoot=Document|ShadowRoot;
function queryRoots(root:QueryRoot):QueryRoot[] {
  const roots:QueryRoot[]=[root];
  for(const element of Array.from(root.querySelectorAll('*'))) if(element.shadowRoot) roots.push(...queryRoots(element.shadowRoot));
  return roots;
}
function deepQueryAll<T extends Element>(root:QueryRoot,selector:string):T[] {
  return queryRoots(root).flatMap(current=>Array.from(current.querySelectorAll<T>(selector)));
}
const fieldContainer=(el:Element)=>el.closest('.aui-form-item,.el-form-item,.ant-form-item,.form-group,[data-field]');
function labelOf(el:FieldElement):string {
  const labelledBy=(el.getAttribute('aria-labelledby')??'').split(/\s+/).map(id=>el.ownerDocument.getElementById(id)?.textContent??'').join(' ').trim();
  const label=Array.from(el.labels??[]).map(l=>{
    const copy=l.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('input,select,textarea,button').forEach(control=>control.remove());
    return copy.textContent?.trim()??'';
  }).join(' ');
  const nearby=fieldContainer(el)?.querySelector('.aui-form-item__label,.form-item__label,.el-form-item__label,.ant-form-item-label,label')?.textContent?.trim();
  return label||labelledBy||el.getAttribute('aria-label')||nearby||el.getAttribute('placeholder')||el.name||el.id||'无标签字段';
}
function visible(el:HTMLElement):boolean {
  for(let p:HTMLElement|null=el;p;) {
    if(p.hidden||p.getAttribute('aria-hidden')==='true'||getComputedStyle(p).display==='none'||getComputedStyle(p).visibility==='hidden') return false;
    const root=p.getRootNode();
    p=p.parentElement||(root instanceof ShadowRoot?root.host as HTMLElement:null);
  }
  return true;
}
const current=(el:FieldElement)=>el instanceof HTMLInputElement && ['radio','checkbox'].includes(el.type)?(el.checked?el.value:''):el.value;
const equal=(a:string,b:string)=>normalize(a.replace(/[./]/g,'-'))===normalize(b.replace(/[./]/g,'-'));
export function profileValue(profile:ResumeProfile,path?:string):string {
  if(!path) return '';
  let value:unknown=profile;
  for(const key of path.split('.')) {if(!value||typeof value!=='object') return '';value=(value as Record<string,unknown>)[key];}
  return typeof value==='string'?value:'';
}
function libraryMapping(profile:ResumeProfile,pageField:FormField):{path?:string;confidence:number;reason?:string} {
  if(sensitive.test(pageField.label)) return {confidence:0,reason:'敏感信息或授权项，请用户填写'};
  const candidates=profile.libraryFields.map((field,index)=>({field,index})).filter(({field})=>{
    if(!field.value) return false;
    const kind=sectionKindOf(field.section);
    if(pageField.sectionKind&&pageField.sectionKind!=='other'&&kind!==pageField.sectionKind) return false;
    if(pageField.entryIndex!==undefined&&['education','work','project','campus'].includes(kind)) {
      const number=field.section.match(/(\d+)/)?.[1];
      if(number&&Number(number)!==pageField.entryIndex+1) return false;
    }
    return true;
  }).map(candidate=>{
    const exact=normalize(candidate.field.label)===normalize(pageField.label);
    const left=canonicalLabel(candidate.field.label),right=canonicalLabel(pageField.label);
    const alias=left!==undefined&&left===right;
    const fuzzy=similarity(candidate.field.label,pageField.label);
    return {...candidate,score:exact ? .98 : alias ? .92 : fuzzy>=.72 ? Math.min(.86,.72+fuzzy*.14) : 0,method:exact?'精确标签':alias?'同义词':'相似字段'};
  }).filter(candidate=>candidate.score>=.76).sort((a,b)=>b.score-a.score);
  if(!candidates.length) return {confidence:0,reason:'内容库中没有可靠近似字段，请用户填写'};
  const best=candidates[0],contenders=candidates.filter(candidate=>best.score-candidate.score<.08);
  const values=[...new Set(contenders.map(candidate=>candidate.field.value))];
  if(values.length>1) return {confidence:0,reason:'内容库中有多个相近字段且值不同，请用户确认'};
  return {path:`libraryFields.${best.index}.value`,confidence:best.score,reason:`${best.method} · 来自内容库：${best.field.section}`};
}
export class HuaweiAdapter implements JobSiteAdapter {
  constructor(private doc:Document=document){}
  matches(url:string) {try {const u=new URL(url);return u.protocol==='https:'&&u.hostname==='career.huawei.com';}catch{return false;}}
  detectPageType():'resume'|'unknown' {return this.getFormFields().length?'resume':'unknown';}
  getFormFields():FormField[] {
    const elements=deepQueryAll<FieldElement>(this.doc,'input,textarea,select').filter(el=>visible(el)&&!el.disabled&&!['hidden','submit','button','reset','file','image'].includes(el.type));
    const moduleSelector='.basicInfoModule,.jobIntentionModule,.educationExperienceModule,.workExperienceModule,.projectExperienceModule,.campusExperienceModule,[data-resume-section]';
    const modules=deepQueryAll<Element>(this.doc,moduleSelector);
    const fields:FormField[]=elements.map((element,i)=>{
      const label=labelOf(element),mapping=mapLabel(label);
      const hints=[element.name,element.id,element.getAttribute('placeholder')??''].join(' ');
      const blocked=sensitive.test(label+' '+hints)||['password','checkbox','radio'].includes(element.type);
      const module=element.closest(moduleSelector),sectionKind=module?sectionKindOf(`${module.id} ${module.className}`):undefined;
      const peers=module&&sectionKind?modules.filter(candidate=>sectionKindOf(`${candidate.id} ${candidate.className}`)===sectionKind):[];
      const entryIndex=module&&['education','work','project','campus'].includes(sectionKind??'')?peers.indexOf(module):undefined;
      return {id:`field-${i}`,label,type:element.getAttribute('role')==='combobox'?'combobox':element.type,element,mappedResumeField:blocked?undefined:mapping.path,confidence:blocked?0:mapping.confidence,reason:blocked?'授权、敏感或选择项，请用户填写':mapping.reason,sectionKind,entryIndex};
    });
    // Index only clearly grouped education records. Flat duplicate fields are ambiguous.
    const groups:Element[]=[];
    for(const f of fields.filter(f=>f.mappedResumeField?.startsWith('education.'))) {
      const group=f.element.closest('fieldset,[data-education-entry],.education-item,.education-entry,.educationExperienceModule');
      if(group&&!groups.includes(group)) groups.push(group);
    }
    const originalPaths=new Map(fields.map(f=>[f,f.mappedResumeField]));
    for(const f of fields) {
      if(!f.mappedResumeField?.startsWith('education.')) continue;
      const path=f.mappedResumeField;
      const group=f.element.closest('fieldset,[data-education-entry],.education-item,.education-entry,.educationExperienceModule');
      const duplicate=fields.filter(x=>originalPaths.get(x)===path && (!group||group.contains(x.element))).length>1;
      const heading=group?.querySelector('legend,h2,h3,h4')?.textContent??'';
      if(duplicate || (groups.length>1&&!group) || /工作|项目|实习/.test(heading)) {
        f.confidence=0;f.reason='经历分组不明确，请用户填写';f.mappedResumeField=undefined;
      } else f.mappedResumeField=path.replace('education.',`education.${group?groups.indexOf(group):0}.`);
    }
    return fields;
  }
  async fillField(field:FormField,value:string):Promise<boolean> {
    const el=field.element;
    if(!el.isConnected||!visible(el)||el.disabled||el.matches('[readonly]')||['radio','checkbox','password'].includes(el.type)||field.type==='combobox'||el.getAttribute('aria-haspopup')) return false;
    if(el instanceof HTMLInputElement && el.type==='date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    if(el instanceof HTMLSelectElement) {
      const options=Array.from(el.options).filter(o=>!o.disabled&&(equal(o.text,value)||equal(o.value,value)));
      if(options.length!==1) return false;
      value=options[0].value;
    }
    const prototype=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:el instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype,'value')?.set?.call(el,value);
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new FocusEvent('blur',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,80));
    return el.isConnected&&el.value===value;
  }
  async run(profile:ResumeProfile,fill=false):Promise<PageResult> {
    const fields=this.getFormFields();
    const results:FieldResult[]=[];
    for(const f of fields) {
      const blocked=sensitive.test([f.label,f.element.name,f.element.id,f.element.getAttribute('placeholder')??''].join(' '))||['password','checkbox','radio'].includes(f.element.type)||f.reason==='经历分组不明确，请用户填写';
      const fallback=!blocked&&(!f.mappedResumeField||!profileValue(profile,f.mappedResumeField))?libraryMapping(profile,f):undefined;
      const path=blocked?undefined:fallback?.path??f.mappedResumeField,confidence=path?fallback?.path?fallback.confidence:f.confidence:0;
      const expected=profileValue(profile,path),existing=current(f.element);
      const row:FieldResult={id:f.id,label:f.label,path,confidence,status:'unknown',message:fallback?.reason??f.reason??'无法识别，请用户填写'};
      if(path&&expected) row.expected=expected;
      if(confidence>=.7&&path) {
        if(normalize(f.label)==='最高学历'&&profile.education.length>1) {row.status='review';row.message='多段教育经历的最高学历需由你确认';}
        else if(!expected) {row.status='review';row.message='内容库没有此项，请补充或手动填写';}
        else if(existing) {
          const display=f.element instanceof HTMLSelectElement?f.element.selectedOptions[0]?.text??existing:existing;
          row.status=equal(display,expected)||equal(existing,expected)?'ok':'review';
          row.message=row.status==='ok'?'与内容库一致':'已有内容与内容库不同，已保留，请核对';
        } else if(!fill) {row.status='review';row.message='尚未填写';}
        else {
          const done=await this.fillField(f,expected);
          row.status=done?(confidence>=.95?'filled':'review'):'review';
          row.message=done?(confidence>=.95?'已填写':'已填写，字段映射需要确认'):'控件不支持或网页未保留值，请手动填写';
        }
      } else if(f.element.required&&!existing) row.message+='（必填）';
      results.push(row);
    }
    const warnings=validateProfile(profile);
    if(!fields.length) warnings.push('未发现可见表单，请登录并打开基本信息或教育经历编辑区');
    if(deepQueryAll(this.doc,'iframe').length) warnings.push('页面包含嵌入框架；本版只检查主页面，框架内字段请手动核对');
    if(deepQueryAll(this.doc,'[role="combobox"]:not(input):not(select),.aui-select,.el-select,.ant-select').length) warnings.push('发现自定义下拉控件，请手动选择并核对');
    const mappedIndexes=new Set(fields.map(f=>f.mappedResumeField?.match(/^education\.(\d+)\./)?.[1]).filter(Boolean));
    if(profile.education.length>mappedIndexes.size) warnings.push('页面教育经历数量少于内容库，请手动新增对应经历后重新填写，并确认顺序一致');
    return {url:this.doc.location.href,title:this.doc.title,fields:results,warnings};
  }
  validate(profile:ResumeProfile) {return this.run(profile);}
}
