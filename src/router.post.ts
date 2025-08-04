import { query } from './db.js';
import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';

export async function post(req: Request, url: URL, pathname: string): Promise<Response | undefined> {
  Core_Console_Log(`POST     ${pathname}`);

  // Core_Console_Log(`HEADERS`);
  // for (const [k, v] of req.headers) {
  //   Core_Console_Log(`    ${k}: ${v}`);
  // }

  // custom routing here
  switch (pathname) {
    case '/database/query': {
      try {
        const { text, params } = await req.json();
        const result = await query(text, params);
        return new Response(JSON.stringify(result), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
        });
      } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify('Internal Server Error: Check server logs.'), {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          status: 500,
        });
      }
    }
  }
}

export async function analyzeBody(req: Request | Response) {
  const data: {
    blob?: true;
    form?: true;
    json?: true;
    text?: true;
  } = {};
  try {
    await req.clone().blob();
    data.blob = true;
  } catch (_) {}
  try {
    await req.clone().formData();
    data.form = true;
  } catch (_) {}
  try {
    await req.clone().json();
    data.json = true;
  } catch (_) {}
  try {
    await req.clone().text();
    data.text = true;
  } catch (_) {}
  return data;
}
