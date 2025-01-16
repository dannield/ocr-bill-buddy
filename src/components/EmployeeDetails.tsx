import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface EmployeeDetailsProps {
  onSubmit: (details: { name: string; id: string }) => void;
  initialData: { name: string; id: string };
}

export const EmployeeDetails = ({ onSubmit, initialData }: EmployeeDetailsProps) => {
  const [name, setName] = useState(initialData.name);
  const [id, setId] = useState(initialData.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && id) {
      onSubmit({ name, id });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <h2 className="text-2xl font-bold text-center">פרטי עובד</h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-right">
              שם העובד
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-right"
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="id" className="block text-right">
              מספר עובד
            </label>
            <Input
              id="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              className="text-right"
              dir="rtl"
            />
          </div>
          <Button type="submit" className="w-full">
            המשך
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};