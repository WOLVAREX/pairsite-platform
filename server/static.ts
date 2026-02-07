// import express, { type Express } from "express";
// import fs from "fs";
// import path from "path";

// export function serveStatic(app: Express) {
//   const distPath = path.resolve(__dirname, "public");
//   if (!fs.existsSync(distPath)) {
//     throw new Error(
//       `Could not find the build directory: ${distPath}, make sure to build the client first`,
//     );
//   }

//   app.use(express.static(distPath));

//   // fall through to index.html if the file doesn't exist
//   app.use("/{*path}", (_req, res) => {
//     res.sendFile(path.resolve(distPath, "index.html"));
//   });
// }






import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  
  console.log(`Looking for static files at: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static files from the public directory
  app.use(express.static(distPath));
  
  // Serve index.html for the root route
  app.get("/", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  
  // For SPA routing, serve index.html for all non-API routes
  // This is the standard way to handle client-side routing
  app.get("*", (req, res, next) => {
    // Check if the request is for an API endpoint
    if (req.path.startsWith("/api/")) {
      return next(); // Let API routes handle it
    }
    
    // Check if it's a file request (has an extension like .css, .js, .png, etc.)
    const hasExtension = path.extname(req.path) !== "";
    
    if (hasExtension) {
      // If it's a file request but static middleware didn't find it, return 404
      return next();
    }
    
    // Otherwise, it's a client-side route - serve index.html
    res.sendFile(path.join(distPath, "index.html"));
  });
}
