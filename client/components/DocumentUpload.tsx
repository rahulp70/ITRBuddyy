import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Image, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

interface DocumentUploadProps {
  onFilesUploaded: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  className?: string;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

const MAX_FILE_SIZE = 10; // 10MB

export function DocumentUpload({ 
  onFilesUploaded, 
  maxFiles = 5, 
  maxFileSize = MAX_FILE_SIZE,
  className 
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    const fileType = file.type;
    const isValidType = Object.keys(ACCEPTED_FILE_TYPES).includes(fileType);
    
    if (!isValidType) {
      return 'Please upload only PDF, JPG, or PNG files.';
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxFileSize) {
      return `File size must be less than ${maxFileSize}MB.`;
    }

    // Check total files limit
    if (uploadedFiles.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed.`;
    }

    return null;
  };

  const simulateUpload = async (fileId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f)
          );
          resolve();
        } else {
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { ...f, progress } : f)
          );
        }
      }, 200);

      // Simulate occasional upload errors (for demo)
      setTimeout(() => {
        if (Math.random() < 0.1) { // 10% chance of error
          clearInterval(interval);
          setUploadedFiles(prev => 
            prev.map(f => f.id === fileId ? { 
              ...f, 
              status: 'error', 
              error: 'Upload failed. Please try again.'
            } : f)
          );
          reject(new Error('Upload failed'));
        }
      }, 1000);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError('');
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Add files to upload list
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading',
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start uploads
    for (const newFile of newFiles) {
      try {
        await simulateUpload(newFile.id);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    // Notify parent component
    onFilesUploaded(validFiles);
  }, [onFilesUploaded, maxFiles, maxFileSize, uploadedFiles.length]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryUpload = async (fileId: string) => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, status: 'uploading', progress: 0, error: undefined } : f)
    );
    
    try {
      await simulateUpload(fileId);
    } catch (error) {
      console.error('Retry upload failed:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (fileType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Upload Area */}
      <Card className="relative overflow-hidden">
        <CardContent className="p-0">
          <div
            className={cn(
              "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-all duration-200",
              "hover:border-brand-400 hover:bg-brand-50/50",
              isDragOver && "border-brand-500 bg-brand-50 scale-105",
              "cursor-pointer"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
                isDragOver ? "bg-brand-100" : "bg-gray-100"
              )}>
                <Upload className={cn(
                  "w-8 h-8 transition-colors",
                  isDragOver ? "text-brand-600" : "text-gray-500"
                )} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Tax Documents
                </h3>
                <p className="text-gray-600">
                  Drag and drop your files here, or click to browse
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, JPG, PNG files up to {maxFileSize}MB each
                </p>
              </div>

              <Button type="button" variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold mb-4">Upload Progress</h4>
            <div className="space-y-4">
              {uploadedFiles.map((uploadedFile) => (
                <div key={uploadedFile.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  {getFileIcon(uploadedFile.file.type)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                    
                    {uploadedFile.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        />
                      </div>
                    )}
                    
                    {uploadedFile.status === 'error' && uploadedFile.error && (
                      <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {uploadedFile.status === 'uploading' && (
                      <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                    )}
                    
                    {uploadedFile.status === 'completed' && (
                      <CheckCircle className="w-5 h-5 text-success-600" />
                    )}
                    
                    {uploadedFile.status === 'error' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryUpload(uploadedFile.id)}
                      >
                        Retry
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DocumentUpload;
