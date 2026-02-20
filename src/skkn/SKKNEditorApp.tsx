import React, { useState, useCallback, useEffect } from 'react';
import { AppStep } from './skknTypes';
import type { SKKNData, SectionContent, TitleSuggestion, UserRequirements } from './skknTypes';
import { STEP_LABELS } from './skknConstants';
import * as geminiService from './services/skknGeminiService';
import SKKNStepUpload from './components/SKKNStepUpload';
import SKKNStepAnalysis from './components/SKKNStepAnalysis';
import SKKNStepDashboard from './components/SKKNStepDashboard';
import SKKNStepTitle from './components/SKKNStepTitle';
import SKKNStepEditor from './components/SKKNStepEditor';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface SKKNEditorAppProps {
    onClose: () => void;
}

// --- Local fallback parser ---
const parseSectionsLocal = (text: string): SectionContent[] => {
    interface SectionMatch { index: number; title: string; id: string; level: number; }
    let allMatches: SectionMatch[] = [];
    let matchCounter = 0;

    const level1Patterns = [
        { regex: /^(?:PHẦN|Phần)\s+([IVXLC]+)\b[.:)]*\s*(.*)/gim, idPrefix: 'phan' },
        { regex: /^([IVXLC]+)\.\s+([\wÀ-ỹ].*)/gim, idPrefix: 'roman' },
        { regex: /^(?:CHƯƠNG|Chương)\s+(\d+)\b[.:)]*\s*(.*)/gim, idPrefix: 'chuong' },
        { regex: /^(MỤC LỤC|TÀI LIỆU THAM KHẢO|PHỤ LỤC|DANH MỤC|LỜI CAM ĐOAN|LỜI CẢM ƠN|KẾT LUẬN VÀ KIẾN NGHỊ)\b(.*)/gim, idPrefix: 'named' },
    ];
    for (const { regex, idPrefix } of level1Patterns) {
        let match;
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            matchCounter++;
            allMatches.push({ index: match.index, title: match[0].trim(), id: `${idPrefix}-${matchCounter}`, level: 1 });
        }
    }

    const level2Regex = /^(\d+)\.\s+([\wÀ-ỹ][\wÀ-ỹ\s,;:'"()–\-]{5,})/gim;
    let m2;
    level2Regex.lastIndex = 0;
    while ((m2 = level2Regex.exec(text)) !== null) {
        matchCounter++;
        allMatches.push({ index: m2.index, title: m2[0].trim(), id: `l2-${matchCounter}`, level: 2 });
    }

    const level3Regex = /^(\d+\.\d+\.?\s+[\wÀ-ỹ][\wÀ-ỹ\s,;:'"()–\-]{5,})/gim;
    let m3;
    level3Regex.lastIndex = 0;
    while ((m3 = level3Regex.exec(text)) !== null) {
        matchCounter++;
        allMatches.push({ index: m3.index, title: m3[0].trim(), id: `l3-${matchCounter}`, level: 3 });
    }

    allMatches.sort((a, b) => a.index - b.index);
    const deduped: SectionMatch[] = [];
    for (const m of allMatches) {
        if (deduped.length === 0 || Math.abs(m.index - deduped[deduped.length - 1].index) > 5) {
            deduped.push(m);
        } else {
            const last = deduped[deduped.length - 1];
            if (m.level > last.level) deduped[deduped.length - 1] = m;
        }
    }

    if (deduped.length === 0) {
        const upperText = text.toUpperCase();
        const keywords = [
            { key: 'PHẦN I', id: 'section-1' }, { key: 'PHẦN II', id: 'section-2' },
            { key: 'PHẦN III', id: 'section-3' }, { key: 'PHẦN IV', id: 'section-4' },
            { key: 'PHẦN V', id: 'section-5' },
        ];
        for (const kw of keywords) {
            const idx = upperText.indexOf(kw.key);
            if (idx !== -1) {
                const lineEnd = text.indexOf('\n', idx);
                const title = text.substring(idx, lineEnd !== -1 ? lineEnd : idx + 80).trim();
                deduped.push({ index: idx, title, id: kw.id, level: 1 });
            }
        }
        deduped.sort((a, b) => a.index - b.index);
    }

    const sections: SectionContent[] = [];
    const parentStack: { id: string; level: number }[] = [];

    for (let i = 0; i < deduped.length; i++) {
        const current = deduped[i];
        const next = deduped[i + 1];
        const startPos = current.index;
        const endPos = next ? next.index : text.length;
        const rawContent = text.substring(startPos, endPos).trim();
        const titleLine = rawContent.split('\n')[0];
        const body = rawContent.substring(titleLine.length).trim();

        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= current.level) {
            parentStack.pop();
        }
        const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : undefined;

        sections.push({
            id: current.id, title: titleLine.trim(), level: current.level, parentId,
            originalContent: body, refinedContent: '', isProcessing: false,
            suggestions: [], editSuggestions: []
        });

        parentStack.push({ id: current.id, level: current.level });
    }

    return sections;
};

// --- Helper: Parse markdown table into docx Table ---
const parseContentToDocElements = (content: string, indent: number): (Paragraph | Table)[] => {
    const elements: (Paragraph | Table)[] = [];
    const lines = content.split('\n');
    let i = 0;

    const tableBorder = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: '000000',
    };
    const borders = {
        top: tableBorder,
        bottom: tableBorder,
        left: tableBorder,
        right: tableBorder,
        insideHorizontal: tableBorder,
        insideVertical: tableBorder,
    };

    while (i < lines.length) {
        const line = lines[i].trim();

        // Detect markdown table (line starts and ends with |)
        if (line.startsWith('|') && line.endsWith('|') && line.includes('|')) {
            // Collect all table lines
            const tableLines: string[] = [];
            while (i < lines.length) {
                const tl = lines[i].trim();
                if (tl.startsWith('|') && tl.endsWith('|')) {
                    tableLines.push(tl);
                    i++;
                } else {
                    break;
                }
            }

            // Filter out separator rows (|---|---|)
            const dataRows = tableLines.filter(row => !/^\|[\s\-:|]+\|$/.test(row));
            if (dataRows.length > 0) {
                const parsedRows = dataRows.map(row =>
                    row.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(cell => cell.trim())
                );

                const maxCols = Math.max(...parsedRows.map(r => r.length));

                const docRows = parsedRows.map((cells, rowIdx) => {
                    const isHeader = rowIdx === 0;
                    const tableCells = [];
                    for (let c = 0; c < maxCols; c++) {
                        const cellText = cells[c] || '';
                        tableCells.push(
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [
                                            new TextRun({
                                                text: cellText,
                                                bold: isHeader,
                                                size: 24,
                                                font: 'Times New Roman',
                                            }),
                                        ],
                                        spacing: { before: 40, after: 40 },
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                width: { size: Math.floor(9000 / maxCols), type: WidthType.DXA },
                                borders,
                            })
                        );
                    }
                    return new TableRow({ children: tableCells });
                });

                elements.push(
                    new Table({
                        rows: docRows,
                        width: { size: 9000, type: WidthType.DXA },
                    })
                );
                // Add spacing after table
                elements.push(new Paragraph({ spacing: { after: 100 } }));
            }
            continue;
        }

        // Normal paragraph
        if (line) {
            // Handle bold markdown: **text**
            const runs: TextRun[] = [];
            const boldRegex = /\*\*(.+?)\*\*/g;
            let lastIdx = 0;
            let match;
            while ((match = boldRegex.exec(line)) !== null) {
                if (match.index > lastIdx) {
                    runs.push(new TextRun({ text: line.substring(lastIdx, match.index), size: 26, font: 'Times New Roman' }));
                }
                runs.push(new TextRun({ text: match[1], bold: true, size: 26, font: 'Times New Roman' }));
                lastIdx = match.index + match[0].length;
            }
            if (lastIdx < line.length) {
                runs.push(new TextRun({ text: line.substring(lastIdx), size: 26, font: 'Times New Roman' }));
            }
            if (runs.length === 0) {
                runs.push(new TextRun({ text: line, size: 26, font: 'Times New Roman' }));
            }

            elements.push(new Paragraph({
                children: runs,
                spacing: { after: 100 },
                indent: { firstLine: 720, left: indent }
            }));
        }

        i++;
    }

    return elements;
};

