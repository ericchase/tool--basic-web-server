// deno run --allow-env=PORT --allow-net --allow-read server.ts
// docs: https://deno.land/std/http
import { Server } from "https://deno.land/std/http/server.ts";
import * as path from "https://deno.land/std/path/mod.ts";

// Set port to listen on
const preferredPort = Number.parseInt(Deno.env.get("PORT") ?? "8000");

// Change public folder path
const publicPath = "./public";

// Add files to serve directly
const absolutePaths: { [key: string]: string } = {
  "/": "./console.html",
};

// Add CORS policies
function handleOptionsRequest(request: Request): Response | Promise<Response> {
  const requestedResource = decodeURI(new URL(request.url).pathname);
  console.log(`OPTIONS  ${requestedResource}`);
  switch (requestedResource) {
    case "/database":
      // Example case of dealing with a public database?
      // For this example, the client might request content-type of JSON,
      //  so the "content-type" header should be allowed.
      return new Response(undefined, {
        headers: {
          // "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "content-type",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Origin": "*",
          // "Access-Control-Expose-Headers": "* or [<header-name>[, <header-name>]*]",
          // "Access-Control-Max-Age": "<delta-seconds>",
          // "Vary": "* or <header-name>, <header-name>, ..."
        },
        status: 204, // 204 No Content
      });
    default:
      return new Response("Not Found", { status: 404 });
  }
}

// Add GET endpoints
function handleGetRequest(request: Request): Response | Promise<Response> {
  const requestedResource = decodeURI(new URL(request.url).pathname);
  console.log(`GET      ${requestedResource}`);
  switch (requestedResource) {
    case "/api/restart":
      console.log("Restarting...\n\n");
      return exit(2, "Restarting server.");
    case "/api/shutdown":
      console.log("Shutting down...\n\n");
      return exit(0, "Shutting down server.");
    case "/api/list":
      return listing();
    default:
      // Look for resource in public folder
      const resourceResponse = processPath(requestedResource);
      if (resourceResponse) return resourceResponse;
      return new Response("Not Found", { status: 404 });
  }
}

// Add POST endpoints
function handlePostRequest(request: Request): Response | Promise<Response> {
  const requestedResource = decodeURI(new URL(request.url).pathname);
  console.log(`POST     ${requestedResource}`);
  // console.log(`HEADERS`);
  // for (const [k, v] of request.headers) {
  //     console.log(`    ${k}: ${v}`);
  // }
  switch (requestedResource) {
    case "/database":
      // Example case of dealing with a public database?
      // Send back some fake data
      return new Response(JSON.stringify({ id: 0 }), {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    default:
      return new Response("Not Found", { status: 404 });
  }
}

// Add MIME types
const MIME_TYPE = new Map([
  [".css", "text/css"],
  [".gif", "image/gif"],
  [".html", "text/html"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

function getMIMEType(ext: string): string {
  return MIME_TYPE.get(ext) ?? "text/plain";
}

// Add HTTP methods
function handler(request: Request): Response | Promise<Response> {
  switch (request.method) {
    case "OPTIONS":
      return handleOptionsRequest(request);
    case "POST":
      return handlePostRequest(request);
    case "GET":
    default:
      return handleGetRequest(request);
  }
}

// Server functions below this line

async function tryServe(port: number): Promise<void> {
  try {
    const server = new Server({ port, handler });
    console.log(`Listening on http://localhost:${port}/`);
    await server.listenAndServe();
  } catch (err) {
    if (err instanceof Deno.errors.AddrInUse) {
      tryNextPort(port, `Port ${port} is already in use.`);
    } else if (err instanceof Deno.errors.PermissionDenied) {
      tryNextPort(port + 99, `Permission denied when accessing port ${port}.`);
    } else throw err;
  }
}

function exit(code: number, message: string): Response | Promise<Response> {
  setTimeout(() => Deno.exit(code), 100);
  return new Response(message);
}

function processPath(
  resourcePath: string,
): Response | Promise<Response> | undefined {
  try {
    const { body, init } = resourcePath in absolutePaths
      ? getResource(absolutePaths[resourcePath])
      : getResource(resourcePath, publicPath);
    return new Response(body, init);
  } catch (_) {
    _;
  }
  return undefined;
}

function getResource(
  resourcePath: string,
  root = "",
): { body?: BodyInit; init?: ResponseInit } {
  const filteredPath = path
    .normalize(resourcePath)
    .split(path.sep)
    .filter((s: string) => s !== "." && s !== "..");

  const response = { body: "", mimetype: "" };

  const filePath = path.join(root, ...filteredPath);
  const fileExt = path.extname(filePath);

  // Try to read file. If the file doesn't exist and the path does not contain
  // a file extension, add '.js' as the file extension, and try again. Possibly
  // do this with '.ts' as well.
  // WARNING: I'm not sure how this is implemented in production servers.
  try {
    response.body = Deno.readFileSync(filePath);
    response.mimetype = getMIMEType(fileExt);
  } catch (e) {
    if (fileExt.length === 0) {
      response.body = Deno.readFileSync(filePath + ".js");
      response.mimetype = getMIMEType(".js");
    }
  }

  return {
    body: response.body,
    init: {
      headers: {
        "Content-Type": response.mimetype,
      },
    },
  };
}

async function listing(): Promise<Response> {
  const entries: string[] = [];
  await listDir("", entries);
  return new Response(JSON.stringify(entries));
}

async function listDir(path: string, entries: string[]): Promise<void> {
  for await (const dirEntry of Deno.readDir(`${publicPath}/${path}`)) {
    if (dirEntry.isDirectory) {
      await listDir(`${path}/${dirEntry.name}`, entries);
    } else if (dirEntry.isFile) {
      entries.push(`${path}/${dirEntry.name}`);
    }
  }
}

function tryNextPort(port: number, message: string): void {
  console.log(`${message}`);
  setTimeout(() => tryServe(port + 1), 100);
}

tryServe(preferredPort);
