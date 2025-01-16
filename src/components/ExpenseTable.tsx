import { Input } from "@/components/ui/input";

interface ExpenseEntry {
  amount: string;
  date: string;
  description: string;
  imageUrl?: string;
}

interface ExpenseTableProps {
  expenses: ExpenseEntry[];
  updateExpense: (index: number, field: keyof ExpenseEntry, value: string) => void;
}

export const ExpenseTable = ({ expenses, updateExpense }: ExpenseTableProps) => {
  return (
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
  );
};