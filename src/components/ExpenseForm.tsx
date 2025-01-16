import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { createWorker } from "tesseract.js";
import { useToast } from "@/components/ui/use-toast";
import { ExpenseTable } from "./ExpenseTable";
import { ReceiptUploader } from "./ReceiptUploader";
import { generatePDF } from "./PDFGenerator";

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
      const imageUrl = URL.createObjectURL(file);
      
      if (file.type === 'application/pdf') {
        // For PDF files, just store them without OCR
        setExpenses([...expenses, {
          amount: "",
          date: new Date().toISOString().split("T")[0],
          description: "",
          imageUrl,
        }]);
        
        toast({
          title: "קבלה נוספה בהצלחה",
          description: "אנא השלם את הפרטים החסרים",
        });
      } else {
        // For images, process with OCR
        const worker = await createWorker("heb");
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
        
        setExpenses([...expenses, {
          amount,
          date: new Date().toISOString().split("T")[0],
          description: "",
          imageUrl,
        }]);
        
        await worker.terminate();
        
        toast({
          title: "קבלה נוספה בהצלחה",
          description: "אנא השלם את הפרטים החסרים",
        });
      }
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

  const handleEmailPDF = () => {
    const doc = generatePDF({ expenses, employeeDetails });
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const subject = encodeURIComponent(`דוח הוצאות - ${employeeDetails.name}`);
    const body = encodeURIComponent(`מצורף דוח הוצאות מאת ${employeeDetails.name} (${employeeDetails.id})`);
    const mailtoLink = `mailto:finance@final.co.il?subject=${subject}&body=${body}`;
    
    window.open(mailtoLink);
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
          <ReceiptUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />

          {expenses.length > 0 && (
            <div className="space-y-4">
              <ExpenseTable expenses={expenses} updateExpense={updateExpense} />

              <div className="space-y-4">
                <Button onClick={handleEmailPDF} className="w-full">
                  שלח PDF במייל
                </Button>
                <Button 
                  onClick={() => generatePDF({ expenses, employeeDetails }).save("expenses.pdf")} 
                  className="w-full"
                >
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