import { jsPDF } from "jspdf";
import NotoSansHebrewFont from "@/lib/NotoSansHebrew-Regular.ttf";

interface ExpenseEntry {
  amount: string;
  date: string;
  description: string;
  imageUrl?: string;
}

interface PDFGeneratorProps {
  expenses: ExpenseEntry[];
  employeeDetails: {
    name: string;
    id: string;
  };
}

export const generatePDF = async ({ expenses, employeeDetails }: PDFGeneratorProps) => {
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
  });

  doc.addFont(NotoSansHebrewFont, "NotoSansHebrew", "normal");
  doc.setFont("NotoSansHebrew");
  doc.setR2L(true);

  const createHebrewTextImage = (text: string, fontSize: number = 12) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontSize}px NotoSansHebrew`;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    canvas.width = textWidth + 20;
    canvas.height = textHeight + 10;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = `${fontSize}px NotoSansHebrew`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width - 5, canvas.height / 2);
    
    return canvas.toDataURL('image/png');
  };

  const addHebrewText = (text: string, x: number, y: number, fontSize: number = 12) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${fontSize}px NotoSansHebrew`;
    const metrics = ctx.measureText(text);
    const imageWidth = (metrics.width + 20) * 0.264583;
    const imageHeight = (fontSize + 10) * 0.264583;
    
    const image = createHebrewTextImage(text, fontSize);
    doc.addImage(image, 'PNG', x - imageWidth, y, imageWidth, imageHeight);
    return { width: imageWidth, height: imageHeight };
  };

  const addMainPage = () => {
    addHebrewText("טופס החזר הוצאות", 150, 20, 16);
    
    addHebrewText(`שם: ${employeeDetails.name}`, 170, 40, 12);
    addHebrewText(`מספר עובד: ${employeeDetails.id}`, 170, 50, 12);

    const headers = ["תאריך", "פירוט", "סכום"];
    let y = 70;
    
    doc.line(20, y - 5, 190, y - 5);
    headers.forEach((header, i) => {
      const x = i === 0 ? 170 : i === 1 ? 110 : 50;
      addHebrewText(header, x, y - 3, 12);
    });
    doc.line(20, y + 2, 190, y + 2);

    y += 10;
    let total = 0;
    expenses.forEach((expense) => {
      doc.line(20, y - 5, 190, y - 5);
      
      const formattedDate = new Date(expense.date)
        .toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      addHebrewText(expense.amount, 50, y - 3, 12);
      addHebrewText(expense.description, 110, y - 3, 12);
      addHebrewText(formattedDate, 170, y - 3, 12);
      
      total += parseFloat(expense.amount) || 0;
      y += 10;
    });

    doc.line(20, y - 5, 190, y - 5);
    addHebrewText(`סה"כ: ${total.toFixed(2)} ₪`, 170, y + 7, 12);

    doc.line(20, 65, 20, y - 5);
    doc.line(190, 65, 190, y - 5);
    doc.line(150, 65, 150, y - 5);
    doc.line(90, 65, 90, y - 5);

    y += 30;
    addHebrewText("חתימת העובד: _________________", 120, y, 12);
    y += 10;
    addHebrewText("חתימת מנהל: _________________", 120, y, 12);
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  addMainPage();

  // Handle attachments (images and PDFs)
  for (const [index, expense] of expenses.entries()) {
    if (expense.imageUrl) {
      doc.addPage();
      
      const formattedDate = new Date(expense.date)
        .toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      addHebrewText(`קבלה מספר ${index + 1} - ${formattedDate}`, 150, 20, 14);
      
      try {
        const img = await loadImage(expense.imageUrl);
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        const maxWidth = pageWidth - 40;
        const maxHeight = pageHeight - 60;
        
        let imgWidth = img.width * 0.264583;
        let imgHeight = img.height * 0.264583;
        
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio, 1);
        
        imgWidth *= scale;
        imgHeight *= scale;
        
        const x = (pageWidth - imgWidth) / 2;
        const y = 40;
        
        if (expense.imageUrl.toLowerCase().endsWith('.pdf')) {
          // For PDF files, embed them directly
          doc.addPage();
          const pdfData = await fetch(expense.imageUrl).then(res => res.arrayBuffer());
          doc.addPage();
          const pdfPages = await doc.getNumberOfPages();
          doc.setPage(pdfPages);
          doc.addFileToVFS('attachment.pdf', pdfData);
          doc.addAttachment('attachment.pdf', pdfData);
        } else {
          // For images, add them to the PDF
          doc.addImage(img, "JPEG", x, y, imgWidth, imgHeight);
        }
      } catch (error) {
        console.error("Error adding file to PDF:", error);
        addHebrewText("שגיאה בטעינת הקובץ", 150, 40, 12);
      }
    }
  }

  return doc;
};