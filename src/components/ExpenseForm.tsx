import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createWorker } from "tesseract.js";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import NotoSansHebrewFont from "@/lib/NotoSansHebrew-Regular.ttf";
import emailjs from '@emailjs/browser';

interface ExpenseFormProps {
  employeeDetails: {
    name: string;
    id: string;
  };
}

interface ExpenseEntry {
  amount: string;
  date: string;
  description: string;
  imageUrl?: string;
}

export const ExpenseForm = ({ employeeDetails }: ExpenseFormProps) => {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    toast({
      title: "מעבד קבלה",
      description: "אנא המתן...",
    });

    try {
      const worker = await createWorker("heb");
      const imageUrl = URL.createObjectURL(file);
      const { data: { text } } = await worker.recognize(imageUrl);
      
      const totalPatterns = [
        /סה"כ\s*[₪]?\s*(\d+(\.\d{2})?)/,
        /סך הכל\s*[₪]?\s*(\d+(\.\d{2})?)/,
        /סכום לתשלום\s*[₪]?\s*(\d+(\.\d{2})?)/,
        /\d+(\.\d{2})?/
      ];
      
      let amount = "";
      for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
          amount = match[1] || match[0];
          break;
        }
      }
      
      const today = new Date().toISOString().split("T")[0];
      
      setExpenses([...expenses, {
        amount,
        date: today,
        description: "",
        imageUrl,
      }]);
      
      await worker.terminate();
      
      toast({
        title: "קבלה נוספה בהצלחה",
        description: "אנא השלם את הפרטים החסרים",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בעיבוד הקבלה",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const updateExpense = (index: number, field: keyof ExpenseEntry, value: string) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    setExpenses(newExpenses);
  };

  const generatePDF = () => {
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
      const imageWidth = (metrics.width + 20) * 0.264583; // Convert pixels to mm
      const imageHeight = (fontSize + 10) * 0.264583; // Convert pixels to mm
      
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

    addMainPage();

    expenses.forEach((expense, index) => {
      if (expense.imageUrl) {
        doc.addPage();
        
        const formattedDate = new Date(expense.date)
          .toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
        addHebrewText(`קבלה מספר ${index + 1} - ${formattedDate}`, 150, 20, 14);
        
        const img = new Image();
        img.src = expense.imageUrl;
        
        // Calculate dimensions to fit the page while maintaining aspect ratio
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Leave margins
        const maxWidth = pageWidth - 40; // 20mm margins on each side
        const maxHeight = pageHeight - 60; // 40mm top margin, 20mm bottom margin
        
        let imgWidth = img.width * 0.264583; // Convert px to mm
        let imgHeight = img.height * 0.264583;
        
        // Scale down if image is too large
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio, 1);
        
        imgWidth *= scale;
        imgHeight *= scale;
        
        // Center the image on the page
        const x = (pageWidth - imgWidth) / 2;
        const y = 40; // Fixed top margin
        
        try {
          doc.addImage(expense.imageUrl, "JPEG", x, y, imgWidth, imgHeight);
        } catch (error) {
          console.error("Error adding image to PDF:", error);
        }
      }
    });

    return doc;
  };

  const handleEmailPDF = async () => {
    const doc = generatePDF();
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Create mailto link
    const subject = encodeURIComponent(`דוח הוצאות - ${employeeDetails.name}`);
    const body = encodeURIComponent(`מצורף דוח הוצאות מאת ${employeeDetails.name} (${employeeDetails.id})`);
    const mailtoLink = `mailto:finance@final.co.il?subject=${subject}&body=${body}`;
    
    // Open default mail client
    window.open(mailtoLink);
    
    // Download PDF
    doc.save("expenses.pdf");
    
    toast({
      title: "הקובץ הורד בהצלחה",
      description: "נפתח חלון מייל חדש לשליחת הדוח",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">טופס החזר הוצאות</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-right space-y-2">
          <p>שם: {employeeDetails.name}</p>
          <p>מספר עובד: {employeeDetails.id}</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <Button asChild className="w-full max-w-xs" disabled={isProcessing}>
              <label>
                {isProcessing ? "מעבד..." : "העלה קבלה"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isProcessing}
                />
              </label>
            </Button>
          </div>

          {expenses.length > 0 && (
            <div className="space-y-4">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-right">סכום</th>
                    <th className="text-right">תאריך</th>
                    <th className="text-right">פירוט</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, index) => (
                    <tr key={index} className="border-t">
                      <td className="py-2">
                        <Input
                          value={expense.amount}
                          onChange={(e) => updateExpense(index, "amount", e.target.value)}
                          className="text-right"
                          dir="rtl"
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          type="date"
                          value={expense.date}
                          onChange={(e) => updateExpense(index, "date", e.target.value)}
                          className="text-right"
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          value={expense.description}
                          onChange={(e) => updateExpense(index, "description", e.target.value)}
                          className="text-right"
                          dir="rtl"
                          maxLength={30}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-4">
                <Button onClick={handleEmailPDF} className="w-full">
                  שלח PDF במייל
                </Button>
                <Button onClick={() => generatePDF().save("expenses.pdf")} className="w-full">
                  הורד PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
