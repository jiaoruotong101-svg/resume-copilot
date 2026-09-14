import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
function Fixture(){
  const [name,setName]=useState('');
  return <form onSubmit={e=>{e.preventDefault();document.body.dataset.submitted='yes';}}>
    <h1>测试招聘表单（非华为真实页面）</h1>
    <div className="aui-form-item"><div className="aui-form-item__label">姓名</div><div className="aui-form-item__content"><input className="aui-input__inner" value={name} onChange={e=>setName(e.target.value)}/></div></div><output data-testid="react-value">{name}</output>
    <label>手机号<input /></label><label>邮箱<input value="existing@example.com" readOnly/></label>
    <fieldset><legend>教育经历 1</legend><label>学校<input/></label><label>专业<input/></label><label>学历<select defaultValue=""><option value="">请选择</option><option value="b">本科</option></select></label><label>毕业时间<input type="month"/></label></fieldset>
    <fieldset><legend>教育经历 2</legend><label>学校<input/></label><label>专业<input/></label></fieldset>
    <label>身份证号<input/></label><label>同意隐私声明<input type="checkbox"/></label><button type="submit">提交申请</button>
  </form>;
}
const host=document.createElement('career-resume');document.getElementById('root')!.append(host);
const shadow=host.attachShadow({mode:'open'});const mount=document.createElement('div');shadow.append(mount);
createRoot(mount).render(<Fixture/>);
