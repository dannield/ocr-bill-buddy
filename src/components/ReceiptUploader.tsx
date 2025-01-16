import { Button } from "@/components/ui/button";

interface ReceiptUploaderProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
}

export const ReceiptUploader = ({ onFileUpload, isProcessing }: ReceiptUploaderProps) => {
  return (
    <div className="flex justify-center">
      <Button asChild className="w-full max-w-xs" disabled={isProcessing}>
        <label>
          {isProcessing ? "מעבד..." : "העלה קבלה"}
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={onFileUpload}
            className="hidden"
            disabled={isProcessing}
          />
        </label>
      </Button>
    </div>
  );
};