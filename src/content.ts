import {HuaweiAdapter} from './adapter';
import {parseProfile} from './profile';
const scope=globalThis as typeof globalThis & {__jobCopilotInstalled?:boolean};
if(!scope.__jobCopilotInstalled) {
  scope.__jobCopilotInstalled=true;
  let busy=false;
  chrome.runtime.onMessage.addListener((message,sender,respond)=>{
    if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL(''))||message?.type!=='COPILOT_RUN') return;
    const adapter=new HuaweiAdapter();
    if(!adapter.matches(location.href)) {respond({error:'V0.2 仅支持 career.huawei.com'});return;}
    if(busy) {respond({error:'正在处理上一项操作，请稍后重试'});return;}
    busy=true;
    (async()=>{
      try {
        const profile=parseProfile(message.profile);
        respond({result:await adapter.run(profile,message.fill===true)});
      } catch {respond({error:'填写失败，请刷新页面后重试'});}
      finally {busy=false;}
    })();
    return true;
  });
}
