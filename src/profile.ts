export interface Education {
  school: string; college: string; major: string; degree: string;
  startDate: string; endDate: string; gpa: string; rank: string;
}
export interface LibraryField { section:string; label:string; value:string }
export interface ResumeProfile {
  schemaVersion: 1;
  basicInfo: { name: string; phone: string; email: string; gender: string; birthday: string; location: string };
  education: Education[];
  internships: {company: string; department: string; role: string; startDate: string; endDate: string; description: string[]}[];
  projects: {name: string; role: string; startDate: string; endDate: string; description: string[]; skills: string[]}[];
  campusExperience: string[]; awards: string[]; certificates: string[]; skills: string[];
  languages: string[]; publications: string[]; selfIntroduction: string;
  libraryFields: LibraryField[];
}
export const emptyEducation = (): Education => ({school:'',college:'',major:'',degree:'',startDate:'',endDate:'',gpa:'',rank:''});
export const emptyProfile = (): ResumeProfile => ({schemaVersion:1,basicInfo:{name:'',phone:'',email:'',gender:'',birthday:'',location:''},education:[],internships:[],projects:[],campusExperience:[],awards:[],certificates:[],skills:[],languages:[],publications:[],selfIntroduction:'',libraryFields:[]});
export function validateProfile(p: ResumeProfile): string[] {
  const errors: string[] = [];
  if(p.basicInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.basicInfo.email)) errors.push('邮箱格式不正确');
  if(p.basicInfo.phone && !/^\+?[\d\s()-]{7,20}$/.test(p.basicInfo.phone)) errors.push('手机号格式不正确');
  p.education.forEach((e,i)=>{
    for(const key of ['startDate','endDate'] as const) if(e[key] && !/^\d{4}-(0[1-9]|1[0-2])$/.test(e[key])) errors.push(`教育经历 ${i+1}：日期请使用 YYYY-MM`);
    if(e.startDate && e.endDate && e.startDate>e.endDate) errors.push(`教育经历 ${i+1}：入学时间晚于毕业时间`);
    if(p.education.slice(0,i).some(other=>other.school===e.school && other.startDate===e.startDate && e.school)) errors.push(`教育经历 ${i+1}：学校和入学时间重复`);
  });
  return errors;
}
export function parseProfile(value: unknown): ResumeProfile {
  if(!value || typeof value!=='object') throw new Error('档案必须是 JSON 对象');
  const v = value as Record<string,unknown>;
  if(v.schemaVersion!==1) throw new Error('不支持的档案版本');
  const p=emptyProfile();
  const stringObject=(o: unknown, keys: string[])=>!!o && typeof o==='object' && keys.every(k=>typeof (o as Record<string,unknown>)[k]==='string');
  if(!stringObject(v.basicInfo,Object.keys(p.basicInfo))) throw new Error('基本信息格式不正确');
  if(!Array.isArray(v.education)||!v.education.every(e=>stringObject(e,Object.keys(emptyEducation())))) throw new Error('教育经历格式不正确');
  const stringArray=(a:unknown)=>Array.isArray(a)&&a.every(x=>typeof x==='string');
  for(const key of ['campusExperience','awards','certificates','skills','languages','publications']) if(!stringArray(v[key])) throw new Error(`${key} 必须是文本数组`);
  if(v.libraryFields!==undefined&&(!Array.isArray(v.libraryFields)||!v.libraryFields.every(e=>stringObject(e,['section','label','value'])))) throw new Error('libraryFields 格式不正确');
  for(const key of ['internships','projects']) {
    const items=v[key];
    if(!Array.isArray(items)||!items.every(e=>stringObject(e,key==='projects'?['name','role','startDate','endDate']:['company','department','role','startDate','endDate'])&&stringArray(e.description)&&(key!=='projects'||stringArray(e.skills)))) throw new Error(`${key} 格式不正确`);
  }
  if(typeof v.selfIntroduction!=='string') throw new Error('自我评价格式不正确');
  // Keep only schema properties; imported files cannot introduce arbitrary top-level data.
  for(const key of Object.keys(p)) if(v[key]!==undefined) (p as unknown as Record<string,unknown>)[key]=v[key];
  return p;
}
