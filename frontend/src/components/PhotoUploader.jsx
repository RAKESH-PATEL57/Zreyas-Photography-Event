import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Create a memoized, cancellable axios instance
const axiosInstance = axios.create();

const PhotoUploader = ({ participantUniqueString, onPhotoUploaded }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Memoized file processing function
  const processFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    
    // Check if file is an image
    if (!selectedFile.type.match('image.*')) {
      setError('Please select an image file (JPG, PNG, etc.)');
      return;
    }
    
    // Check file size - 10MB limit
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size should be less than 10MB');
      return;
    }
    
    setFile(selectedFile);
    setError('');
    
    // Create preview with optimized handling
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.onerror = () => setError('Failed to read file');
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  }, [processFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a photo to upload');
      return;
    }
    
    // Cancel any previous ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('participantUniqueString', participantUniqueString);
    
    try {
      // Apply client-side image optimization before upload
      const optimizedFile = await compressImage(file);
      formData.set('photo', optimizedFile);
      
      const response = await axiosInstance.post(
        `${API_URL}api/photos/upload`, 
        formData, 
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          signal: abortControllerRef.current.signal,
          onUploadProgress: (progressEvent) => {
            // Optional: Add progress tracking here
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );
      
      if (response.data.success) {
        setSuccess('Photo uploaded successfully!');
        setFile(null);
        setPreview(null);
        
        // Notify parent component
        onPhotoUploaded(response.data.data);
        
        // Clear success after delay
        const timer = setTimeout(() => setSuccess(''), 3000);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log('Request cancelled');
      } else {
        setError(err.response?.data?.message || 'Failed to upload photo');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Client-side image compression
  const compressImage = async (imageFile) => {
    // Skip compression for small files
    if (imageFile.size < 1024 * 1024) return imageFile;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if larger than 2000px
          if (width > 2000) {
            height = Math.round((height * 2000) / width);
            width = 2000;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to WebP with quality setting
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const file = new File([blob], imageFile.name, {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(file);
              } else {
                resolve(imageFile); // Fallback to original if compression fails
              }
            },
            'image/webp',
            0.8 // Quality setting (0.8 = 80%)
          );
        };
      };
    });
  };

  // Optimized drag and drop handlers with useCallback
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [processFile]);

  return (
    <div className="uploader-container">
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="uploader-form">
        <div 
          ref={dropZoneRef}
          className={`upload-preview ${isDragging ? 'drag-over' : ''}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="preview-image" />
          ) : (
            <div className="upload-placeholder">
              <span className="upload-icon">📷</span>
              <span>{isDragging ? 'Drop image here' : 'Drag & drop an image or click to browse'}</span>
            </div>
          )}
        </div>
        
        <div className="form-controls">
          <div className="form-group">
            <label className="file-input-label">
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="file-input"
                disabled={loading}
              />
              <span className="custom-file-button">
                <span className="button-icon">📁</span>
                <span>{file ? 'Change Photo' : 'Choose Photo'}</span>
              </span>
            </label>
          </div>
          
          <button 
            type="submit" 
            className="primary-button"
            disabled={loading || !file}
          >
            {loading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default React.memo(PhotoUploader);