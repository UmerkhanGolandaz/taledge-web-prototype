const fs = require('fs');

async function test() {
  const pdfParse = (await import('pdf-parse')).default;
  const buf = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n>>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(This is a test PDF for Aryan Budukh) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000251 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n355\n%%EOF\n");
  try {
    const data = await pdfParse(buf);
    console.log("Extracted text:", data.text);
  } catch(e) {
    console.error(e);
  }
}
test();
