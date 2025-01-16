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
      
      ctx.font = `${fontSize}px NotoSansHebrew`;
      const metrics = ctx.measureText(text);
      canvas.width = metrics.width + 10;
      canvas.height = fontSize + 10;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px NotoSansHebrew`;
      ctx.fillStyle = 'black';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, canvas.width - 5, canvas.height / 2);
      
      return canvas.toDataURL('image/png');
    };

    const titleImage = createHebrewTextImage("טופס החזר הוצאות", 16);
    doc.addImage(titleImage, 'PNG', 100, 20, 90, 10);
    
    const nameImage = createHebrewTextImage(`שם: ${employeeDetails.name}`, 12);
    doc.addImage(nameImage, 'PNG', 120, 30, 70, 8);
    
    const idImage = createHebrewTextImage(`מספר עובד: ${employeeDetails.id}`, 12);
    doc.addImage(idImage, 'PNG', 120, 40, 70, 8);

    const headers = ["סכום", "תאריך", "פירוט"];
    let y = 60;
    
    doc.line(20, y - 5, 190, y - 5);
    headers.forEach((header, i) => {
      const headerImage = createHebrewTextImage(header);
      doc.addImage(headerImage, 'PNG', 190 - ((i + 1) * 60), y - 3, 30, 8);
    });
    doc.line(20, y + 2, 190, y + 2);

    y += 10;
    let total = 0;
    expenses.forEach((expense, index) => {
      doc.line(20, y - 5, 190, y - 5);
      
      doc.text(expense.amount, 190, y, { align: "right" });
      doc.text(expense.date, 130, y, { align: "right" });
      
      const descImage = createHebrewTextImage(expense.description);
      doc.addImage(descImage, 'PNG', 20, y - 3, 50, 8);
      
      total += parseFloat(expense.amount) || 0;
      
      if (expense.imageUrl) {
        try {
          const imgHeight = 40;
          y += 15;
          doc.addImage(expense.imageUrl, "JPEG", 20, y, 80, imgHeight);
          y += imgHeight + 10;
        } catch (error) {
          console.error("Error adding image to PDF:", error);
        }
      }
      
      y += 10;
    });

    doc.line(20, y - 5, 190, y - 5);
    const totalImage = createHebrewTextImage(`סה"כ: ${total.toFixed(2)} ₪`);
    doc.addImage(totalImage, 'PNG', 120, y + 7, 70, 8);

    doc.line(20, 55, 20, y - 5);
    doc.line(190, 55, 190, y - 5);
    doc.line(110, 55, 110, y - 5);
    doc.line(50, 55, 50, y - 5);

    y += 30;
    const signEmployeeImage = createHebrewTextImage("חתימת העובד: _________________");
    doc.addImage(signEmployeeImage, 'PNG', 70, y, 120, 8);
    y += 10;
    const signManagerImage = createHebrewTextImage("חתימת מנהל: _________________");
    doc.addImage(signManagerImage, 'PNG', 70, y, 120, 8);

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
