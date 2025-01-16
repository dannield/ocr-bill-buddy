import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createWorker } from "tesseract.js";
import { useToast } from "@/components/ui/use-toast";
import { jsPDF } from "jspdf";
import OpenSansFont from "@/lib/OpenSans-VariableFont_wdth,wght.ttf";

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
      
      // Look for total amount patterns in Hebrew receipts
      const totalPatterns = [
        /סה"כ\s*[₪]?\s*(\d+(\.\d{2})?)/,
        /סך הכל\s*[₪]?\s*(\d+(\.\d{2})?)/,
        /סכום לתשלום\s*[₪]?\s*(\d+(\.\d{2})?)/,
        /\d+(\.\d{2})?/  // Fallback to first number if no total found
      ];
      
      let amount = "";
      for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
          amount = match[1] || match[0];
          break;
        }
      }
      
      // Get current date as default
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

    // Add the OpenSans font
    doc.addFont(OpenSansFont, "OpenSans", "normal");
    doc.setFont("OpenSans");

    // Enable right-to-left text direction
    doc.setR2L(true);

    // Function to encode Hebrew text
    const encodeHebrew = (text: string) => text;  // No need for character mapping now

    // Add employee details
    doc.setFontSize(16);
    doc.text(encodeHebrew("טופס החזר הוצאות"), 190, 20, { align: "right" });
    doc.setFontSize(12);
    doc.text(encodeHebrew(`שם: ${employeeDetails.name}`), 190, 30, { align: "right" });
    doc.text(encodeHebrew(`מספר עובד: ${employeeDetails.id}`), 190, 40, { align: "right" });
    
    // Add table headers
    const headers = ["סכום", "תאריך", "פירוט"];
    let y = 60;
    
    // Draw table header
    doc.line(20, y - 5, 190, y - 5); // Top line
    headers.forEach((header, i) => {
      doc.text(encodeHebrew(header), 190 - (i * 60), y, { align: "right" });
    });
    doc.line(20, y + 2, 190, y + 2); // Bottom line of header
    
    // Add expenses with table lines
    y += 10;
    let total = 0;
    expenses.forEach((expense, index) => {
      // Draw horizontal lines
      doc.line(20, y - 5, 190, y - 5);
      
      // Add expense data
      doc.text(expense.amount, 190, y, { align: "right" });
      doc.text(expense.date, 130, y, { align: "right" });
      doc.text(encodeHebrew(expense.description), 70, y, { align: "right" });
      
      // Calculate total
      total += parseFloat(expense.amount) || 0;
      
      // Add receipt image if available
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
    
    // Draw final line and total
    doc.line(20, y - 5, 190, y - 5);
    doc.text(encodeHebrew(`סה"כ: ${total.toFixed(2)} ₪`), 190, y + 10, { align: "right" });
    
    // Draw vertical lines
    doc.line(20, 55, 20, y - 5); // Left border
    doc.line(190, 55, 190, y - 5); // Right border
    doc.line(110, 55, 110, y - 5); // First divider
    doc.line(50, 55, 50, y - 5); // Second divider
    
    // Add signature lines
    y += 30;
    doc.text(encodeHebrew("חתימת העובד: _________________"), 190, y, { align: "right" });
    y += 10;
    doc.text(encodeHebrew("חתימת מנהל: _________________"), 190, y, { align: "right" });
    
    // Save PDF
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
