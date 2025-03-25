import { query } from './db.js';
import { ConsoleLog } from './lib/ericchase/Utility/Console.js';

export async function post(req: Request, url: URL, pathname: string): Promise<Response | undefined> {
  ConsoleLog(`POST     ${pathname}`);

  // ConsoleLog(`HEADERS`);
  // for (const [k, v] of req.headers) {
  //   ConsoleLog(`    ${k}: ${v}`);
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
      } catch (error) {
        return new Response(JSON.stringify(error), {
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
