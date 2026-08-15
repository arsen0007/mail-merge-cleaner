// lib/generateDocx.test.js
import { describe, it, expect } from 'vitest';
import { createTemplateDocxBlob } from './generateDocx';

describe('createTemplateDocxBlob', () => {
  // A full docx-schema validation is overkill for this project's scale.
  // A .docx file is a ZIP archive, so asserting the blob is non-empty
  // and starts with the ZIP magic bytes ("PK") is a pragmatic smoke test
  // that catches "the generator is completely broken" without needing
  // to unzip and parse document.xml.
  it('produces a non-empty blob starting with the ZIP magic bytes', async () => {
    const blob = await createTemplateDocxBlob("Dear [Attorney's Name],\n\nHello.");

    expect(blob.size).toBeGreaterThan(0);

    const buffer = new Uint8Array(await blob.arrayBuffer());
    expect(buffer[0]).toBe(0x50); // 'P'
    expect(buffer[1]).toBe(0x4b); // 'K'
  });
});
