import { Document, Packer, Paragraph } from 'docx';

export async function createTemplateDocxBlob(body) {
  const doc = new Document({
    sections: [{ children: [new Paragraph(body)] }],
  });
  return Packer.toBlob(doc);
}
