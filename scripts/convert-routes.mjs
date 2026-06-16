import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "app");
const destinationRoot = path.join(root, "nextjs-app", "app");

const files = [];

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(absolute);
    }
  }
}

function addClientDirective(source) {
  const trimmed = source.trimStart();
  if (
    trimmed.startsWith('"use client"') ||
    trimmed.startsWith("'use client'")
  ) {
    return source;
  }
  return `"use client";\n\n${source}`;
}

function writePassThroughLayout(destinationDirectory) {
  ensureDir(destinationDirectory);
  const content = `import type { ReactNode } from "react";

export default function SectionLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
`;
  fs.writeFileSync(path.join(destinationDirectory, "layout.tsx"), content);
}

walk(sourceRoot);

for (const source of files) {
  const relative = path.relative(sourceRoot, source).split(path.sep).join("/");

  if (relative === "_layout.tsx" || relative === "(tabs)/_layout.tsx") {
    continue;
  }

  if (relative.endsWith("/_layout.tsx")) {
    const directoryRelative = relative.slice(0, -"/_layout.tsx".length);
    writePassThroughLayout(path.join(destinationRoot, directoryRelative));
    continue;
  }

  let destinationRelative;

  if (relative === "+not-found.tsx") {
    destinationRelative = "not-found.tsx";
  } else if (relative === "index.tsx") {
    destinationRelative = "page.tsx";
  } else if (relative === "(tabs)/index.tsx") {
    destinationRelative = "(tabs)/dashboard/page.tsx";
  } else if (relative.endsWith("/index.tsx")) {
    destinationRelative = `${relative.slice(0, -"index.tsx".length)}page.tsx`;
  } else {
    const parsed = path.posix.parse(relative);
    destinationRelative = path.posix.join(parsed.dir, parsed.name, "page.tsx");
  }

  const destination = path.join(destinationRoot, destinationRelative);
  ensureDir(path.dirname(destination));

  const sourceCode = fs.readFileSync(source, "utf8");
  fs.writeFileSync(destination, addClientDirective(sourceCode));
}
