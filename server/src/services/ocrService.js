const Tesseract = require('tesseract.js');
const { PDFParse } = require('pdf-parse');

const { createCanvas } = require('@napi-rs/canvas');

const NATIVE_TEXT_MIN_LENGTH = 20;

async function ocrImageBuffer(buffer) {
  const { data } = await Tesseract.recognize(buffer, 'eng');

  return {
    text: data.text.trim(),
    ocrConfidence:
      Math.round((data.confidence / 100) * 1000) / 1000,
  };
}

async function rasterizePdfPage(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum);

  const viewport = page.getViewport({ scale: 2.0 });

  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height)
  );

  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toBuffer('image/png');
}

async function extractFromPdf(buffer) {
  // First try native PDF text extraction.
  const parser = new PDFParse({ data: buffer });
  let parsed;
  try {
    parsed = await parser.getText();
  } finally {
    await parser.destroy();
  }

  if (
    parsed.text &&
    parsed.text.trim().length >= NATIVE_TEXT_MIN_LENGTH
  ) {
    return {
      text: parsed.text.trim(),
      ocrConfidence: 1.0,
      method: 'native_text',
    };
  }

  // Image-only / scanned PDF → rasterize + OCR.
  const pdfjsLib = await import(
    'pdfjs-dist/legacy/build/pdf.mjs'
  );

  const pdfDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  const pageTexts = [];
  const pageConfidences = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pngBuffer = await rasterizePdfPage(pdfDoc, i);

    const { text, ocrConfidence } =
      await ocrImageBuffer(pngBuffer);

    pageTexts.push(text);
    pageConfidences.push(ocrConfidence);
  }

  const avgConfidence =
    pageConfidences.reduce((a, b) => a + b, 0) /
    (pageConfidences.length || 1);

  return {
    text: pageTexts.join('\n'),
    ocrConfidence:
      Math.round(avgConfidence * 1000) / 1000,
    method: 'ocr_rasterized',
  };
}

async function extractDocument(
  buffer,
  mimetype,
  filename = ''
) {
  const isPdf =
    mimetype === 'application/pdf' ||
    filename.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    return extractFromPdf(buffer);
  }

  const { text, ocrConfidence } =
    await ocrImageBuffer(buffer);

  return {
    text,
    ocrConfidence,
    method: 'ocr_image',
  };
}

module.exports = {
  extractDocument,
};
