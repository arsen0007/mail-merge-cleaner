import { Document, Packer, Paragraph } from 'docx';

const BULLET_RE = /^\s*[-*]\s+(.*)$/;

// Turns a template body into one line-descriptor per "\n"-separated line.
// Word does not treat a literal "\n" inside a single text run as a line
// or paragraph break, so each line here becomes its own docx Paragraph
// below — otherwise the whole body renders as one run-on paragraph.
export function bodyToLines(body) {
  return String(body)
    .split(/\r\n|\r|\n/)
    .map((line) => {
      const bulletMatch = line.match(BULLET_RE);
      return bulletMatch
        ? { text: bulletMatch[1], bullet: true }
        : { text: line, bullet: false };
    });
}

export async function createTemplateDocxBlob(body) {
  const paragraphs = bodyToLines(body).map(({ text, bullet }) =>
    bullet ? new Paragraph({ text, bullet: { level: 0 } }) : new Paragraph(text)
  );

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(doc);
}
