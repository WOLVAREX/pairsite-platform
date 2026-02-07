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

  // Serve static files
  app.use(express.static(distPath));
  
  // Serve index.html for all non-API routes using middleware
  app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Skip if it's a file request (has extension)
    if (path.extname(req.path)) {
      return next();
    }
    
    // Serve index.html for SPA routes
    res.sendFile(path.join(distPath, "index.html"));
  });
}
