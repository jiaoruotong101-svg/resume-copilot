import {emptyProfile, type LibraryField, type ResumeProfile} from './profile';

export const resumeLibraryTemplate=`# 求职 Copilot 通用简历内容库
# 每个字段使用“字段名：内容”；没有的信息留空，不要删除字段名。
# 日期建议使用 YYYY-MM 或 YYYY-MM-DD；多项内容用中文分号分隔。

【基本信息】
个人照片：
姓名：
英文姓名：
手机号：
联系电话国家/地区代码：
备用电话：
邮箱：
性别：
出生日期：
现居城市：
籍贯：
国籍：
民族：
政治面貌：
婚姻状况：
证件类型：
证件号码：
证件签发国家/地区：
目前所在地：
行业：
职能：
目前工作单位：
担任职位：
工作年限：
自我评价：
附件简历：

【求职意向】
期望职位：
职位类别：
期望工作地点：
期望薪资：
工作性质：
可到岗日期：
是否接受调剂：
是否接受工作地点变更：

【教育经历 1】
毕业院校所在国家/地区：
毕业院校：
就读院系：
专业：
学历：
学位：
学制：
入学时间：
毕业或预计毕业时间：
研究方向：
GPA：
成绩排名：
主修课程：

【工作或实习经历 1】
单位名称：
开始时间：
结束时间：
任职部门：
担任职位：
工作地点：
下属人数：
证明人：
证明电话国家/地区代码：
证明电话：
主要职责与业绩：

【项目经历 1】
项目名称：
开始时间：
结束时间：
项目角色：
主要职责与业绩：
使用技术：

【校园经历 1】
组织名称：
担任职务：
开始时间：
结束时间：
经历描述：

【能力与成果】
专业技能：
语言能力：
证书：
获奖情况：
论文或出版物：

【其他信息】
个人优势：
兴趣爱好：
个人主页：
GitHub：
LinkedIn：`;

export function mergeResumeLibraryTemplate(current:string):string {
  if(!current.trim()) return resumeLibraryTemplate;
  const lines=current.replace(/\r\n/g,'\n').split('\n');
  const templateLines=resumeLibraryTemplate.split('\n');
  for(let index=0;index<templateLines.length;) {
    const heading=templateLines[index].match(/^【(.+?)】$/)?.[1];
    if(!heading) {index++;continue;}
    const fields:string[]=[];index++;
    while(index<templateLines.length&&!/^【.+】$/.test(templateLines[index])) {if(/^[^#：:]{1,40}[：:]\s*$/.test(templateLines[index].trim())) fields.push(templateLines[index]);index++;}
    const headingIndex=lines.findIndex(line=>line.trim()===`【${heading}】`);
    if(headingIndex<0) {lines.push('',`【${heading}】`,...fields);continue;}
    let end=headingIndex+1;while(end<lines.length&&!/^【.+】$/.test(lines[end].trim())) end++;
    const labels=new Set(lines.slice(headingIndex+1,end).map(line=>line.match(/^([^：:]{1,40})[：:]/)?.[1]).filter((label):label is string=>!!label).map(normalizedLabel));
    const missing=fields.filter(line=>!labels.has(normalizedLabel(line.replace(/[：:]\s*$/,''))));
    lines.splice(end,0,...missing);
  }
  return lines.join('\n').replace(/\n{4,}/g,'\n\n\n');
}

const normalizedLabel=(value:string)=>value.toLowerCase().replace(/[\s*：:()（）_\-/]/g,'');

function readLibraryFields(text:string):LibraryField[] {
  const fields:LibraryField[]=[];
  let section='未分组';
  let previous:LibraryField|undefined;
  for(const raw of text.split(/\r?\n/)) {
    const line=raw.trim();
    if(!line||line.startsWith('#')) continue;
    const heading=line.match(/^【(.+?)】$/)?.[1];
    if(heading) {section=heading.trim();previous=undefined;continue;}
    const pair=line.match(/^([^：:]{1,40})\s*[:：]\s*(.*)$/);
    if(pair) {
      previous={section,label:pair[1].trim(),value:pair[2].trim()};
      fields.push(previous);
    } else if(previous) previous.value+=(previous.value?'\n':'')+line;
  }
  return fields.filter(field=>field.value);
}

export function parseResumeText(text:string):ResumeProfile {
  const p=emptyProfile();
  p.libraryFields=readLibraryFields(text);
  const pick=(...labels:string[])=>{
    const wanted=new Set(labels.map(normalizedLabel));
    const values=p.libraryFields.filter(field=>wanted.has(normalizedLabel(field.label))).map(field=>field.value);
    return [...new Set(values)].length===1?values[0]:'';
  };
  const capture=(re:RegExp)=>text.match(re)?.[1]?.trim()??'';
  p.basicInfo.name=pick('姓名','Name')||capture(/(?:姓名|Name)[ \t]*[:：][ \t]*([^\r\n:：]{2,80})/i).split(/\s+(?:手机|电话|邮箱|Phone|Email)/i)[0].trim();
  p.basicInfo.phone=pick('手机号','手机号码','联系电话','电话','Phone','Mobile')||capture(/(?:^|[^\d])(1[3-9]\d{9})(?!\d)/);
  p.basicInfo.email=pick('邮箱','电子邮箱','电子邮件','Email')||capture(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  p.basicInfo.gender=pick('性别','Gender');
  p.basicInfo.birthday=pick('出生日期','生日','Birthday');
  p.basicInfo.location=pick('现居城市','现居住地','居住城市');
  const educationText=text.split(/(?=【教育经历\s*\d*】|(?:毕业院校|学校名称|学校|School)\s*[:：])/i);
  for(const block of educationText) {
    if(!/(?:毕业院校|学校名称|学校|School)\s*[:：]/i.test(block)) continue;
    const bounded=block.split(/\n[ \t]*【/)[0];
    const get=(re:RegExp)=>bounded.match(new RegExp(re.source.replaceAll('\\s*','[ \\t]*'),re.flags))?.[1]?.trim()??'';
    const date=(re:RegExp)=>get(re).replace(/[./]/g,'-').replace(/-(\d)$/,'-0$1');
    const school=get(/(?:毕业院校|学校名称|学校|School)\s*[:：]\s*([^\n]+)/i);
    if(!school) continue;
    p.education.push({school,college:get(/(?:学院|院系|就读院系)\s*[:：]\s*([^\n]+)/),major:get(/(?:所学专业|专业)\s*[:：]\s*([^\n]+)/),degree:get(/(?:最高学历|学历)\s*[:：]\s*(博士|硕士|本科|大专|高中)/),startDate:date(/(?:入学时间|教育开始时间)\s*[:：]\s*(\d{4}[-./]\d{1,2})/),endDate:date(/(?:毕业或预计毕业时间|获得毕业证或学位证时间|毕业时间|教育结束时间)\s*[:：]\s*(\d{4}[-./]\d{1,2})/),gpa:get(/GPA\s*[:：]\s*([^\n]+)/i),rank:get(/(?:成绩排名|专业排名)\s*[:：]\s*([^\n]+)/)});
  }
  const list=(value:string)=>value.split(/[；;、,，]/).map(x=>x.trim()).filter(Boolean);
  p.skills=list(pick('专业技能','技能'));
  p.languages=list(pick('语言能力'));
  p.certificates=list(pick('证书','资格证书'));
  p.awards=list(pick('获奖情况','奖项'));
  p.selfIntroduction=pick('自我评价')||pick('个人优势');
  return p;
}
