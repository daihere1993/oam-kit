function isTemplate(tmp: string) {
  return !!tmp.match(/{{(\w+)}}/);
}

 /**
* @param tmp like: Start to attach "{{link}}
* @param info like: { link: "http://google.com" }
* @returns 
*/
export function getStringFromTemplate(tmp: string, info: { [key: string]: any } = {}) {
  if (isTemplate(tmp)) {
    return tmp.replace(/{{(\w+)}}/g, (...args) => {
      return info[args[1]];
    });
  } else {
    return tmp;
  }
}