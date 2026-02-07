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
  // Files are in dist/public (since this file is compiled to dist/static.cjs)
  const distPath = path.resolve(__dirname, "public");
  
  console.log(`Looking for static files at: ${distPath}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(`ERROR: Could not find build directory: ${distPath}`);
    throw new Error(
      `Could not find the build directory: ${distPath}`
    );
  }

  // Serve static files
  app.use(express.static(distPath));

  // Handle SPA routing - serve index.html for all non-API routes
  // FIX: Use a proper route handler instead of "*"
  app.get("/*", (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    console.log(`Serving index.html for route: ${req.path}`);
    res.sendFile(path.join(distPath, "index.html"));
  });
}
