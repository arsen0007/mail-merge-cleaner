// lib/generateDocx.test.js
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { createTemplateDocxBlob, bodyToLines } from './generateDocx';

describe('bodyToLines', () => {
  it('splits a multi-line body into one line per "\\n", preserving blank lines', () => {
    const body = "Dear [Name],\n\nHello there.\n\nBest,\nMe";

    expect(bodyToLines(body)).toEqual([
      { text: 'Dear [Name],', bullet: false },
      { text: '', bullet: false },
      { text: 'Hello there.', bullet: false },
      { text: '', bullet: false },
      { text: 'Best,', bullet: false },
      { text: 'Me', bullet: false },
    ]);
  });

  it('detects "- " prefixed lines as bullet items and strips the marker', () => {
    const body = 'Please provide:\n- Item one\n- Item two';

    expect(bodyToLines(body)).toEqual([
      { text: 'Please provide:', bullet: false },
      { text: 'Item one', bullet: true },
      { text: 'Item two', bullet: true },
    ]);
  });
});

describe('createTemplateDocxBlob', () => {
  // Real-world bug (found by a client test download): the original
  // implementation put the entire multi-paragraph body into a single
  // docx Paragraph. Word does not treat literal "\n" characters inside a
  // <w:t> run as line/paragraph breaks, so the whole template rendered as
  // one unbroken run-on paragraph with no visible structure at all. This
  // test unzips the real generated .docx and checks the actual
  // document.xml, since a byte-count smoke test can't catch this class
  // of bug — Packer still produces a "non-empty ZIP" either way.
  it('renders each line of the body as its own paragraph, not one blob', async () => {
    const body = 'Dear [Name],\n\nHello there.\n\nBest,\nMe';
    const blob = await createTemplateDocxBlob(body);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml').async('string');

    const paragraphs = documentXml.match(/<w:p[ >]/g) || [];
    expect(paragraphs.length).toBe(bodyToLines(body).length);

    // No single run should contain a literal newline — that's exactly
    // the bug: text surviving as one run instead of split into <w:p>s.
    const runTexts = [...documentXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    expect(runTexts.every((t) => !t.includes('\n'))).toBe(true);
  });

  it('renders "- " prefixed lines as a real Word bullet list, not literal text', async () => {
    const body = 'Please provide:\n- Item one\n- Item two';
    const blob = await createTemplateDocxBlob(body);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const documentXml = await zip.file('word/document.xml').async('string');

    // Bulleted paragraphs get Word numbering properties (<w:numPr>), and
    // the leading "- " marker should be gone from the visible text.
    expect((documentXml.match(/<w:numPr>/g) || []).length).toBe(2);
    expect(documentXml).not.toMatch(/-\s*Item one/);
    expect(documentXml).toContain('Item one');
    expect(documentXml).toContain('Item two');
  });

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
