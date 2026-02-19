import type { ChatMessage } from '../types';

// ========== EXPORT TO MARKDOWN ==========

export const exportToMarkdown = (title: string, messages: ChatMessage[]): string => {
    const date = new Date().toLocaleDateString('vi-VN');
    let md = `# ${title}\n> Xuất ngày: ${date}\n\n---\n\n`;

    for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (msg.role === 'user') {
            md += `### 👤 Bạn (${time})\n${msg.text}\n\n---\n\n`;
        } else {
            md += `### 🤖 Trợ lý GV (${time})\n${msg.text}\n\n---\n\n`;
        }
    }

    return md;
};

export const downloadMarkdown = (title: string, messages: ChatMessage[]) => {
    const md = exportToMarkdown(title, messages);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
};

// ========== EXPORT TO WORD (.docx) ==========

export const downloadWord = async (title: string, messages: ChatMessage[]) => {
    // Dynamic import to keep initial bundle small
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType } = await import('docx');

    const date = new Date().toLocaleDateString('vi-VN');

    const children: any[] = [
        new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `Xuất ngày: ${date}`, italics: true, color: '888888', size: 20 }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }),
        // Horizontal rule
        new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
            spacing: { after: 200 },
        }),
    ];

    for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const isUser = msg.role === 'user';
        const label = isUser ? `👤 Bạn (${time})` : `🤖 Trợ lý GV (${time})`;

        // Speaker heading
        children.push(new Paragraph({
            children: [
                new TextRun({
                    text: label,
                    bold: true,
                    size: 24,
                    color: isUser ? '4F46E5' : '059669',
                }),
            ],
            spacing: { before: 300, after: 100 },
        }));

        // Message content - split by lines
        const lines = msg.text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('### ')) {
                children.push(new Paragraph({
                    text: trimmed.replace(/^###\s*/, ''),
                    heading: HeadingLevel.HEADING_3,
                    spacing: { before: 100, after: 50 },
                }));
            } else if (trimmed.startsWith('## ')) {
                children.push(new Paragraph({
                    text: trimmed.replace(/^##\s*/, ''),
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 150, after: 50 },
                }));
            } else if (trimmed.startsWith('# ')) {
                children.push(new Paragraph({
                    text: trimmed.replace(/^#\s*/, ''),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 200, after: 100 },
                }));
            } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '• ' + trimmed.substring(2), size: 22 })],
                    indent: { left: 360 },
                    spacing: { after: 50 },
                }));
            } else if (/^\d+\.\s/.test(trimmed)) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: trimmed, size: 22 })],
                    indent: { left: 360 },
                    spacing: { after: 50 },
                }));
            } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: trimmed.replace(/\*\*/g, ''), bold: true, size: 22 })],
                    spacing: { after: 50 },
                }));
            } else if (trimmed === '') {
                children.push(new Paragraph({ text: '', spacing: { after: 50 } }));
            } else {
                // Parse inline bold **text**
                const parts = parseInlineBold(trimmed);
                children.push(new Paragraph({
                    children: parts.map(p => new TextRun({ text: p.text, bold: p.bold, size: 22 })),
                    spacing: { after: 50 },
                }));
            }
        }

        // Separator
        children.push(new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'EEEEEE' } },
            spacing: { before: 100, after: 200 },
        }));
    }

    const doc = new Document({
        sections: [{
            properties: {
                page: { margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 } },
            },
            children,
        }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(title)}.docx`;
    a.click();
    URL.revokeObjectURL(url);
};

// ========== HELPERS ==========

function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);
}

function parseInlineBold(text: string): { text: string; bold: boolean }[] {
    const parts: { text: string; bold: boolean }[] = [];
    const regex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ text: text.substring(lastIndex, match.index), bold: false });
        }
        parts.push({ text: match[1], bold: true });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push({ text: text.substring(lastIndex), bold: false });
    }

    return parts.length > 0 ? parts : [{ text, bold: false }];
}

// ========== EXPORT TO PDF (browser print) ==========

export const downloadPdf = (title: string, messages: ChatMessage[]) => {
    const date = new Date().toLocaleDateString('vi-VN');

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; line-height: 1.7; }
  h1 { text-align: center; color: #0d9488; margin-bottom: 5px; font-size: 24px; }
  .date { text-align: center; color: #94a3b8; font-style: italic; margin-bottom: 30px; font-size: 13px; }
  .msg { margin-bottom: 20px; padding: 16px 20px; border-radius: 12px; page-break-inside: avoid; }
  .user { background: #f0fdfa; border-left: 4px solid #14b8a6; }
  .ai { background: #f8fafc; border-left: 4px solid #06b6d4; }
  .speaker { font-weight: 700; font-size: 13px; margin-bottom: 6px; }
  .user .speaker { color: #0d9488; }
  .ai .speaker { color: #0891b2; }
  .content { font-size: 14px; white-space: pre-wrap; }
  .content strong { font-weight: 700; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 15px 0; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<h1>${title}</h1>
<p class="date">Xuất ngày: ${date}</p>`;

    for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const isUser = msg.role === 'user';
        const cls = isUser ? 'user' : 'ai';
        const label = isUser ? `👤 Bạn (${time})` : `🤖 Trợ lý GV (${time})`;
        // Simple markdown to HTML: bold, headers, lists
        let content = msg.text
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^### (.*$)/gm, '<h4 style="margin:8px 0 4px;font-size:15px;color:#334155">$1</h4>')
            .replace(/^## (.*$)/gm, '<h3 style="margin:10px 0 5px;font-size:16px;color:#1e293b">$1</h3>')
            .replace(/^# (.*$)/gm, '<h2 style="margin:12px 0 6px;font-size:18px;color:#0f172a">$1</h2>')
            .replace(/^- (.*$)/gm, '<div style="padding-left:16px">• $1</div>')
            .replace(/^\d+\. (.*$)/gm, '<div style="padding-left:16px">$&</div>');

        html += `<div class="msg ${cls}"><div class="speaker">${label}</div><div class="content">${content}</div></div>`;
    }

    html += `</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    }
};
