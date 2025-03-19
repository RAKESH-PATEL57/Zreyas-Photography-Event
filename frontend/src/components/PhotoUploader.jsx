import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const PhotoUploader = ({ participantUniqueString, onPhotoUploaded }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    processFile(selectedFile);
  };

  const processFile = (selectedFile) => {
    if (selectedFile) {
      // Check if file is an image
      if (!selectedFile.type.match('image.*')) {
        setError('Please select an image file (JPG, PNG, etc.)');
        return;
      }
      
      // Check file size - 5MB limit
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size should be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a photo to upload');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('participantUniqueString', participantUniqueString);
    
    try {
      const response = await axios.post(`${API_URL}api/photos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setSuccess('Photo uploaded successfully!');
        setFile(null);
        setPreview(null);
        
        // Notify parent component
        onPhotoUploaded(response.data.data);
        
        // Clear success after delay
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if we're leaving the dropzone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      // Reset the drag count
      e.dataTransfer.clearData();
    }
  };

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

export default PhotoUploader;