const SKKNEditorApp: React.FC<SKKNEditorAppProps> = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);
    const [hasUploaded, setHasUploaded] = useState(false);
    const [data, setData] = useState<SKKNData>({
        fileName: '', originalText: '', currentTitle: '',
        analysis: null, titleSuggestions: [],
        selectedNewTitle: null, sections: []
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingSectionId, setProcessingSectionId] = useState<string | null>(null);
    const [toasts, setToasts] = useState<{ id: string; type: 'success' | 'error' | 'info'; message: string }[]>([]);
    const [userRequirements, setUserRequirements] = useState<UserRequirements>({
        pageLimit: null, referenceDocuments: [], customInstructions: ''
    });
    // Track which lazy operations have been triggered
    const [analysisTriggered, setAnalysisTriggered] = useState(false);
    const [titleGenTriggered, setTitleGenTriggered] = useState(false);

    const hasApiKey = !!geminiService.getApiKey();

    const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    // --- Tab navigation (free after upload) ---
    const handleTabClick = (step: AppStep) => {
        if (!hasUploaded && step !== AppStep.UPLOAD) return; // Can't go anywhere before upload
        setCurrentStep(step);
    };

    // --- Lazy analysis: runs when user clicks "Phân tích" tab for the first time ---
    useEffect(() => {
        if (currentStep === AppStep.ANALYZING && !data.analysis && hasUploaded && !analysisTriggered) {
            setAnalysisTriggered(true);
            runAnalysis();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, data.analysis, hasUploaded, analysisTriggered]);

    // --- Lazy title generation: runs when user clicks "Tên đề tài" tab for the first time ---
    useEffect(() => {
        if (currentStep === AppStep.TITLE_SELECTION && data.titleSuggestions.length === 0 && hasUploaded && !titleGenTriggered) {
            setTitleGenTriggered(true);
            runTitleGeneration();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, data.titleSuggestions.length, hasUploaded, titleGenTriggered]);

    const runAnalysis = async () => {
        if (!geminiService.getApiKey()) {
            addToast('error', 'Vui lòng cài API Key trong phần Cài đặt trước!');
            return;
        }
        setIsProcessing(true);
        try {
            const result = await geminiService.analyzeSKKN(data.originalText);

            // Also try AI structure parsing
            let sections = [...data.sections]; // keep existing local-parsed sections as fallback
            try {
                const parsed = await geminiService.parseStructure(data.originalText);
                const aiSections = parsed.map(s => ({
                    id: s.id, title: s.title, level: s.level || 1,
                    parentId: s.parentId || undefined,
                    originalContent: s.content || '', refinedContent: '',
                    isProcessing: false, suggestions: [], editSuggestions: []
                }));

                const aiLevel1Count = aiSections.filter(s => s.level === 1).length;
                const localLevel1Count = sections.filter(s => s.level === 1).length;
                if (aiSections.length <= 3 && sections.length > aiSections.length) {
                    const localTitles = sections.map(s => s.title.toLowerCase().substring(0, 25));
                    const merged = [...sections];
                    for (const aiSec of aiSections) {
                        const aiPrefix = aiSec.title.toLowerCase().substring(0, 25);
                        if (!localTitles.some(t => t.includes(aiPrefix) || aiPrefix.includes(t))) {
                            merged.push({ ...aiSec, id: `ai-${aiSec.id}` });
                        }
                    }
                    sections = merged;
                } else if (aiSections.length > sections.length) {
                    sections = aiSections;
                    // Merge missing local sections
                    if (aiLevel1Count < localLevel1Count) {
                        const existing = sections.map(s => s.title.toLowerCase().substring(0, 25));
                        for (const ls of data.sections) {
                            const p = ls.title.toLowerCase().substring(0, 25);
                            if (!existing.some(t => t.includes(p) || p.includes(t))) {
                                sections.push({ ...ls, id: `merged-${ls.id}` });
                            }
                        }
                    }
                }
            } catch {
                // Keep local sections
            }

            setData(prev => ({
                ...prev,
                currentTitle: result.currentTitle,
                analysis: result.analysis,
                sections: sections.length > 0 ? sections : prev.sections
            }));
            addToast('success', `Phân tích hoàn tất! Tìm thấy ${sections.length} mục.`);
        } catch {
            addToast('error', 'Lỗi phân tích. Vui lòng kiểm tra API Key.');
            setAnalysisTriggered(false); // allow retry
        } finally {
            setIsProcessing(false);
        }
    };

    const runTitleGeneration = async () => {
        setIsProcessing(true);
        try {
            const summary = data.originalText.substring(0, 3000);
            const suggestions = await geminiService.generateTitleSuggestions(data.currentTitle, summary);
            setData(prev => ({ ...prev, titleSuggestions: suggestions }));
        } catch {
            addToast('error', 'Lỗi tạo đề xuất tên đề tài.');
            setTitleGenTriggered(false); // allow retry
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Upload: parse sections locally, then go to Analysis tab ---
    const handleUpload = async (text: string, fileName: string) => {
        if (!geminiService.getApiKey()) {
            addToast('error', 'Vui lòng cài API Key trong phần Cài đặt trước!');
            return;
        }
        setIsProcessing(true);
        try {
            // Parse sections locally (fast, no API call)
            const sections = parseSectionsLocal(text);

            setData(prev => ({
                ...prev, fileName, originalText: text, sections
            }));
            setHasUploaded(true);
            setCurrentStep(AppStep.ANALYZING); // Go to analysis tab (will trigger lazy analysis)
            addToast('success', `Đã tải lên "${fileName}". Đang chuyển sang phân tích...`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAnalysisContinue = () => setCurrentStep(AppStep.DASHBOARD);

    const handleDashboardContinue = () => {
        setCurrentStep(AppStep.TITLE_SELECTION);
        // Title generation will be triggered lazily by useEffect
    };

    const handleTitleSelect = (title: TitleSuggestion) => {
        setData(prev => ({ ...prev, selectedNewTitle: title }));
        setCurrentStep(AppStep.CONTENT_REFINEMENT);
        addToast('info', `Đã chọn: "${title.title.substring(0, 50)}..."`);
    };

    const handleRefineSection = async (sectionId: string) => {
        const effectiveTitle = data.selectedNewTitle?.title || data.currentTitle;
        if (!effectiveTitle) return;
        setProcessingSectionId(sectionId);
        const section = data.sections.find(s => s.id === sectionId);
        if (section && section.originalContent) {
            try {
                const refined = await geminiService.refineSectionContent(
                    section.title, section.originalContent, effectiveTitle
                );
                setData(prev => ({
                    ...prev,
                    sections: prev.sections.map(s => s.id === sectionId ? { ...s, refinedContent: refined } : s)
                }));
                addToast('success', `Đã viết lại "${section.title}" thành công!`);
            } catch {
                addToast('error', `Lỗi viết lại phần "${section.title}".`);
            }
        }
        setProcessingSectionId(null);
    };

    const handleRefineSectionWithRefs = async (sectionId: string) => {
        const effectiveTitle = data.selectedNewTitle?.title || data.currentTitle;
        if (!effectiveTitle) return;
        setProcessingSectionId(sectionId);
        const section = data.sections.find(s => s.id === sectionId);
        if (section && section.originalContent) {
            try {
                const refined = await geminiService.refineSectionWithReferences(
                    section.title, section.originalContent, effectiveTitle, userRequirements
                );
                setData(prev => ({
                    ...prev,
                    sections: prev.sections.map(s => s.id === sectionId ? { ...s, refinedContent: refined } : s)
                }));
                addToast('success', `Đã viết lại "${section.title}" với tài liệu tham khảo!`);
            } catch {
                addToast('error', `Lỗi viết lại phần "${section.title}".`);
            }
        }
        setProcessingSectionId(null);
    };

    const handleUpdateSections = (newSections: SectionContent[]) => {
        setData(prev => ({ ...prev, sections: newSections }));
    };

    const handleFinish = async () => {
        try {
            const docChildren: (Paragraph | Table)[] = [];
            docChildren.push(new Paragraph({
                children: [new TextRun({
                    text: `TÊN ĐỀ TÀI: ${data.selectedNewTitle?.title || data.currentTitle}`,
                    bold: true, size: 28, font: 'Times New Roman'
                })],
                heading: HeadingLevel.TITLE,
                spacing: { after: 400 }
            }));

            data.sections.forEach(s => {
                const headingLevel = s.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_1;
                const indent = s.level === 2 ? 360 : 0;

                docChildren.push(new Paragraph({
                    children: [new TextRun({
                        text: s.title.toUpperCase(),
                        bold: true, size: s.level === 2 ? 24 : 26, font: 'Times New Roman'
                    })],
                    heading: headingLevel,
                    spacing: { before: s.level === 2 ? 200 : 400, after: 200 },
                    indent: { left: indent }
                }));

                const content = s.refinedContent || s.originalContent;
                const contentElements = parseContentToDocElements(content, indent);
                docChildren.push(...contentElements);
            });

            const doc = new Document({ sections: [{ children: docChildren }] });
            const blob = await Packer.toBlob(doc);
            const outName = `SKKN_Upgrade_${data.fileName?.replace(/\.[^.]+$/, '') || 'document'}.docx`;
            saveAs(blob, outName);
            addToast('success', `Đã tải xuống: ${outName}`);
        } catch {
            const fullContent = data.sections.map(s =>
                `${s.title.toUpperCase()}\n\n${s.refinedContent || s.originalContent}\n`
            ).join('\n-----------------------------------\n\n');
            const blob = new Blob([
                `TÊN ĐỀ TÀI MỚI: ${data.selectedNewTitle?.title}\n\n` + fullContent
            ], { type: 'text/plain;charset=utf-8' });
            const outName = `SKKN_Upgrade_${data.fileName?.replace(/\.[^.]+$/, '') || 'document'}.txt`;
            saveAs(blob, outName);
            addToast('info', `Đã tải dạng text: ${outName}`);
        }
    };

    // --- Tabs (excluding Upload) ---
    const TABS = STEP_LABELS.filter(s => s.step !== AppStep.UPLOAD);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 20px',
                background: 'white', borderBottom: '1px solid #e2e8f0',
                position: 'sticky', top: 0, zIndex: 10
            }}>
                <button
                    onClick={onClose}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                        borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc',
                        fontSize: 13, cursor: 'pointer', color: '#64748b', fontWeight: 500
                    }}
                >
                    <ArrowLeft size={16} /> Quay lại Chat
                </button>

                <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: 14,
                    boxShadow: '0 2px 0 #0f766e'
                }}>S</div>
                <span style={{
                    fontSize: 16, fontWeight: 800,
                    background: 'linear-gradient(135deg, #0d9488, #115e59)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    SKKN Editor Pro
                </span>

                {!hasApiKey && (
                    <span style={{
                        fontSize: 12, color: '#e11d48', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8
                    }}>
                        <AlertCircle size={14} /> Chưa có API key
                    </span>
                )}

                <div style={{ flex: 1 }} />

                {/* Navigation Tabs — free click after upload */}
                {hasUploaded && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {TABS.map(tab => {
                            const isActive = currentStep === tab.step;
                            const isLoading = isProcessing && currentStep === tab.step;
                            return (
                                <button
                                    key={tab.step}
                                    onClick={() => handleTabClick(tab.step as AppStep)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '6px 14px', borderRadius: 8,
                                        border: isActive ? '1.5px solid #14b8a6' : '1px solid transparent',
                                        background: isActive ? '#f0fdfa' : 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                    }}
                                >
                                    <span style={{ fontSize: 14 }}>
                                        {isLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : tab.icon}
                                    </span>
                                    <span style={{
                                        fontSize: 12, fontWeight: isActive ? 700 : 500,
                                        color: isActive ? '#0d9488' : '#64748b'
                                    }}>
                                        {tab.label}
                                    </span>
                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute', bottom: -1, left: '50%', transform: 'translateX(-50%)',
                                            width: 20, height: 3, borderRadius: 2,
                                            background: '#14b8a6'
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
                {currentStep === AppStep.UPLOAD && (
                    <SKKNStepUpload onUpload={handleUpload} isProcessing={isProcessing} />
                )}

                {currentStep === AppStep.ANALYZING && (
                    <>
                        {isProcessing && !data.analysis && (
                            <div style={{
                                minHeight: 400, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 16
                            }}>
                                <Loader2 size={40} style={{ color: '#14b8a6', animation: 'spin 1s linear infinite' }} />
                                <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>
                                    Đang phân tích SKKN bằng AI...
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: 13 }}>
                                    Quá trình này có thể mất 30-60 giây
                                </p>
                            </div>
                        )}
                        {data.analysis && (
                            <SKKNStepAnalysis metrics={data.analysis} onContinue={handleAnalysisContinue} />
                        )}
                        {!isProcessing && !data.analysis && (
                            <div style={{
                                minHeight: 300, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 12
                            }}>
                                <AlertCircle size={32} style={{ color: '#f59e0b' }} />
                                <p style={{ color: '#64748b', fontSize: 14 }}>Chưa thể phân tích. Vui lòng thử lại.</p>
                                <button
                                    onClick={() => { setAnalysisTriggered(false); }}
                                    style={{
                                        padding: '8px 20px', borderRadius: 8, border: 'none',
                                        background: '#14b8a6', color: 'white', fontWeight: 600,
                                        cursor: 'pointer', fontSize: 13
                                    }}
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}
                    </>
                )}

                {currentStep === AppStep.DASHBOARD && (
                    <>
                        {data.analysis ? (
                            <SKKNStepDashboard
                                sections={data.sections}
                                analysis={data.analysis}
                                currentTitle={data.currentTitle}
                                onContinue={handleDashboardContinue}
                            />
                        ) : (
                            <div style={{
                                minHeight: 300, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 12
                            }}>
                                <AlertCircle size={32} style={{ color: '#f59e0b' }} />
                                <p style={{ color: '#64748b', fontSize: 14 }}>
                                    Cần phân tích trước. Hãy chuyển sang tab <b>Phân tích</b> để bắt đầu.
                                </p>
                                <button
                                    onClick={() => setCurrentStep(AppStep.ANALYZING)}
                                    style={{
                                        padding: '8px 20px', borderRadius: 8, border: 'none',
                                        background: '#14b8a6', color: 'white', fontWeight: 600,
                                        cursor: 'pointer', fontSize: 13
                                    }}
                                >
                                    Đi đến Phân tích
                                </button>
                            </div>
                        )}
                    </>
                )}

                {currentStep === AppStep.TITLE_SELECTION && (
                    <>
                        {isProcessing && data.titleSuggestions.length === 0 && (
                            <div style={{
                                minHeight: 400, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 16
                            }}>
                                <Loader2 size={40} style={{ color: '#14b8a6', animation: 'spin 1s linear infinite' }} />
                                <p style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>
                                    Đang tạo đề xuất tên đề tài...
                                </p>
                            </div>
                        )}
                        {data.titleSuggestions.length > 0 && (
                            <SKKNStepTitle
                                currentTitle={data.currentTitle}
                                suggestions={data.titleSuggestions}
                                onSelectTitle={handleTitleSelect}
                                isGenerating={isProcessing}
                            />
                        )}
                        {!isProcessing && data.titleSuggestions.length === 0 && (
                            <div style={{
                                minHeight: 300, display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 12
                            }}>
                                <AlertCircle size={32} style={{ color: '#f59e0b' }} />
                                <p style={{ color: '#64748b', fontSize: 14 }}>Chưa tạo được đề xuất. Vui lòng thử lại.</p>
                                <button
                                    onClick={() => { setTitleGenTriggered(false); }}
                                    style={{
                                        padding: '8px 20px', borderRadius: 8, border: 'none',
                                        background: '#14b8a6', color: 'white', fontWeight: 600,
                                        cursor: 'pointer', fontSize: 13
                                    }}
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}
                    </>
                )}

                {currentStep === AppStep.CONTENT_REFINEMENT && (
                    <SKKNStepEditor
                        sections={data.sections}
                        onRefineSection={handleRefineSection}
                        onRefineSectionWithRefs={handleRefineSectionWithRefs}
                        isProcessing={processingSectionId}
                        onFinish={handleFinish}
                        selectedTitle={data.selectedNewTitle?.title || data.currentTitle}
                        currentTitle={data.currentTitle}
                        overallAnalysisSummary={
                            data.analysis
                                ? `Chất lượng: ${data.analysis.qualityScore}/100, Đạo văn: ${data.analysis.plagiarismScore}%, ` +
                                `Cấu trúc: ${data.analysis.structure.missing.length === 0 ? 'Đầy đủ' : 'Thiếu ' + data.analysis.structure.missing.join(', ')}`
                                : 'Chưa phân tích'
                        }
                        onUpdateSections={handleUpdateSections}
                        userRequirements={userRequirements}
                        onUpdateRequirements={setUserRequirements}
                    />
                )}
            </div>

            {/* Toasts */}
            {toasts.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: 20, right: 20, zIndex: 999,
                    display: 'flex', flexDirection: 'column', gap: 8
                }}>
                    {toasts.map(toast => (
                        <div key={toast.id} style={{
                            padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            background: toast.type === 'error' ? '#fef2f2' : toast.type === 'success' ? '#f0fdf4' : '#eff6ff',
                            color: toast.type === 'error' ? '#dc2626' : toast.type === 'success' ? '#16a34a' : '#2563eb',
                            border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`,
                            animation: 'fadeIn 0.3s ease'
                        }}>
                            {toast.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SKKNEditorApp;
