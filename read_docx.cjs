
const mammoth = require("mammoth");
const fs = require("fs");

const filePath = "C:/Users/admin/Downloads/CHATBOT GV/TỔNG HỢP BỘ CÔNG CỤ AI.docx";

mammoth.convertToHtml({ path: filePath })
    .then(function (result) {
        const html = result.value; // The generated HTML
        const messages = result.messages; // Any messages, such as warnings during conversion
        console.log("--- HTML START ---");
        console.log(html);
        console.log("--- HTML END ---");
    })
    .catch(function (error) {
        console.error(error);
    });
