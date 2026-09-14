import {emptyProfile,parseProfile,type ResumeProfile} from './profile';
const key='resumeProfileV1';
const textKey='resumeLibraryTextV1';
export async function loadProfile():Promise<ResumeProfile> {
  const value=globalThis.chrome?.storage ? (await chrome.storage.local.get(key))[key] : JSON.parse(localStorage.getItem(key)??'null');
  return value?parseProfile(value):emptyProfile();
}
export async function saveProfile(profile:ResumeProfile) {
  if(globalThis.chrome?.storage) await chrome.storage.local.set({[key]:profile});
  else localStorage.setItem(key,JSON.stringify(profile));
}
export async function loadLibraryText():Promise<string> {
  const value=globalThis.chrome?.storage ? (await chrome.storage.local.get(textKey))[textKey] : localStorage.getItem(textKey);
  return typeof value==='string'?value:'';
}
export async function saveResumeLibrary(profile:ResumeProfile,text:string) {
  if(globalThis.chrome?.storage) await chrome.storage.local.set({[key]:profile,[textKey]:text});
  else {localStorage.setItem(key,JSON.stringify(profile));localStorage.setItem(textKey,text);}
}
export async function removeProfile() {
  if(globalThis.chrome?.storage) await chrome.storage.local.remove([key,textKey]);
  else {localStorage.removeItem(key);localStorage.removeItem(textKey);}
}
