export async function post(req: Request): Promise<void | Response> {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  console.log(`POST     ${pathname}`);

  // console.log(`HEADERS`);
  // for (const [k, v] of req.headers) {
  //   console.log(`    ${k}: ${v}`);
  // }

  // custom routing here
  switch (pathname) {
    case '/database':
      // Example case of dealing with a public database?
      // Send back some fake data
      return new Response(JSON.stringify({ id: 1, user: 'John Smith' }), {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      });
  }
}

async function extractBody(req: Request | Response) {
  const data: {
    blob?: Blob;
    form?: FormData;
    json?: any;
    text?: string;
  } = {};
  try {
    data.form = await req.formData();
  } catch (_) {}
  try {
    data.json = await req.json();
  } catch (_) {}
  try {
    data.text = await req.text();
  } catch (_) {}
  try {
    data.blob = await req.blob();
  } catch (_) {}
  return data;
}
