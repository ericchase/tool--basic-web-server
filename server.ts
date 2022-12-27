// deno run --allow-env=PORT --allow-net --allow-read server.ts
// docs: https://deno.land/std/http
import { Server } from "https://deno.land/std/http/server.ts";
import * as path from "https://deno.land/std/path/mod.ts";

// Add MIME types
function getMIMEType(ext: string) {
  switch (ext) {
    case ".css":  /**/ return "text/css";
    case ".gif":  /**/ return "image/gif";
    case ".html": /**/ return "text/html";
    case ".ico":  /**/ return "image/x-icon";
    case ".jpg":  /**/ return "image/jpeg";
    case ".js":   /**/ return "text/javascript";
    case ".mp4":  /**/ return "video/mp4";
    case ".png":  /**/ return "image/png";
    case ".svg":  /**/ return "image/svg+xml";
    default:
      return "text/plain";
  }
}

// Set port to listen on
const preferredPort = Number.parseInt(Deno.env.get("PORT") ?? "8000");

// Add files to serve directly
const absolutePaths: { [key: string]: string } = {
  "/": "./console.html",
};

// Add custom API endpoints
function handler(request: Request) {
  const requestUrl = new URL(request.url);
  const resourcePath = decodeURI(requestUrl.pathname);

  console.log(`  ${resourcePath}  `);

  switch (resourcePath) {
    case "/api/restart":
      console.log("Restarting...\n\n");
      return exit(2, "Restarting server.");
    case "/api/shutdown":
      console.log("Shutting down...\n\n");
      return exit(0, "Shutting down server.");
    case "/api/list":
      return listing();
    default:
      return processPath(resourcePath);
  }
}

// Server functions below this line

async function tryServe(port: number) {
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

function exit(code: number, message: string) {
  setTimeout(() => Deno.exit(code), 100);
  return new Response(message);
}

function processPath(resourcePath: string) {
  try {
    const { body, init } = resourcePath in absolutePaths
      ? getResource(absolutePaths[resourcePath])
      : getResource(resourcePath, "public");
    return new Response(body, init);
  } catch (_) {
    _;
  }
  return new Response("File not found", { status: 404 });
}

function getResource(resourcePath: string, root = "") {
  const filteredPath = path
    .normalize(resourcePath)
    .split(path.sep)
    .filter((s: string) => s !== "." && s !== "..");

  const response = { body: "", mimetype: "" };

  const filePath = path
    .join(root, ...filteredPath);
  const fileExt = path
    .extname(filePath);

  // Try to read file. If the file doesn't exist and the path does not contain
  // a file extension, add '.js' as the file extension, and try again. Possibly
  // do this with '.ts' as well.
  // WARNING: I'm not sure how this is implemented in production servers.
  try {
    response.body = Deno.readFileSync(filePath);
    response.mimetype = getMIMEType(fileExt);
  } catch (e) {
    if (fileExt.length === 0) {
      response.body = Deno.readFileSync(filePath + '.js');
      response.mimetype = getMIMEType('.js');
    }
  }

  return {
    "body": response.body,
    "init": {
      "headers": {
        "Content-Type": response.mimetype,
      },
    },
  };
}

async function listing() {
  const entries: string[] = [];
  await listDir("", entries);
  return new Response(JSON.stringify(entries));
}

async function listDir(path: string, entries: string[]) {
  for await (const dirEntry of Deno.readDir(`./public${path}`)) {
    if (dirEntry.isDirectory) {
      await listDir(`${path}/${dirEntry.name}`, entries);
    } else if (dirEntry.isFile) {
      entries.push(`${path}/${dirEntry.name}`);
    }
  }
}

function tryNextPort(port: number, message: string) {
  console.log(`${message}`);
  setTimeout(() => tryServe(port + 1), 100);
}

tryServe(preferredPort);
