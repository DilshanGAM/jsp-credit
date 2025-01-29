"use client";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import toast from "react-hot-toast";
import LoanType from "@/types/loan";
import { FileDown, Filter, Loader2 } from "lucide-react";
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function LoanReportPage() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [status, setStatus] = useState<string>("all");
  const [loans, setLoans] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const fetchLoans = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
  
    setLoading(true);
    try {
      console.log("Fetching with dates:", { startDate, endDate });
      
      const response = await axios.get("/api/loan/reporting", {
        params: {
          startDate: startDate,
          endDate: endDate,
          status: status
        }
      });
  
      if (response.data) {
        setLoans(response.data);
        console.log("Fetched loans:", response.data);
      }
    } catch (error: any) {
      console.error("Fetch error details:", error.response?.data);
      toast.error(error.response?.data?.error || "Failed to fetch loans");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!startDate || !endDate || loans.length === 0) {
      toast.error("No loans data available");
      return;
    }
  
    setDownloading(true);
    try {
      // Create PDF document
      const doc = new jsPDF();
  
      // Add title
      doc.setFontSize(16);
      doc.text('Loan Report', 14, 15);
  
      // Add date range
      doc.setFontSize(11);
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 25);
  
      // Create table data
      const tableData = loans.map(loan => [
        loan.customerId,
        `$${loan.amount.toFixed(2)}`,
        `${loan.interestRate}%`,
        `$${loan.totalAmount.toFixed(2)}`,
        loan.status,
        new Date(loan.issuedDate).toLocaleDateString()
      ]);
  
      // Add table
      (doc as any).autoTable({
        startY: 30,
        head: [['Customer ID', 'Amount', 'Interest', 'Total', 'Status', 'Issue Date']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 8 }
      });
  
      // Add summary
      const summary = calculateSummary();
      const summaryY = (doc as any).lastAutoTable.finalY + 10;
      
      doc.setFontSize(10);
      doc.text(`Total Loans: ${loans.length}`, 14, summaryY);
      doc.text(`Total Amount: $${summary.totalAmount.toFixed(2)}`, 14, summaryY + 5);
      doc.text(`Average Interest: ${summary.averageInterest.toFixed(2)}%`, 14, summaryY + 10);
  
      // Save PDF
      doc.save(`loan-report-${startDate}.pdf`);
      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to generate report");
    } finally {
      setDownloading(false);
    }
  };

  const calculateSummary = () => {
    const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
    const totalInterest = loans.reduce((sum, loan) => sum + loan.interestAmount, 0);
    const averageInterest = loans.reduce((sum, loan) => sum + loan.interestRate, 0) / loans.length || 0;

    return { totalAmount, totalInterest, averageInterest };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Loan Reports</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-md w-full md:w-40"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-md w-full md:w-40"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border rounded-md w-full md:w-40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <Button 
            onClick={fetchLoans}
            className="bg-primary hover:bg-primary/90"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Filter className="w-4 h-4 mr-2" />
            )}
            Filter
          </Button>
          <Button
            onClick={downloadReport}
            className="bg-green-600 hover:bg-green-700"
            disabled={downloading || loans.length === 0}
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Download Report
          </Button>
        </div>
      </div>

      {loans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loans.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${calculateSummary().totalAmount.toFixed(2)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Interest Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateSummary().averageInterest.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Interest Rate</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issue Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.map((loan) => (
              <TableRow key={loan.id}>
                <TableCell>{loan.customerId}</TableCell>
                <TableCell>${loan.amount.toFixed(2)}</TableCell>
                <TableCell>{loan.interestRate}%</TableCell>
                <TableCell>${loan.totalAmount.toFixed(2)}</TableCell>
                <TableCell>{loan.durationMonths} months</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium
                    ${loan.status === 'completed' ? 'bg-green-100 text-green-800' :
                    loan.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'}`}>
                    {loan.status}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(loan.issuedDate).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}