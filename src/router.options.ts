import { Core_Console_Log } from './lib/ericchase/Core_Console_Log.js';

export function options(req: Request, url: URL, pathname: string): Promise<Response | undefined> {
  Core_Console_Log(`OPTIONS  ${pathname}`);

  // custom routing here
  switch (pathname) {
    case '/database/query': {
      // Example case of dealing with a public database?
      // For this example, the client might request content-type of JSON,
      //  so the "content-type" header should be allowed.
      return Promise.resolve(
        new Response(undefined, {
          headers: {
            // "Access-Control-Allow-Credentials": "true",
            'Access-Control-Allow-Headers': 'content-type',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Origin': '*',
            // "Access-Control-Expose-Headers": "* or [<header-name>[, <header-name>]*]",
            // "Access-Control-Max-Age": "<delta-seconds>",
            // "Vary": "* or <header-name>, <header-name>, ..."
          },
          status: 204, // 204 No Content
        }),
      );
    }
  }
  return Promise.resolve(undefined);
}
