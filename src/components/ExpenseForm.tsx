import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createWorker } from "tesseract.js";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import NotoSansHebrewFont from "@/lib/NotoSansHebrew-Regular.ttf";

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
      
      // Set font and measure text
      ctx.font = `${fontSize}px NotoSansHebrew`;
      const metrics = ctx.measureText(text);
      
      // Set canvas dimensions based on text metrics
      const textWidth = metrics.width;
      const textHeight = fontSize;
      
      // Add some padding
      canvas.width = textWidth + 10;
      canvas.height = textHeight + 10;
      
      // Clear canvas
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
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
      const imageWidth = (metrics.width + 10) * 0.264583; // Convert pixels to mm
      const imageHeight = (fontSize + 10) * 0.264583; // Convert pixels to mm
      
      const image = createHebrewTextImage(text, fontSize);
      doc.addImage(image, 'PNG', x, y, imageWidth, imageHeight);
      return { width: imageWidth, height: imageHeight };
    };

    // First page - Main form
    const addMainPage = () => {
      // Title
      addHebrewText("טופס החזר הוצאות", 100, 20, 16);
      
      // Employee details
      addHebrewText(`שם: ${employeeDetails.name}`, 120, 30, 12);
      addHebrewText(`מספר עובד: ${employeeDetails.id}`, 120, 40, 12);

      // Table headers
      const headers = ["סכום", "תאריך", "פירוט"];
      let y = 60;
      
      doc.line(20, y - 5, 190, y - 5);
      headers.forEach((header, i) => {
        const x = i === 0 ? 170 : i === 1 ? 110 : 50;
        addHebrewText(header, x, y - 3, 12);
      });
      doc.line(20, y + 2, 190, y + 2);

      // Expense entries
      y += 10;
      let total = 0;
      expenses.forEach((expense) => {
        doc.line(20, y - 5, 190, y - 5);
        
        // Format date to dd/mm/yyyy
        const formattedDate = new Date(expense.date).toLocaleDateString('he-IL');
        
        doc.text(expense.amount, 190, y, { align: "right" });
        doc.text(formattedDate, 130, y, { align: "right" });
        addHebrewText(expense.description, 20, y - 3, 12);
        
        total += parseFloat(expense.amount) || 0;
        y += 10;
      });

      // Total and signatures
      doc.line(20, y - 5, 190, y - 5);
      addHebrewText(`סה"כ: ${total.toFixed(2)} ₪`, 120, y + 7, 12);

      // Draw table borders
      doc.line(20, 55, 20, y - 5);
      doc.line(190, 55, 190, y - 5);
      doc.line(110, 55, 110, y - 5);
      doc.line(50, 55, 50, y - 5);

      // Add signature lines
      y += 30;
      addHebrewText("חתימת העובד: _________________", 70, y, 12);
      y += 10;
      addHebrewText("חתימת מנהל: _________________", 70, y, 12);
    };

    // Add main form page
    addMainPage();

    // Add receipts - one per page
    expenses.forEach((expense, index) => {
      if (expense.imageUrl) {
        doc.addPage();
        
        // Add receipt number and date at the top
        const formattedDate = new Date(expense.date).toLocaleDateString('he-IL');
        addHebrewText(`קבלה מספר ${index + 1} - ${formattedDate}`, 100, 20, 14);
        
        // Calculate image dimensions to fit the page while maintaining aspect ratio
        const img = new Image();
        img.src = expense.imageUrl;
        
        const maxWidth = 170; // Max width in mm
        const maxHeight = 240; // Max height in mm
        
        let imgWidth = img.width * 0.264583; // Convert px to mm
        let imgHeight = img.height * 0.264583;
        
        // Scale image to fit page
        if (imgWidth > maxWidth) {
          const ratio = maxWidth / imgWidth;
          imgWidth = maxWidth;
          imgHeight = imgHeight * ratio;
        }
        
        if (imgHeight > maxHeight) {
          const ratio = maxHeight / imgHeight;
          imgHeight = maxHeight;
          imgWidth = imgWidth * ratio;
        }
        
        // Center the image on the page
        const x = (210 - imgWidth) / 2; // 210 is A4 width
        const y = (297 - imgHeight) / 2; // 297 is A4 height
        
        try {
          doc.addImage(expense.imageUrl, "JPEG", x, y, imgWidth, imgHeight);
        } catch (error) {
          console.error("Error adding image to PDF:", error);
        }
      }
    });

    doc.save("expenses.pdf");
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

              <Button onClick={generatePDF} className="w-full">
                צור PDF
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
