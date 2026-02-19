
const docx = require("docx");
const fs = require("fs");

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

const doc = new Document({
    sections: [{
        properties: {},
        children: [
            // TITLE
            new Paragraph({
                text: "BÁO CÁO ỨNG DỤNG TRỢ LÝ GIÁO VIÊN (AI CHATBOT)",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 300 },
            }),

            // PHẦN I
            new Paragraph({
                text: "PHẦN I. ĐẶT VẤN ĐỀ",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
                text: "1. Lý do chọn đề tài",
                heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
                text: "Trong thời đại chuyển đổi số 4.0, giáo viên đối mặt với áp lực lớn về khối lượng công việc: từ soạn giáo án, ra đề thi, đến chấm bài và quản lý hồ sơ. Các công cụ truyền thống (Word, Excel) chưa đủ thông minh để tự động hóa các tác vụ chuyên môn. Sự bùng nổ của AI (Trí tuệ nhân tạo) mở ra cơ hội lớn, nhưng các công cụ như ChatGPT hay Gemini bản phổ thông chưa được tối ưu hóa sâu cho ngữ cảnh giáo dục Việt Nam (soạn đề trắc nghiệm chuẩn, hiển thị công thức toán học, trích xuất tài liệu dài).",
            }),
            new Paragraph({
                text: "Do đó, việc xây dựng 'Trợ lý GV' – một chatbot AI chuyên biệt, tích hợp khả năng xử lý tài liệu và hiển thị toán học chuẩn mực – là giải pháp cấp thiết.",
                spacing: { before: 100 },
            }),

            new Paragraph({
                text: "2. Mục đích nghiên cứu",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200 },
            }),
            new Paragraph({
                text: "Xây dựng ứng dụng Chatbot AI hỗ trợ giáo viên:",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "Tự động hóa soạn thảo: Giáo án, đề thi, phiếu học tập.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "Nghiên cứu tài liệu: Tóm tắt, trích xuất thông tin từ file giáo trình (PDF, Word) dài.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "Hiển thị chuẩn xác: Hỗ trợ công thức Toán/Lý/Hóa (LaTeX) và xuất bản định dạng Word (.docx) chuyên nghiệp.",
                bullet: { level: 0 }
            }),

            new Paragraph({
                text: "3. Đối tượng và phạm vi nghiên cứu",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200 },
            }),
            new Paragraph({
                text: "- Đối tượng: Công nghệ AI (Gemini API), kỹ thuật RAG (Retrieval Augmented Generation), hiển thị MathJax/KaTeX.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Phạm vi: Ứng dụng web hoạt động đa nền tảng (PC, Mobile), tập trung vào các môn Toán, Khoa học tự nhiên và công việc hành chính của GV.",
                bullet: { level: 0 }
            }),

            // PHẦN II
            new Paragraph({
                text: "PHẦN II. NỘI DUNG",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 100 },
            }),

            new Paragraph({
                text: "1. Cơ sở lý luận",
                heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
                text: "Ứng dụng mô hình ngôn ngữ lớn (LLM) kết hợp với RAG giúp AI không chỉ 'sáng tạo' mà còn 'trung thực' với tài liệu được cung cấp. Việc tích hợp các thư viện hiển thị chuyên biệt (Rehype-Katex) giải quyết bài toán hiển thị công thức toán học trên web mà các chatbot thông thường hay gặp lỗi.",
            }),

            new Paragraph({
                text: "2. Giải pháp thực hiện (Các tính năng ưu việt)",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200 },
            }),
            new Paragraph({
                text: "Hệ thống được xây dựng trên nền tảng công nghệ hiện đại:",
                spacing: { after: 100 },
            }),
            new Paragraph({
                text: "- Tối ưu hóa cho Giáo dục: Prompt engineering chuyên biệt xưng hô 'Thầy/Cô', trả lời đúng chuẩn sư phạm.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Hiển thị Toán học xuất sắc: Tích hợp MathJax/KaTeX render công thức đẹp, chuẩn LaTeX (Inline & Block math). Khắc phục hoàn toàn lỗi hiển thị căn thức, phân số phức tạp.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Quản lý tài liệu & RAG: Cho phép tải lên và 'chat' với file PDF/Word dài hàng trăm trang. AI trích xuất nội dung chính xác từ tài liệu để soạn đề thi.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Đa mô hình AI: Tích hợp Gemini 2.5 Flash (tốc độ), Gemini 3 Flash (cân bằng) và Gemini 3 Pro (thông minh nhất) với cơ chế tự động chuyển đổi (fallback) khi quá tải.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Lưu trữ & Xuất bản: Tự động lưu lịch sử chat (LocalStorage), ghim tin nhắn quan trọng. Tính năng xuất file Word (.docx) và Markdown (.md) giúp giáo viên in ấn ngay lập tức.",
                bullet: { level: 0 }
            }),

            // PHẦN III
            new Paragraph({
                text: "PHẦN III. KẾT QUẢ NGHIÊN CỨU",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 100 },
            }),
            new Paragraph({
                text: "1. Kết quả đạt được",
                heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
                text: "- Đã xây dựng hoàn thiện ứng dụng web (React/Vite) chạy ổn định, giao diện hiện đại, thân thiện.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Giải quyết triệt để vấn đề hiển thị Toán học trên web.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Tính năng xuất Word giúp tiết kiệm 90% thời gian copy-paste và định dạng lại của giáo viên.",
                bullet: { level: 0 }
            }),

            new Paragraph({
                text: "2. Hướng phát triển",
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200 },
            }),
            new Paragraph({
                text: "- Phát triển phiên bản Mobile App native.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Tích hợp tương tác giọng nói (Voice-to-Text) để giáo viên ra lệnh bằng giọng nói.",
                bullet: { level: 0 }
            }),
            new Paragraph({
                text: "- Mở rộng kho thư viện đề thi và giáo án cộng đồng.",
                bullet: { level: 0 }
            }),
        ],
    }],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("C:/Users/admin/Downloads/CHATBOT GV/BAO CAO APP - Tro Ly GV.docx", buffer);
    console.log("Document created successfully");
});
