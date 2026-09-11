const fs = require('fs');
const path = require('path');

const H1_TITLE_RE = /^#\s+(.+)$/m;
const H2_SECTION_RE = /^##\s+(.+)$/;

/**
 * Splits a single markdown file into one chunk per H2 (`##`) section. H3+
 * subsections stay nested inside their parent H2 chunk rather than becoming
 * their own chunk — e.g. "Andheri Branch" / "Bandra Branch" (H3s under the
 * H2 "Our Locations") stay together as one chunk, which is the more useful
 * retrieval unit for a location question.
 */
function parseDocument(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath, '.md');

  const docIdMatch = fileName.match(/^(\d+)/);
  const docId = docIdMatch ? docIdMatch[1] : fileName;

  const titleMatch = raw.match(H1_TITLE_RE);
  const sourceDoc = titleMatch ? titleMatch[1].trim() : fileName;

  const lines = raw.split('\n');
  const chunks = [];
  let currentSection = null;
  let currentLines = [];

  function flush() {
    const body = currentLines.join('\n').trim();
    if (currentSection && body) {
      chunks.push({
        docId,
        sourceDoc,
        sectionTitle: currentSection,
        text: `${currentSection}\n\n${body}`,
      });
    }
  }

  for (const line of lines) {
    const sectionMatch = line.match(H2_SECTION_RE);
    if (sectionMatch) {
      flush();
      currentSection = sectionMatch[1].trim();
      currentLines = [];
    } else if (currentSection !== null) {
      currentLines.push(line);
    }
    // Lines before the first ## (i.e. the H1 title) are intentionally
    // skipped as their own chunk — the H1 becomes `sourceDoc` metadata instead.
  }
  flush();

  return chunks;
}

function loadAllDocuments(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  return files.flatMap((f) => parseDocument(path.join(dir, f)));
}

module.exports = { parseDocument, loadAllDocuments };