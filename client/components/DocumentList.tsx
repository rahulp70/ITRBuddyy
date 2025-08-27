import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Image, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Calendar,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
  status: 'processing' | 'completed' | 'error';
  extractedData?: {
    income: number;
    deductions: number;
    taxableIncome: number;
  };
  error?: string;
  category?: 'form16' | 'investment' | 'medical' | 'other';
}

interface DocumentListProps {
  documents: Document[];
  onViewData: (document: Document) => void;
  onViewITRForm: (document: Document) => void;
  onDownload: (document: Document) => void;
  onDelete: (documentId: string) => void;
  onReprocess: (documentId: string) => void;
  className?: string;
}

const getStatusIcon = (status: Document['status']) => {
  switch (status) {
    case 'processing':
      return <Clock className="w-4 h-4 text-orange-500" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-success-600" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

const getStatusBadge = (status: Document['status']) => {
  switch (status) {
    case 'processing':
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Processing</Badge>;
    case 'completed':
      return <Badge variant="secondary" className="bg-success-100 text-success-800">Completed</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getFileIcon = (fileType: string) => {
  if (fileType === 'application/pdf') {
    return <FileText className="w-5 h-5 text-red-500" />;
  }
  if (fileType.startsWith('image/')) {
    return <Image className="w-5 h-5 text-blue-500" />;
  }
  return <FileText className="w-5 h-5 text-gray-500" />;
};

const getCategoryBadge = (category?: Document['category']) => {
  if (!category) return null;
  
  const categoryLabels = {
    form16: 'Form 16',
    investment: 'Investment',
    medical: 'Medical',
    other: 'Other'
  };

  const categoryColors = {
    form16: 'bg-blue-100 text-blue-800',
    investment: 'bg-green-100 text-green-800', 
    medical: 'bg-purple-100 text-purple-800',
    other: 'bg-gray-100 text-gray-800'
  };

  return (
    <Badge variant="secondary" className={categoryColors[category]}>
      {categoryLabels[category]}
    </Badge>
  );
};

export function DocumentList({
  documents,
  onViewData,
  onViewITRForm,
  onDownload,
  onDelete,
  onReprocess,
  className
}: DocumentListProps) {
  const [filterStatus, setFilterStatus] = useState<Document['status'] | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');

  const filteredDocuments = documents
    .filter(doc => filterStatus === 'all' || doc.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.uploadDate.getTime() - a.uploadDate.getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

  const getStatusSummary = () => {
    const total = documents.length;
    const completed = documents.filter(d => d.status === 'completed').length;
    const processing = documents.filter(d => d.status === 'processing').length;
    const error = documents.filter(d => d.status === 'error').length;

    return { total, completed, processing, error };
  };

  const statusSummary = getStatusSummary();

  if (documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Yet</h3>
            <p className="text-gray-600">
              Upload your tax documents to get started with automated processing.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{statusSummary.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-success-600">{statusSummary.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-success-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-orange-600">{statusSummary.processing}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">{statusSummary.error}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Manage and track your tax document processing status
              </CardDescription>
            </div>
            
            {/* Filters */}
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Status: {filterStatus === 'all' ? 'All' : filterStatus}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('completed')}>
                    Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('processing')}>
                    Processing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('error')}>
                    Error
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Sort: {sortBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('date')}>
                    Upload Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    File Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('status')}>
                    Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Extracted Data</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {getFileIcon(document.type)}
                      <div>
                        <p className="font-medium text-gray-900">{document.name}</p>
                        <p className="text-sm text-gray-500">
                          {(document.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {getCategoryBadge(document.category)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {document.uploadDate.toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(document.status)}
                      {getStatusBadge(document.status)}
                    </div>
                    {document.status === 'error' && document.error && (
                      <p className="text-xs text-red-600 mt-1">{document.error}</p>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {document.extractedData ? (
                      <div className="text-sm">
                        <p>Income: ₹{document.extractedData.income.toLocaleString()}</p>
                        <p className="text-gray-500">
                          Taxable: ₹{document.extractedData.taxableIncome.toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Not extracted</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Quick Actions */}
                      {document.status === 'completed' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewData(document)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Data
                          </Button>
                          
                          <Button
                            size="sm"
                            onClick={() => onViewITRForm(document)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            ITR Form
                          </Button>
                        </>
                      )}
                      
                      {document.status === 'error' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReprocess(document.id)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Retry
                        </Button>
                      )}

                      {/* More Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onDownload(document)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          
                          {document.status === 'completed' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onViewData(document)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Extracted Data
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onViewITRForm(document)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate ITR Form
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          {document.status === 'error' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => onReprocess(document.id)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reprocess Document
                              </DropdownMenuItem>
                            </>
                          )}
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(document.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default DocumentList;
