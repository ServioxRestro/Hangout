"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Upload, X, Loader } from "lucide-react";

interface ImageUploadProps {
  currentImage?: string | null;
  onImageChange: (imageUrl: string | null) => void;
  folder?: string;
  maxSizeInMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
}

export default function ImageUpload({
  currentImage,
  onImageChange,
  folder = "menu-items",
  maxSizeInMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return `Please select a valid image file (${acceptedTypes.join(", ")})`;
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `File size must be less than ${maxSizeInMB}MB`;
    }

    return null;
  };

  const uploadFile = async (file: File) => {
    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from(folder)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(folder)
        .getPublicUrl(filePath);

      const imageUrl = publicUrlData.publicUrl;
      setPreview(imageUrl);
      onImageChange(imageUrl);

    } catch (error: any) {
      console.error('Error uploading file:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });

      // Provide more specific error messages
      let errorMessage = 'Error uploading image. Please try again.';
      if (error?.message) {
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check if you have upload permissions.';
        } else if (error.message.includes('size')) {
          errorMessage = 'File too large. Please select an image under 5MB.';
        } else if (error.message.includes('format') || error.message.includes('type')) {
          errorMessage = 'Invalid file format. Please select a valid image file (JPG, PNG, WebP).';
        } else {
          errorMessage = `Upload failed: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    await uploadFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = async () => {
    if (preview && preview.includes(folder)) {
      try {
        // Extract file path from URL
        const urlParts = preview.split('/');
        const fileName = urlParts[urlParts.length - 1];

        // Delete from storage
        await supabase.storage
          .from(folder)
          .remove([fileName]);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    setPreview(null);
    onImageChange(null);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          ${dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploading ? 'pointer-events-none' : ''}
        `}
      >
        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">Uploading image...</p>
          </div>
        ) : preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-48 mx-auto rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              disabled={disabled}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="text-sm text-gray-600">
              <p><span className="font-medium text-blue-600">Click to upload</span> or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, WebP up to {maxSizeInMB}MB
              </p>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileInputChange}
          accept={acceptedTypes.join(',')}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Current Image Display */}
      {preview && (
        <div className="text-xs text-gray-500 text-center">
          Image ready for menu display
        </div>
      )}
    </div>
  );
}