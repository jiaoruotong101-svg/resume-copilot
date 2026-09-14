"use strict";
(() => {
  // src/profile.ts
  var emptyEducation = () => ({ school: "", college: "", major: "", degree: "", startDate: "", endDate: "", gpa: "", rank: "" });
  var emptyProfile = () => ({ schemaVersion: 1, basicInfo: { name: "", phone: "", email: "", gender: "", birthday: "", location: "" }, education: [], internships: [], projects: [], campusExperience: [], awards: [], certificates: [], skills: [], languages: [], publications: [], selfIntroduction: "", libraryFields: [] });
  function validateProfile(p) {
    const errors = [];
    if (p.basicInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.basicInfo.email)) errors.push("\u90AE\u7BB1\u683C\u5F0F\u4E0D\u6B63\u786E");
    if (p.basicInfo.phone && !/^\+?[\d\s()-]{7,20}$/.test(p.basicInfo.phone)) errors.push("\u624B\u673A\u53F7\u683C\u5F0F\u4E0D\u6B63\u786E");
    p.education.forEach((e, i) => {
      for (const key of ["startDate", "endDate"]) if (e[key] && !/^\d{4}-(0[1-9]|1[0-2])$/.test(e[key])) errors.push(`\u6559\u80B2\u7ECF\u5386 ${i + 1}\uFF1A\u65E5\u671F\u8BF7\u4F7F\u7528 YYYY-MM`);
      if (e.startDate && e.endDate && e.startDate > e.endDate) errors.push(`\u6559\u80B2\u7ECF\u5386 ${i + 1}\uFF1A\u5165\u5B66\u65F6\u95F4\u665A\u4E8E\u6BD5\u4E1A\u65F6\u95F4`);
      if (p.education.slice(0, i).some((other) => other.school === e.school && other.startDate === e.startDate && e.school)) errors.push(`\u6559\u80B2\u7ECF\u5386 ${i + 1}\uFF1A\u5B66\u6821\u548C\u5165\u5B66\u65F6\u95F4\u91CD\u590D`);
    });
    return errors;
  }
  function parseProfile(value) {
    if (!value || typeof value !== "object") throw new Error("\u6863\u6848\u5FC5\u987B\u662F JSON \u5BF9\u8C61");
    const v = value;
    if (v.schemaVersion !== 1) throw new Error("\u4E0D\u652F\u6301\u7684\u6863\u6848\u7248\u672C");
    const p = emptyProfile();
    const stringObject = (o, keys) => !!o && typeof o === "object" && keys.every((k) => typeof o[k] === "string");
    if (!stringObject(v.basicInfo, Object.keys(p.basicInfo))) throw new Error("\u57FA\u672C\u4FE1\u606F\u683C\u5F0F\u4E0D\u6B63\u786E");
    if (!Array.isArray(v.education) || !v.education.every((e) => stringObject(e, Object.keys(emptyEducation())))) throw new Error("\u6559\u80B2\u7ECF\u5386\u683C\u5F0F\u4E0D\u6B63\u786E");
    const stringArray = (a) => Array.isArray(a) && a.every((x) => typeof x === "string");
    for (const key of ["campusExperience", "awards", "certificates", "skills", "languages", "publications"]) if (!stringArray(v[key])) throw new Error(`${key} \u5FC5\u987B\u662F\u6587\u672C\u6570\u7EC4`);
    if (v.libraryFields !== void 0 && (!Array.isArray(v.libraryFields) || !v.libraryFields.every((e) => stringObject(e, ["section", "label", "value"])))) throw new Error("libraryFields \u683C\u5F0F\u4E0D\u6B63\u786E");
    for (const key of ["internships", "projects"]) {
      const items = v[key];
      if (!Array.isArray(items) || !items.every((e) => stringObject(e, key === "projects" ? ["name", "role", "startDate", "endDate"] : ["company", "department", "role", "startDate", "endDate"]) && stringArray(e.description) && (key !== "projects" || stringArray(e.skills)))) throw new Error(`${key} \u683C\u5F0F\u4E0D\u6B63\u786E`);
    }
    if (typeof v.selfIntroduction !== "string") throw new Error("\u81EA\u6211\u8BC4\u4EF7\u683C\u5F0F\u4E0D\u6B63\u786E");
    for (const key of Object.keys(p)) if (v[key] !== void 0) p[key] = v[key];
    return p;
  }

  // src/adapter.ts
  var normalize = (s) => s.toLowerCase().replace(/[\s*：:()（）_-]/g, "");
  var semanticAliases = [
    ["\u59D3\u540D", "\u4E2D\u6587\u59D3\u540D", "\u771F\u5B9E\u59D3\u540D", "name", "fullname"],
    ["\u624B\u673A\u53F7", "\u624B\u673A\u53F7\u7801", "\u8054\u7CFB\u7535\u8BDD", "\u8054\u7CFB\u7535\u8BDD\u53F7\u7801", "\u79FB\u52A8\u7535\u8BDD", "phone", "mobile", "telephone"],
    ["\u90AE\u7BB1", "\u7535\u5B50\u90AE\u7BB1", "\u7535\u5B50\u90AE\u4EF6", "email"],
    ["\u73B0\u5C45\u57CE\u5E02", "\u73B0\u5C45\u4F4F\u5730", "\u5C45\u4F4F\u57CE\u5E02", "\u76EE\u524D\u6240\u5728\u5730", "\u5F53\u524D\u6240\u5728\u5730"],
    ["\u5355\u4F4D\u540D\u79F0", "\u516C\u53F8", "\u516C\u53F8\u540D\u79F0", "\u5DE5\u4F5C\u5355\u4F4D", "\u4EFB\u804C\u5355\u4F4D", "\u96C7\u4E3B\u540D\u79F0"],
    ["\u4EFB\u804C\u90E8\u95E8", "\u90E8\u95E8", "\u6240\u5728\u90E8\u95E8", "\u5DE5\u4F5C\u90E8\u95E8"],
    ["\u62C5\u4EFB\u804C\u4F4D", "\u804C\u4F4D", "\u804C\u52A1", "\u5C97\u4F4D", "\u4EFB\u804C\u804C\u4F4D", "\u804C\u4F4D\u540D\u79F0"],
    ["\u5F00\u59CB\u65F6\u95F4", "\u8D77\u59CB\u65F6\u95F4", "\u4EFB\u804C\u5F00\u59CB\u65F6\u95F4", "\u5DE5\u4F5C\u5F00\u59CB\u65F6\u95F4", "\u9879\u76EE\u5F00\u59CB\u65F6\u95F4"],
    ["\u7ED3\u675F\u65F6\u95F4", "\u622A\u6B62\u65F6\u95F4", "\u79BB\u804C\u65F6\u95F4", "\u4EFB\u804C\u7ED3\u675F\u65F6\u95F4", "\u5DE5\u4F5C\u7ED3\u675F\u65F6\u95F4", "\u9879\u76EE\u7ED3\u675F\u65F6\u95F4"],
    ["\u5DE5\u4F5C\u5730\u70B9", "\u4EFB\u804C\u5730\u70B9", "\u5355\u4F4D\u6240\u5728\u5730"],
    ["\u4E0B\u5C5E\u4EBA\u6570", "\u76F4\u5C5E\u4E0B\u5C5E\u4EBA\u6570", "\u76F4\u63A5\u7BA1\u7406\u4EBA\u6570"],
    ["\u8BC1\u660E\u4EBA", "\u8BC1\u660E\u8054\u7CFB\u4EBA", "\u8BC1\u660E\u4EBA\u59D3\u540D"],
    ["\u8BC1\u660E\u7535\u8BDD", "\u8BC1\u660E\u4EBA\u7535\u8BDD", "\u8BC1\u660E\u8054\u7CFB\u4EBA\u7535\u8BDD"],
    ["\u4E3B\u8981\u804C\u8D23\u4E0E\u4E1A\u7EE9", "\u804C\u8D23\u4E0E\u4E1A\u7EE9", "\u5DE5\u4F5C\u804C\u8D23\u4E0E\u4E1A\u7EE9", "\u5DE5\u4F5C\u5185\u5BB9", "\u5DE5\u4F5C\u804C\u8D23", "\u4E3B\u8981\u804C\u8D23"],
    ["\u9879\u76EE\u540D\u79F0", "\u9879\u76EE\u540D"],
    ["\u9879\u76EE\u89D2\u8272", "\u9879\u76EE\u804C\u52A1", "\u9879\u76EE\u804C\u4F4D", "\u9879\u76EE\u4E2D\u89D2\u8272"],
    ["\u5B66\u6821", "\u5B66\u6821\u540D\u79F0", "\u9662\u6821", "\u9662\u6821\u540D\u79F0", "\u6BD5\u4E1A\u9662\u6821"],
    ["\u5B66\u9662", "\u9662\u7CFB", "\u5C31\u8BFB\u9662\u7CFB", "\u6240\u5728\u9662\u7CFB"],
    ["\u4E13\u4E1A", "\u4E13\u4E1A\u540D\u79F0", "\u6240\u5B66\u4E13\u4E1A", "\u5C31\u8BFB\u4E13\u4E1A"],
    ["\u5165\u5B66\u65F6\u95F4", "\u5165\u5B66\u65E5\u671F", "\u6559\u80B2\u5F00\u59CB\u65F6\u95F4"],
    ["\u6BD5\u4E1A\u65F6\u95F4", "\u6BD5\u4E1A\u65E5\u671F", "\u9884\u8BA1\u6BD5\u4E1A\u65F6\u95F4", "\u6BD5\u4E1A\u6216\u9884\u8BA1\u6BD5\u4E1A\u65F6\u95F4", "\u83B7\u5F97\u6BD5\u4E1A\u8BC1\u6216\u5B66\u4F4D\u8BC1\u65F6\u95F4"],
    ["\u6BD5\u4E1A\u9662\u6821\u6240\u5728\u56FD\u5BB6\u5730\u533A", "\u5B66\u6821\u6240\u5728\u56FD\u5BB6\u5730\u533A", "\u9662\u6821\u6240\u5728\u56FD\u5BB6\u5730\u533A", "\u9662\u6821\u6240\u5728\u5730"],
    ["\u5B66\u5386", "\u6700\u9AD8\u5B66\u5386"],
    ["\u5B66\u5236", "\u5B66\u4E60\u5E74\u9650"],
    ["\u7814\u7A76\u65B9\u5411", "\u4E13\u4E1A\u65B9\u5411"],
    ["\u884C\u4E1A", "\u6240\u5C5E\u884C\u4E1A", "\u6240\u5728\u884C\u4E1A"],
    ["\u804C\u80FD", "\u5C97\u4F4D\u804C\u80FD", "\u804C\u4F4D\u804C\u80FD"],
    ["\u76EE\u524D\u5DE5\u4F5C\u5355\u4F4D", "\u5F53\u524D\u5DE5\u4F5C\u5355\u4F4D", "\u73B0\u5DE5\u4F5C\u5355\u4F4D"],
    ["\u5DE5\u4F5C\u5E74\u9650", "\u5DE5\u4F5C\u7ECF\u9A8C\u5E74\u9650", "\u4ECE\u4E1A\u5E74\u9650"],
    ["\u81EA\u6211\u8BC4\u4EF7", "\u4E2A\u4EBA\u8BC4\u4EF7", "\u81EA\u6211\u4ECB\u7ECD", "\u4E2A\u4EBA\u4F18\u52BF"],
    ["\u662F\u5426\u63A5\u53D7\u5DE5\u4F5C\u5730\u70B9\u53D8\u66F4", "\u662F\u5426\u63A5\u53D7\u5DE5\u4F5C\u5730\u53D8\u66F4", "\u662F\u5426\u63A5\u53D7\u5DE5\u4F5C\u5730\u70B9\u8C03\u6574"]
  ];
  var aliasIndex = new Map(semanticAliases.flatMap((group, index) => group.map((alias) => [normalize(alias), index])));
  var canonicalLabel = (label) => aliasIndex.get(normalize(label));
  function sectionKindOf(text) {
    const value = normalize(text);
    if (/教育|education/.test(value)) return "education";
    if (/工作|实习|work|intern/.test(value)) return "work";
    if (/项目|project/.test(value)) return "project";
    if (/校园|社团|campus/.test(value)) return "campus";
    if (/求职|意向|intent/.test(value)) return "intent";
    if (/基本|basicinfo/.test(value)) return "basic";
    return "other";
  }
  function bigrams(value) {
    const normalized = normalize(value).replace(/当前|目前|所在|名称|信息|情况/g, "");
    const result = /* @__PURE__ */ new Set();
    for (let index = 0; index < normalized.length - 1; index++) result.add(normalized.slice(index, index + 2));
    return result;
  }
  function similarity(a, b) {
    const left = bigrams(a), right = bigrams(b);
    if (!left.size || !right.size) return 0;
    let overlap = 0;
    for (const item of left) if (right.has(item)) overlap++;
    return 2 * overlap / (left.size + right.size);
  }
  var sensitive = /政治|婚姻|薪资|调剂|偏好|出差|加班|服从|亲属|竞业|offer|入职|身份证|户籍|声明|同意|授权|隐私|验证码|密码|证明人|证明电话|password|captcha|consent|salary|passport|national.?id|referee/i;
  var dictionary = {
    "basicInfo.name": ["\u59D3\u540D", "\u4E2D\u6587\u59D3\u540D", "\u771F\u5B9E\u59D3\u540D", "name", "fullname"],
    "basicInfo.phone": ["\u624B\u673A", "\u624B\u673A\u53F7\u7801", "\u624B\u673A\u53F7", "\u8054\u7CFB\u7535\u8BDD", "\u7535\u8BDD", "phone", "mobile", "telephone"],
    "basicInfo.email": ["\u90AE\u7BB1", "\u7535\u5B50\u90AE\u7BB1", "\u7535\u5B50\u90AE\u4EF6", "email"],
    "basicInfo.gender": ["\u6027\u522B", "gender"],
    "basicInfo.birthday": ["\u51FA\u751F\u65E5\u671F", "\u751F\u65E5", "birthday"],
    "basicInfo.location": ["\u73B0\u5C45\u4F4F\u5730", "\u73B0\u5C45\u57CE\u5E02", "\u5C45\u4F4F\u57CE\u5E02", "\u76EE\u524D\u6240\u5728\u5730", "\u5F53\u524D\u6240\u5728\u5730"],
    "education.school": ["\u5B66\u6821", "\u5B66\u6821\u540D\u79F0", "\u6BD5\u4E1A\u9662\u6821", "\u9662\u6821\u540D\u79F0", "\u9662\u6821", "school", "university"],
    "education.college": ["\u5B66\u9662", "\u9662\u7CFB", "\u5C31\u8BFB\u9662\u7CFB", "college"],
    "education.major": ["\u6240\u5B66\u4E13\u4E1A", "\u4E13\u4E1A", "\u4E13\u4E1A\u540D\u79F0", "major"],
    "education.degree": ["\u5B66\u5386", "\u6700\u9AD8\u5B66\u5386", "degree"],
    "education.startDate": ["\u5165\u5B66\u65F6\u95F4", "\u5165\u5B66\u65E5\u671F", "startdate"],
    "education.endDate": ["\u6BD5\u4E1A\u65F6\u95F4", "\u6BD5\u4E1A\u65E5\u671F", "\u6BD5\u4E1A\u6216\u9884\u8BA1\u6BD5\u4E1A\u65F6\u95F4", "\u83B7\u5F97\u6BD5\u4E1A\u8BC1\u6216\u5B66\u4F4D\u8BC1\u65F6\u95F4", "enddate"],
    "education.gpa": ["gpa", "\u5E73\u5747\u7EE9\u70B9", "\u7EE9\u70B9"],
    "education.rank": ["\u4E13\u4E1A\u6392\u540D", "\u6210\u7EE9\u6392\u540D", "\u6392\u540D"]
  };
  function mapLabel(label) {
    if (sensitive.test(label)) return { confidence: 0, reason: "\u654F\u611F\u4FE1\u606F\u6216\u6388\u6743\u9879\uFF0C\u8BF7\u7528\u6237\u586B\u5199" };
    if (/毕业院校.*(?:国家|地区)|学校.*(?:国家|地区)|院校所在地/.test(label)) return { confidence: 0, reason: "\u9662\u6821\u5730\u533A\u5B57\u6BB5\u9700\u5355\u72EC\u5339\u914D" };
    const n = normalize(label);
    for (const [path, aliases] of Object.entries(dictionary)) if (aliases.some((a) => normalize(a) === n)) return { path, confidence: 0.98 };
    if (/类别|方向|意向|期望|学位|联系人|紧急|英文/.test(label)) return { confidence: 0, reason: "\u5B57\u6BB5\u542B\u4E49\u4E0D\u660E\u786E\uFF0C\u8BF7\u7528\u6237\u586B\u5199" };
    for (const [path, aliases] of Object.entries(dictionary)) if (aliases.some((a) => a.length >= 3 && n.includes(normalize(a)))) return { path, confidence: 0.8 };
    return { confidence: 0, reason: "\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u7528\u6237\u586B\u5199" };
  }
  function queryRoots(root) {
    const roots = [root];
    for (const element of Array.from(root.querySelectorAll("*"))) if (element.shadowRoot) roots.push(...queryRoots(element.shadowRoot));
    return roots;
  }
  function deepQueryAll(root, selector) {
    return queryRoots(root).flatMap((current2) => Array.from(current2.querySelectorAll(selector)));
  }
  var fieldContainer = (el) => el.closest(".aui-form-item,.el-form-item,.ant-form-item,.form-group,[data-field]");
  function labelOf(el) {
    const labelledBy = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => el.ownerDocument.getElementById(id)?.textContent ?? "").join(" ").trim();
    const label = Array.from(el.labels ?? []).map((l) => {
      const copy = l.cloneNode(true);
      copy.querySelectorAll("input,select,textarea,button").forEach((control) => control.remove());
      return copy.textContent?.trim() ?? "";
    }).join(" ");
    const nearby = fieldContainer(el)?.querySelector(".aui-form-item__label,.form-item__label,.el-form-item__label,.ant-form-item-label,label")?.textContent?.trim();
    return label || labelledBy || el.getAttribute("aria-label") || nearby || el.getAttribute("placeholder") || el.name || el.id || "\u65E0\u6807\u7B7E\u5B57\u6BB5";
  }
  function visible(el) {
    for (let p = el; p; ) {
      if (p.hidden || p.getAttribute("aria-hidden") === "true" || getComputedStyle(p).display === "none" || getComputedStyle(p).visibility === "hidden") return false;
      const root = p.getRootNode();
      p = p.parentElement || (root instanceof ShadowRoot ? root.host : null);
    }
    return true;
  }
  var current = (el) => el instanceof HTMLInputElement && ["radio", "checkbox"].includes(el.type) ? el.checked ? el.value : "" : el.value;
  var equal = (a, b) => normalize(a.replace(/[./]/g, "-")) === normalize(b.replace(/[./]/g, "-"));
  function profileValue(profile, path) {
    if (!path) return "";
    let value = profile;
    for (const key of path.split(".")) {
      if (!value || typeof value !== "object") return "";
      value = value[key];
    }
    return typeof value === "string" ? value : "";
  }
  function libraryMapping(profile, pageField) {
    if (sensitive.test(pageField.label)) return { confidence: 0, reason: "\u654F\u611F\u4FE1\u606F\u6216\u6388\u6743\u9879\uFF0C\u8BF7\u7528\u6237\u586B\u5199" };
    const candidates = profile.libraryFields.map((field, index) => ({ field, index })).filter(({ field }) => {
      if (!field.value) return false;
      const kind = sectionKindOf(field.section);
      if (pageField.sectionKind && pageField.sectionKind !== "other" && kind !== pageField.sectionKind) return false;
      if (pageField.entryIndex !== void 0 && ["education", "work", "project", "campus"].includes(kind)) {
        const number = field.section.match(/(\d+)/)?.[1];
        if (number && Number(number) !== pageField.entryIndex + 1) return false;
      }
      return true;
    }).map((candidate) => {
      const exact = normalize(candidate.field.label) === normalize(pageField.label);
      const left = canonicalLabel(candidate.field.label), right = canonicalLabel(pageField.label);
      const alias = left !== void 0 && left === right;
      const fuzzy = similarity(candidate.field.label, pageField.label);
      return { ...candidate, score: exact ? 0.98 : alias ? 0.92 : fuzzy >= 0.72 ? Math.min(0.86, 0.72 + fuzzy * 0.14) : 0, method: exact ? "\u7CBE\u786E\u6807\u7B7E" : alias ? "\u540C\u4E49\u8BCD" : "\u76F8\u4F3C\u5B57\u6BB5" };
    }).filter((candidate) => candidate.score >= 0.76).sort((a, b) => b.score - a.score);
    if (!candidates.length) return { confidence: 0, reason: "\u5185\u5BB9\u5E93\u4E2D\u6CA1\u6709\u53EF\u9760\u8FD1\u4F3C\u5B57\u6BB5\uFF0C\u8BF7\u7528\u6237\u586B\u5199" };
    const best = candidates[0], contenders = candidates.filter((candidate) => best.score - candidate.score < 0.08);
    const values = [...new Set(contenders.map((candidate) => candidate.field.value))];
    if (values.length > 1) return { confidence: 0, reason: "\u5185\u5BB9\u5E93\u4E2D\u6709\u591A\u4E2A\u76F8\u8FD1\u5B57\u6BB5\u4E14\u503C\u4E0D\u540C\uFF0C\u8BF7\u7528\u6237\u786E\u8BA4" };
    return { path: `libraryFields.${best.index}.value`, confidence: best.score, reason: `${best.method} \xB7 \u6765\u81EA\u5185\u5BB9\u5E93\uFF1A${best.field.section}` };
  }
  var HuaweiAdapter = class {
    constructor(doc = document) {
      this.doc = doc;
    }
    matches(url) {
      try {
        const u = new URL(url);
        return u.protocol === "https:" && u.hostname === "career.huawei.com";
      } catch {
        return false;
      }
    }
    detectPageType() {
      return this.getFormFields().length ? "resume" : "unknown";
    }
    getFormFields() {
      const elements = deepQueryAll(this.doc, "input,textarea,select").filter((el) => visible(el) && !el.disabled && !["hidden", "submit", "button", "reset", "file", "image"].includes(el.type));
      const moduleSelector = ".basicInfoModule,.jobIntentionModule,.educationExperienceModule,.workExperienceModule,.projectExperienceModule,.campusExperienceModule,[data-resume-section]";
      const modules = deepQueryAll(this.doc, moduleSelector);
      const fields = elements.map((element, i) => {
        const label = labelOf(element), mapping = mapLabel(label);
        const hints = [element.name, element.id, element.getAttribute("placeholder") ?? ""].join(" ");
        const blocked = sensitive.test(label + " " + hints) || ["password", "checkbox", "radio"].includes(element.type);
        const module = element.closest(moduleSelector), sectionKind = module ? sectionKindOf(`${module.id} ${module.className}`) : void 0;
        const peers = module && sectionKind ? modules.filter((candidate) => sectionKindOf(`${candidate.id} ${candidate.className}`) === sectionKind) : [];
        const entryIndex = module && ["education", "work", "project", "campus"].includes(sectionKind ?? "") ? peers.indexOf(module) : void 0;
        return { id: `field-${i}`, label, type: element.getAttribute("role") === "combobox" ? "combobox" : element.type, element, mappedResumeField: blocked ? void 0 : mapping.path, confidence: blocked ? 0 : mapping.confidence, reason: blocked ? "\u6388\u6743\u3001\u654F\u611F\u6216\u9009\u62E9\u9879\uFF0C\u8BF7\u7528\u6237\u586B\u5199" : mapping.reason, sectionKind, entryIndex };
      });
      const groups = [];
      for (const f of fields.filter((f2) => f2.mappedResumeField?.startsWith("education."))) {
        const group = f.element.closest("fieldset,[data-education-entry],.education-item,.education-entry,.educationExperienceModule");
        if (group && !groups.includes(group)) groups.push(group);
      }
      const originalPaths = new Map(fields.map((f) => [f, f.mappedResumeField]));
      for (const f of fields) {
        if (!f.mappedResumeField?.startsWith("education.")) continue;
        const path = f.mappedResumeField;
        const group = f.element.closest("fieldset,[data-education-entry],.education-item,.education-entry,.educationExperienceModule");
        const duplicate = fields.filter((x) => originalPaths.get(x) === path && (!group || group.contains(x.element))).length > 1;
        const heading = group?.querySelector("legend,h2,h3,h4")?.textContent ?? "";
        if (duplicate || groups.length > 1 && !group || /工作|项目|实习/.test(heading)) {
          f.confidence = 0;
          f.reason = "\u7ECF\u5386\u5206\u7EC4\u4E0D\u660E\u786E\uFF0C\u8BF7\u7528\u6237\u586B\u5199";
          f.mappedResumeField = void 0;
        } else f.mappedResumeField = path.replace("education.", `education.${group ? groups.indexOf(group) : 0}.`);
      }
      return fields;
    }
    async fillField(field, value) {
      const el = field.element;
      if (!el.isConnected || !visible(el) || el.disabled || el.matches("[readonly]") || ["radio", "checkbox", "password"].includes(el.type) || field.type === "combobox" || el.getAttribute("aria-haspopup")) return false;
      if (el instanceof HTMLInputElement && el.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      if (el instanceof HTMLSelectElement) {
        const options = Array.from(el.options).filter((o) => !o.disabled && (equal(o.text, value) || equal(o.value, value)));
        if (options.length !== 1) return false;
        value = options[0].value;
      }
      const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 80));
      return el.isConnected && el.value === value;
    }
    async run(profile, fill = false) {
      const fields = this.getFormFields();
      const results = [];
      for (const f of fields) {
        const blocked = sensitive.test([f.label, f.element.name, f.element.id, f.element.getAttribute("placeholder") ?? ""].join(" ")) || ["password", "checkbox", "radio"].includes(f.element.type) || f.reason === "\u7ECF\u5386\u5206\u7EC4\u4E0D\u660E\u786E\uFF0C\u8BF7\u7528\u6237\u586B\u5199";
        const fallback = !blocked && (!f.mappedResumeField || !profileValue(profile, f.mappedResumeField)) ? libraryMapping(profile, f) : void 0;
        const path = blocked ? void 0 : fallback?.path ?? f.mappedResumeField, confidence = path ? fallback?.path ? fallback.confidence : f.confidence : 0;
        const expected = profileValue(profile, path), existing = current(f.element);
        const row = { id: f.id, label: f.label, path, confidence, status: "unknown", message: fallback?.reason ?? f.reason ?? "\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u7528\u6237\u586B\u5199" };
        if (path && expected) row.expected = expected;
        if (confidence >= 0.7 && path) {
          if (normalize(f.label) === "\u6700\u9AD8\u5B66\u5386" && profile.education.length > 1) {
            row.status = "review";
            row.message = "\u591A\u6BB5\u6559\u80B2\u7ECF\u5386\u7684\u6700\u9AD8\u5B66\u5386\u9700\u7531\u4F60\u786E\u8BA4";
          } else if (!expected) {
            row.status = "review";
            row.message = "\u5185\u5BB9\u5E93\u6CA1\u6709\u6B64\u9879\uFF0C\u8BF7\u8865\u5145\u6216\u624B\u52A8\u586B\u5199";
          } else if (existing) {
            const display = f.element instanceof HTMLSelectElement ? f.element.selectedOptions[0]?.text ?? existing : existing;
            row.status = equal(display, expected) || equal(existing, expected) ? "ok" : "review";
            row.message = row.status === "ok" ? "\u4E0E\u5185\u5BB9\u5E93\u4E00\u81F4" : "\u5DF2\u6709\u5185\u5BB9\u4E0E\u5185\u5BB9\u5E93\u4E0D\u540C\uFF0C\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u6838\u5BF9";
          } else if (!fill) {
            row.status = "review";
            row.message = "\u5C1A\u672A\u586B\u5199";
          } else {
            const done = await this.fillField(f, expected);
            row.status = done ? confidence >= 0.95 ? "filled" : "review" : "review";
            row.message = done ? confidence >= 0.95 ? "\u5DF2\u586B\u5199" : "\u5DF2\u586B\u5199\uFF0C\u5B57\u6BB5\u6620\u5C04\u9700\u8981\u786E\u8BA4" : "\u63A7\u4EF6\u4E0D\u652F\u6301\u6216\u7F51\u9875\u672A\u4FDD\u7559\u503C\uFF0C\u8BF7\u624B\u52A8\u586B\u5199";
          }
        } else if (f.element.required && !existing) row.message += "\uFF08\u5FC5\u586B\uFF09";
        results.push(row);
      }
      const warnings = validateProfile(profile);
      if (!fields.length) warnings.push("\u672A\u53D1\u73B0\u53EF\u89C1\u8868\u5355\uFF0C\u8BF7\u767B\u5F55\u5E76\u6253\u5F00\u57FA\u672C\u4FE1\u606F\u6216\u6559\u80B2\u7ECF\u5386\u7F16\u8F91\u533A");
      if (deepQueryAll(this.doc, "iframe").length) warnings.push("\u9875\u9762\u5305\u542B\u5D4C\u5165\u6846\u67B6\uFF1B\u672C\u7248\u53EA\u68C0\u67E5\u4E3B\u9875\u9762\uFF0C\u6846\u67B6\u5185\u5B57\u6BB5\u8BF7\u624B\u52A8\u6838\u5BF9");
      if (deepQueryAll(this.doc, '[role="combobox"]:not(input):not(select),.aui-select,.el-select,.ant-select').length) warnings.push("\u53D1\u73B0\u81EA\u5B9A\u4E49\u4E0B\u62C9\u63A7\u4EF6\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u5E76\u6838\u5BF9");
      const mappedIndexes = new Set(fields.map((f) => f.mappedResumeField?.match(/^education\.(\d+)\./)?.[1]).filter(Boolean));
      if (profile.education.length > mappedIndexes.size) warnings.push("\u9875\u9762\u6559\u80B2\u7ECF\u5386\u6570\u91CF\u5C11\u4E8E\u5185\u5BB9\u5E93\uFF0C\u8BF7\u624B\u52A8\u65B0\u589E\u5BF9\u5E94\u7ECF\u5386\u540E\u91CD\u65B0\u586B\u5199\uFF0C\u5E76\u786E\u8BA4\u987A\u5E8F\u4E00\u81F4");
      return { url: this.doc.location.href, title: this.doc.title, fields: results, warnings };
    }
    validate(profile) {
      return this.run(profile);
    }
  };

  // src/content.ts
  var scope = globalThis;
  if (!scope.__jobCopilotInstalled) {
    scope.__jobCopilotInstalled = true;
    let busy = false;
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL("")) || message?.type !== "COPILOT_RUN") return;
      const adapter = new HuaweiAdapter();
      if (!adapter.matches(location.href)) {
        respond({ error: "V0.2 \u4EC5\u652F\u6301 career.huawei.com" });
        return;
      }
      if (busy) {
        respond({ error: "\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u9879\u64CD\u4F5C\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5" });
        return;
      }
      busy = true;
      (async () => {
        try {
          const profile = parseProfile(message.profile);
          respond({ result: await adapter.run(profile, message.fill === true) });
        } catch {
          respond({ error: "\u586B\u5199\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5" });
        } finally {
          busy = false;
        }
      })();
      return true;
    });
  }
})();
