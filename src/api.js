export async function api(path, options={}) {
  const response=await fetch(`/api${path}`,options);
  const type=response.headers.get('content-type') || '';
  const body=type.includes('application/json') ? await response.json() : await response.blob();
  if(!response.ok) throw Object.assign(new Error(body.error || 'Request failed.'),{fields:body.fields});
  return body;
}
export const json = (method, body) => ({ method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
