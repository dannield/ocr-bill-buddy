import { useState } from "react";
import { ExpenseForm } from "@/components/ExpenseForm";
import { EmployeeDetails } from "@/components/EmployeeDetails";
import { useLocalStorage } from "@/hooks/use-local-storage";

const Index = () => {
  const [employeeDetails, setEmployeeDetails] = useLocalStorage("employeeDetails", {
    name: "",
    id: "",
  });
  const [showForm, setShowForm] = useState(false);

  const handleEmployeeSubmit = (details: { name: string; id: string }) => {
    setEmployeeDetails(details);
    setShowForm(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {!showForm ? (
          <EmployeeDetails onSubmit={handleEmployeeSubmit} initialData={employeeDetails} />
        ) : (
          <ExpenseForm employeeDetails={employeeDetails} />
        )}
      </div>
    </div>
  );
};

export default Index;