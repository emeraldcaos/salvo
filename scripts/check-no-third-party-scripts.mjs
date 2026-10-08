import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const sourceRoots = ['src', 'public'].map((directory) =>
  path.join(projectRoot, directory),
)
const checkedFiles = [path.join(projectRoot, 'index.html')]
const sourceExtensions = new Set([
  '.html',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
])
const remoteScriptPatterns = [
  /<script\b[^>]*\bsrc\s*=\s*["']\s*(?:https?:)?\/\//i,
  /\bimport\s*\(\s*["']\s*(?:https?:)?\/\//i,
  /\bimport\s+[\s\S]*?\bfrom\s*["']\s*(?:https?:)?\/\//i,
  /\bimport\s*["']\s*(?:https?:)?\/\//i,
  /\bimportScripts\s*\(\s*["']\s*(?:https?:)?\/\//i,
]

async function collectSourceFiles(directory) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      await collectSourceFiles(entryPath)
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      checkedFiles.push(entryPath)
    }
  }
}

for (const sourceRoot of sourceRoots) {
  await collectSourceFiles(sourceRoot)
}

const violations = []
for (const filePath of checkedFiles) {
  const content = await readFile(filePath, 'utf8')
  if (remoteScriptPatterns.some((pattern) => pattern.test(content))) {
    violations.push(path.relative(projectRoot, filePath))
  }
}

if (violations.length > 0) {
  console.error(
    `Third-party scripts are not allowed:\n${violations.join('\n')}`,
  )
  process.exitCode = 1
} else {
  console.log('No third-party script sources found.')
}
