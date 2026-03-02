import PDFDocument from "pdfkit";

export interface DownDayFormData {
  customerName: string;
  equipmentNumbers: string;
  dates: string[];
  reason: string;
}

export async function generateDownDayPdf(data: DownDayFormData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "letter" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const lineHeight = 24;
    const labelWidth = 140;
    let y = 50;

    // Title
    doc.fontSize(18).font("Helvetica-Bold").text("Down Day Form", 50, y);
    y += lineHeight + 10;

    // Customer Name
    doc.fontSize(11).font("Helvetica").text("Customer Name:", 50, y);
    doc.text(data.customerName || "—", 50 + labelWidth, y);
    y += lineHeight;

    // Down Date/s
    const datesStr = data.dates.length > 0 ? data.dates.join(", ") : "—";
    doc.text("Down Date/s:", 50, y);
    doc.text(datesStr, 50 + labelWidth, y);
    y += lineHeight;

    // Equipment #/s
    doc.text("Equipment #/s:", 50, y);
    doc.text(data.equipmentNumbers || "—", 50 + labelWidth, y);
    y += lineHeight;

    // Reason For Down Day
    doc.text("Reason For Down Day:", 50, y);
    y += lineHeight;

    // Reason text area with underscore lines (matching original form)
    const lineLength = 500;
    if (data.reason) {
      doc.fontSize(10).text(data.reason, 50, y, { width: lineLength });
      y += doc.heightOfString(data.reason, { width: lineLength }) + 8;
    }
    for (let i = 0; i < 4; i++) {
      doc.moveTo(50, y + 4).lineTo(50 + lineLength, y + 4).stroke();
      y += lineHeight;
    }

    y += 20;

    // Footer
    doc.fontSize(10).text("Submit form to DownDays@jscole.com", 50, y);

    doc.end();
  });
}
