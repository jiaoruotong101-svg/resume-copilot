// @vitest-environment jsdom
import {describe,it,expect,beforeEach,vi} from 'vitest';
import {HuaweiAdapter,mapLabel} from '../src/adapter';
import {emptyProfile,emptyEducation,validateProfile,parseProfile} from '../src/profile';
import {mergeResumeLibraryTemplate,parseResumeText,resumeLibraryTemplate} from '../src/parser';
const profile=()=>({...emptyProfile(),basicInfo:{...emptyProfile().basicInfo,name:'测试候选人',phone:'13800138000',email:'test@example.com'},education:[{...emptyEducation(),school:'甲大学',major:'计算机',degree:'本科',startDate:'2023-09',endDate:'2027-06'},{...emptyEducation(),school:'乙大学',major:'数学',degree:'硕士',startDate:'2027-09',endDate:'2030-06'}]});
describe('字段识别与填写保护',()=>{
  beforeEach(()=>{document.body.innerHTML='';});
  it('仅匹配华为招聘 HTTPS 精确域名',()=>{const a=new HuaweiAdapter();expect(a.matches('https://career.huawei.com/cn')).toBe(true);expect(a.matches('https://career.huawei.com.evil.test')).toBe(false);expect(a.matches('http://career.huawei.com')).toBe(false);});
  it('敏感项与容易混淆字段不映射',()=>{for(const s of ['是否接受调剂','身份证号','政治面貌','期望工作地点','专业类别','英文姓名','紧急联系人姓名'])expect(mapLabel(s).confidence).toBe(0);expect(mapLabel('毕业院校').path).toBe('education.school');});
  it('触发 input/change/blur 且从不提交',async()=>{
    document.body.innerHTML='<form><label>姓名<input></label><button type="submit">提交</button></form>';
    const input=document.querySelector('input')!;const events:string[]=[];
    for(const type of ['input','change','blur'])input.addEventListener(type,()=>events.push(type));
    const submit=vi.fn();document.querySelector('form')!.addEventListener('submit',submit);
    const r=await new HuaweiAdapter().run(profile(),true);
    expect(input.value).toBe('测试候选人');expect(events).toEqual(['input','change','blur']);expect(submit).not.toHaveBeenCalled();expect(r.fields[0].status).toBe('filled');
  });
  it('保留现有不同值并报告',async()=>{document.body.innerHTML='<label>姓名<input value="原有名字"></label>';const r=await new HuaweiAdapter().run(profile(),true);expect(document.querySelector('input')!.value).toBe('原有名字');expect(r.fields[0].status).toBe('review');});
  it('按独立教育经历分组映射两所学校',async()=>{document.body.innerHTML='<fieldset><legend>教育经历</legend><label>学校<input></label><label>专业<input></label></fieldset><fieldset><legend>教育经历</legend><label>学校<input></label><label>专业<input></label></fieldset>';await new HuaweiAdapter().run(profile(),true);expect(Array.from(document.querySelectorAll('input')).map(x=>x.value)).toEqual(['甲大学','计算机','乙大学','数学']);});
  it('重复且未分组的教育字段全部不猜测',async()=>{document.body.innerHTML='<label>学校<input></label><label>学校<input></label>';const r=await new HuaweiAdapter().run(profile(),true);expect(r.fields.every(x=>x.status==='unknown')).toBe(true);expect(Array.from(document.querySelectorAll('input')).every(x=>!x.value)).toBe(true);});
  it('选择框只匹配唯一准确选项，日期不补造日',async()=>{document.body.innerHTML='<label>学历<select><option value="">请选择</option><option value="bachelor">本科</option></select></label><label>毕业时间<input type="date"></label>';const r=await new HuaweiAdapter().run(profile(),true);expect(document.querySelector('select')!.value).toBe('bachelor');expect(document.querySelector('input')!.value).toBe('');expect(r.fields[1].status).toBe('review');});
  it('隐藏、禁用字段不参与，密码和同意项不写入',async()=>{document.body.innerHTML='<div hidden><label>姓名<input></label></div><label>姓名<input disabled></label><label>同意隐私协议<input type="checkbox"></label><input aria-label="密码" type="password">';const r=await new HuaweiAdapter().run(profile(),true);expect(r.fields).toHaveLength(2);expect(document.querySelector('input[type=checkbox]')!.matches(':checked')).toBe(false);});
  it('框架回滚填写值后不得报告成功',async()=>{document.body.innerHTML='<label>姓名<input></label>';document.querySelector('input')!.addEventListener('input',e=>{(e.target as HTMLInputElement).value='';});const r=await new HuaweiAdapter().run(profile(),true);expect(r.fields[0].status).toBe('review');});
  it('自定义 combobox 不直接写值伪装选择成功',async()=>{document.body.innerHTML='<label>学校<input role="combobox"></label>';const r=await new HuaweiAdapter().run(profile(),true);expect(r.fields[0].status).toBe('review');expect(document.querySelector('input')!.value).toBe('');});
  it('aria-labelledby 识别可访问标签',()=>{document.body.innerHTML='<span id="a">电子邮箱</span><input aria-labelledby="a">';expect(new HuaweiAdapter().getFormFields()[0].mappedResumeField).toBe('basicInfo.email');});
  it('递归读取华为 AUI 开放 Shadow DOM 表单',async()=>{
    const host=document.createElement('career-resume');document.body.append(host);
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML='<div class="aui-form-item"><div class="aui-form-item__label">姓名</div><div class="aui-form-item__content"><div class="aui-input"><input class="aui-input__inner"></div></div></div>';
    const fields=new HuaweiAdapter().getFormFields();
    expect(fields).toHaveLength(1);expect(fields[0].label).toBe('姓名');expect(fields[0].mappedResumeField).toBe('basicInfo.name');
    await new HuaweiAdapter().run(profile(),true);
    expect(shadow.querySelector('input')!.value).toBe('测试候选人');
  });
  it('多段经历不拿第一段学历充当最高学历',async()=>{document.body.innerHTML='<label>最高学历<input></label>';const r=await new HuaweiAdapter().run(profile(),true);expect(document.querySelector('input')!.value).toBe('');expect(r.fields[0].status).toBe('review');});
  it('按内容库中的精确字段名填写未预设字段',async()=>{document.body.innerHTML='<label>个人主页<input></label>';const p=profile();p.libraryFields=[{section:'其他信息',label:'个人主页',value:'https://example.com'}];const r=await new HuaweiAdapter().run(p,true);expect(document.querySelector('input')!.value).toBe('https://example.com');expect(r.fields[0].status).toBe('filled');});
  it('内容库同名字段值不同时拒绝猜测',async()=>{document.body.innerHTML='<label>开始时间<input></label>';const p=profile();p.libraryFields=[{section:'教育经历 1',label:'开始时间',value:'2020-09'},{section:'项目经历 1',label:'开始时间',value:'2024-01'}];const r=await new HuaweiAdapter().run(p,true);expect(document.querySelector('input')!.value).toBe('');expect(r.fields[0].message).toMatch(/多个.*字段/);});
  it('结合章节和顺序匹配多段工作经历的同义字段',async()=>{document.body.innerHTML='<section class="module-container workExperienceModule"><div class="aui-form-item"><div class="aui-form-item__label">公司名称</div><input></div></section><section class="module-container workExperienceModule"><div class="aui-form-item"><div class="aui-form-item__label">公司名称</div><input></div></section>';const p=profile();p.libraryFields=[{section:'工作或实习经历 1',label:'单位名称',value:'甲公司'},{section:'工作或实习经历 2',label:'单位名称',value:'乙公司'}];await new HuaweiAdapter().run(p,true);expect(Array.from(document.querySelectorAll('input')).map(input=>input.value)).toEqual(['甲公司','乙公司']);});
  it('只在唯一高相似候选时使用近似匹配',async()=>{document.body.innerHTML='<section class="basicInfoModule"><div class="aui-form-item"><div class="aui-form-item__label">个人自我评价</div><textarea></textarea></div></section>';const p=profile();p.libraryFields=[{section:'基本信息',label:'自我评价',value:'可靠、细致'}];const r=await new HuaweiAdapter().run(p,true);expect(document.querySelector('textarea')!.value).toBe('可靠、细致');expect(r.fields[0].confidence).toBeGreaterThanOrEqual(.76);});
  it('毕业院校地区不会误映射成学校名称',()=>{expect(mapLabel('毕业院校所在国家/地区').path).toBeUndefined();});
});
describe('简历主档案',()=>{
  it('空模板不生成虚假学校，也不吞入下一字段名',()=>{
    expect(parseResumeText(resumeLibraryTemplate).education).toEqual([]);
    const p=parseResumeText('【教育经历 1】\n毕业院校：甲大学\n就读院系：\n专业：数学\nGPA：\n成绩排名：\n【工作或实习经历 1】\n单位名称：乙公司');
    expect(p.education[0].college).toBe('');expect(p.education[0].gpa).toBe('');expect(p.education[0].major).toBe('数学');
  });
  it('多行职责描述完整保留并在下一章节结束',()=>{
    const p=parseResumeText('【项目经历 1】\n主要职责与业绩：\n开发界面\n优化性能\n【基本信息】\n姓名：测试用户');
    expect(p.libraryFields[0].value).toBe('开发界面\n优化性能');
  });
  it('识别明确的姓名、联系方式和教育字段',()=>{const p=parseResumeText('姓名：张三\n手机：13800138000\n邮箱：a@example.com\n教育经历\n学校：甲大学\n专业：数学\n学历：本科\n入学时间：2023.9\n毕业时间：2027.6\n项目经历\n开发项目');expect(p.basicInfo.name).toBe('张三');expect(p.education[0].endDate).toBe('2027-06');expect(p.education[0].major).toBe('数学');});
  it('无法确定的经历不编造',()=>{const p=parseResumeText('我热爱人工智能，希望毕业后加入团队');expect(p.basicInfo.name).toBe('');expect(p.education).toEqual([]);expect(p.skills).toEqual([]);});
  it('保留英文姓名中的空格',()=>{expect(parseResumeText('Name: Test Candidate\nEmail: pdf@example.com').basicInfo.name).toBe('Test Candidate');});
  it('检查日期倒序、重复经历和邮箱错误',()=>{const p=profile();p.basicInfo.email='bad';p.education[0].startDate='2030-09';p.education.push({...p.education[0]});expect(validateProfile(p).join()).toMatch(/入学时间晚于/);expect(validateProfile(p).join()).toMatch(/重复/);expect(validateProfile(p).join()).toMatch(/邮箱/);});
  it('JSON 导入验证完整结构',()=>{expect(parseProfile(profile())).toEqual(profile());expect(()=>parseProfile({schemaVersion:1,basicInfo:{}})).toThrow();expect(()=>parseProfile({...profile(),projects:[{name:'x'}]})).toThrow();});
  it('通用模板覆盖截图字段且任意键值进入内容库',()=>{for(const field of ['单位名称：','下属人数：','主要职责与业绩：','项目角色：','毕业院校所在国家/地区：','学制：','目前工作单位：','是否接受工作地点变更：'])expect(resumeLibraryTemplate).toContain(field);const p=parseResumeText('【基本信息】\n姓名：张三\n【其他信息】\n作品集：https://example.com');expect(p.libraryFields).toContainEqual({section:'其他信息',label:'作品集',value:'https://example.com'});});
  it('补全新版模板时保留已有值和自定义字段',()=>{const merged=mergeResumeLibraryTemplate('【基本信息】\n姓名：张三\n自定义字段：保留');expect(merged).toContain('姓名：张三');expect(merged).toContain('自定义字段：保留');expect(merged).toContain('目前工作单位：');expect(merged).toContain('【项目经历 1】');});
});
