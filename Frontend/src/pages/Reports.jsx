import React, { useState, useEffect } from 'react';
import {
    BarChart3, FileText, DollarSign, Users, Building2, Calendar,
    AlertTriangle, Lock, ChevronDown, Loader, Download, Printer, FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { getTaxRecords, getProperties, getOwners } from '../services/api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const reportOptions = [
    { id: 'revenue', name: 'Revenue Reports', icon: DollarSign, description: 'How much revenue was collected.' },
    { id: 'collection', name: 'Tax Collection Reports', icon: FileText, description: 'Details of collected taxes.' },
    { id: 'property', name: 'Property Reports', icon: Building2, description: 'How many properties exist.' },
    { id: 'owner', name: 'Owner Reports', icon: Users, description: 'List of registered owners.' },
    { id: 'overdue', name: 'Overdue Tax Reports', icon: AlertTriangle, description: 'Which taxes are unpaid.' },
    { id: 'payment', name: 'Payment Reports', icon: FileSpreadsheet, description: 'Payments made between dates.' },
];

export default function Reports() {
    const { user } = useAuth();
    const [selectedReport, setSelectedReport] = useState(reportOptions[0].id);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    
    // Data states
    const [taxRecords, setTaxRecords] = useState([]);
    const [properties, setProperties] = useState([]);
    const [owners, setOwners] = useState([]);

    // Fetched data
    const [filteredData, setFilteredData] = useState([]);

    useEffect(() => {
        fetchReportData();
    }, []);

    useEffect(() => {
        generateReportData();
    }, [taxRecords, properties, owners, selectedReport, startDate, endDate]);

    const fetchReportData = async () => {
        try {
            setIsLoading(true);
            const [taxRes, propRes, ownerRes] = await Promise.all([
                getTaxRecords(),
                getProperties(),
                getOwners()
            ]);
            setTaxRecords(taxRes.data?.data || taxRes.data || []);
            setProperties(propRes.data || []);
            setOwners(ownerRes.data || []);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const isWithinDateRange = (dateString) => {
        if (!dateString) return true;
        const date = new Date(dateString);
        if (startDate && date < new Date(startDate)) return false;
        if (endDate && date > new Date(endDate)) return false;
        return true;
    };

    const generateReportData = () => {
        let data = [];
        switch (selectedReport) {
            case 'revenue':
            case 'collection':
                data = taxRecords.filter(r => r.status === 'Paid' && isWithinDateRange(r.paymentDate || r.updatedAt)).map(r => ({
                    'Record ID': r._id.substring(0, 8),
                    'Property': typeof r.propertyId === 'object' ? r.propertyId?.taxAccountNumber || '-' : r.propertyId,
                    'Amount': `$${r.amount}`,
                    'Paid': `$${r.paidAmount || 0}`,
                    'Date': new Date(r.paymentDate || r.updatedAt).toLocaleDateString()
                }));
                break;
            case 'property':
                data = properties.filter(p => isWithinDateRange(p.createdAt)).map(p => ({
                    'Account No.': p.taxAccountNumber,
                    'Address': p.address,
                    'District': p.district,
                    'Type': p.buildingType || p.propertyType,
                    'Registered': new Date(p.createdAt).toLocaleDateString()
                }));
                break;
            case 'owner':
                data = owners.filter(o => isWithinDateRange(o.createdAt)).map(o => ({
                    'Name': o.name,
                    'Phone': o.phone,
                    'Email': o.email,
                    'Role': o.role,
                    'Registered': new Date(o.createdAt).toLocaleDateString()
                }));
                break;
            case 'overdue':
                data = taxRecords.filter(r => (r.status === 'Pending' || r.status === 'Overdue') && isWithinDateRange(r.dueDate)).map(r => ({
                    'Record ID': r._id.substring(0, 8),
                    'Property': typeof r.propertyId === 'object' ? r.propertyId?.taxAccountNumber || '-' : r.propertyId,
                    'Amount Due': `$${r.amount - (r.paidAmount || 0)}`,
                    'Due Date': new Date(r.dueDate).toLocaleDateString(),
                    'Status': r.status
                }));
                break;
            case 'payment':
                data = taxRecords.filter(r => r.paymentDate && isWithinDateRange(r.paymentDate)).map(r => ({
                    'Record ID': r._id.substring(0, 8),
                    'Amount Paid': `$${r.paidAmount}`,
                    'Method': r.paymentMethod || 'Cash',
                    'Date': new Date(r.paymentDate).toLocaleDateString(),
                    'Reference': r.paymentReference || '-'
                }));
                break;
            default:
                data = [];
        }
        setFilteredData(data);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const title = reportOptions.find(r => r.id === selectedReport)?.name || 'Report';
        doc.text(`TaxAdmin - ${title}`, 14, 15);
        if (startDate || endDate) {
            doc.setFontSize(10);
            doc.text(`Period: ${startDate || 'Start'} to ${endDate || 'Today'}`, 14, 22);
        }
        
        if (filteredData.length > 0) {
            const head = [Object.keys(filteredData[0])];
            const body = filteredData.map(row => Object.values(row));
            
            doc.autoTable({
                startY: 28,
                head: head,
                body: body,
            });
        } else {
            doc.text('No data available for the selected criteria.', 14, 30);
        }
        
        doc.save(`${selectedReport}_report.pdf`);
    };

    const handleExportExcel = () => {
        if (filteredData.length === 0) return alert('No data to export');
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        XLSX.writeFile(workbook, `${selectedReport}_report.xlsx`);
    };

    // Only users with canViewReports permission can view this page (Super Admin only)
    if (!user.permissions?.canViewReports) {
        return (
            <div className="text-center bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md mt-10">
                <Lock className="w-8 h-8 mx-auto mb-3" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>This page is restricted. You must have the **canViewReports** privilege.</p>
            </div>
        );
    }

    return (
        <div className="print-area">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-3">
                <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                Official Reports
            </h1>

            {/* Filter Section (Hidden on Print) */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl p-6 mb-8 transition-colors no-print">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Report Type Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Report Type</label>
                        <div className="relative">
                            <select
                                value={selectedReport}
                                onChange={(e) => setSelectedReport(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white appearance-none"
                            >
                                {reportOptions.map(option => (
                                    <option key={option.id} value={option.id}>{option.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            />
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors">
                        <Printer size={18} /> Print Report
                    </button>
                    <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 font-medium rounded-lg transition-colors">
                        <Download size={18} /> Export PDF
                    </button>
                    <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 font-medium rounded-lg transition-colors">
                        <FileSpreadsheet size={18} /> Export Excel
                    </button>
                </div>
            </div>

            {/* Report Data Display */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm rounded-xl p-6 transition-colors min-h-[400px]">
                <div className="mb-4 hidden print:block">
                    <h2 className="text-2xl font-bold">{reportOptions.find(r => r.id === selectedReport)?.name}</h2>
                    <p className="text-sm text-gray-500">Period: {startDate || 'Beginning'} to {endDate || 'Present'}</p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                        <p className="text-gray-500">Loading data...</p>
                    </div>
                ) : filteredData.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-slate-800/50">
                                <tr>
                                    {Object.keys(filteredData[0]).map((key, index) => (
                                        <th key={index} className="px-4 py-3">{key}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        {Object.values(row).map((val, colIndex) => (
                                            <td key={colIndex} className="px-4 py-3 text-gray-800 dark:text-gray-200">{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <AlertTriangle className="w-12 h-12 mb-2 opacity-20" />
                        <p>No records found for the selected criteria.</p>
                    </div>
                )}
            </div>

            {/* Print Styles injected in component */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}