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
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle, AlignmentType, Table, TableRow, TableCell, WidthType, VerticalAlign } = await import('docx');

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
        let i = 0;
        while (i < lines.length) {
            const trimmed = lines[i].trim();

            // Check if this line starts a markdown table
            const tableResult = parseMarkdownTable(lines, i);
            if (tableResult) {
                const table = createDocxTable(tableResult.headers, tableResult.rows, { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType });
                children.push(table);
                children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
                i += tableResult.linesConsumed;
                continue;
            }

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
            i++;
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

// ========== TABLE HELPERS ==========

interface ParsedTable {
    headers: string[];
    rows: string[][];
    linesConsumed: number;
}

/**
 * Phân tích bảng markdown từ danh sách dòng.
 * Bảng markdown có dạng:
 *   | Header1 | Header2 |
 *   | ------- | ------- |
 *   | Data1   | Data2   |
 */
function parseMarkdownTable(lines: string[], startIndex: number): ParsedTable | null {
    // Need at least 2 lines (header + separator)
    if (startIndex + 1 >= lines.length) return null;

    const headerLine = lines[startIndex].trim();
    const separatorLine = lines[startIndex + 1].trim();

    // Check if header line looks like a table row
    if (!headerLine.includes('|')) return null;

    // Check if second line is a separator (contains only |, -, :, spaces)
    if (!(/^\|[\s\-:|]+\|$/.test(separatorLine) || /^[\s\-:|]+\|[\s\-:|]+$/.test(separatorLine))) return null;

    // Parse header cells
    const headers = parsePipeLine(headerLine);
    if (headers.length === 0) return null;

    // Parse data rows
    const rows: string[][] = [];
    let consumed = 2; // header + separator

    for (let j = startIndex + 2; j < lines.length; j++) {
        const rowLine = lines[j].trim();
        if (!rowLine.includes('|') || /^\|[\s\-:|]+\|$/.test(rowLine)) break;
        const cells = parsePipeLine(rowLine);
        if (cells.length === 0) break;
        rows.push(cells);
        consumed++;
    }

    // Must have at least header to be a valid table
    if (headers.length < 1) return null;

    return { headers, rows, linesConsumed: consumed };
}

/** Parse a markdown pipe-delimited line into cell values */
function parsePipeLine(line: string): string[] {
    // Remove leading/trailing pipes and split
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
    return trimmed.split('|').map(cell => cell.trim());
}

/** Create a docx Table object from parsed markdown table data */
function createDocxTable(
    headers: string[],
    rows: string[][],
    docx: any
): any {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, BorderStyle, VerticalAlign, AlignmentType } = docx;

    const tableBorder = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: '999999',
    };
    const borders = {
        top: tableBorder,
        bottom: tableBorder,
        left: tableBorder,
        right: tableBorder,
    };

    // Header row
    const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(h => {
            const parts = parseInlineBold(h.replace(/\*\*/g, ''));
            return new TableCell({
                borders,
                shading: { fill: 'E6FFFA' },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: parts.map(p => new TextRun({
                            text: p.text,
                            bold: true,
                            size: 21,
                            color: '0D6B5E',
                        })),
                        spacing: { before: 40, after: 40 },
                    }),
                ],
            });
        }),
    });

    // Data rows
    const dataRows = rows.map(row => {
        // Pad or trim row to match header length
        const normalizedRow = headers.map((_, idx) => row[idx] || '');
        return new TableRow({
            children: normalizedRow.map(cell => {
                const parts = parseInlineBold(cell);
                return new TableCell({
                    borders,
                    verticalAlign: VerticalAlign.CENTER,
                    children: [
                        new Paragraph({
                            children: parts.map(p => new TextRun({
                                text: p.text,
                                bold: p.bold,
                                size: 21,
                            })),
                            spacing: { before: 30, after: 30 },
                        }),
                    ],
                });
            }),
        });
    });

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...dataRows],
    });
}

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
