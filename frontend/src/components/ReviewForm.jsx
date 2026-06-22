import { useState, useRef } from 'react';
import API from '../api/axios';
import StarRating from './StarRating';
import toast from 'react-hot-toast';
import { Pencil, FileEdit, X, Save, Star } from 'lucide-react';

import { resolveUploadUrl } from '../config';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5000';

/**
 * ReviewForm — handles both CREATE and EDIT modes.
 * Props:
 *   serviceId        — required
 *   bookingId        — optional (for create)
 *   existingReview   — pass existing review object to enable edit mode
 *   onReviewSubmitted — callback after success
 */
const ReviewForm = ({ serviceId, bookingId, existingReview, onReviewSubmitted }) => {
  const isEdit = !!existingReview;

  const [rating,       setRating]       = useState(existingReview?.rating || 0);
  const [comment,      setComment]      = useState(existingReview?.comment || '');
  const [files,        setFiles]        = useState([]);       // new files to upload
  const [previews,     setPreviews]     = useState([]);       // preview URLs for new files
  const [keptImages,   setKeptImages]   = useState(         // existing images to keep
    existingReview?.image_urls || []
  );
  const [loading,      setLoading]      = useState(false);
  const fileRef = useRef(null);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    const maxNew   = 4 - keptImages.length;
    if (selected.length > maxNew) {
      toast.error(`You can only add ${maxNew} more image(s) (max 4 total)`);
      return;
    }
    setFiles(selected);
    setPreviews(selected.map(f => URL.createObjectURL(f)));
  };

  const removeKept = (idx) => {
    setKeptImages(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNew = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Please select a rating');

    const formData = new FormData();
    formData.append('service_id', serviceId);
    if (bookingId) formData.append('booking_id', bookingId);
    formData.append('rating',  rating);
    formData.append('comment', comment);
    files.forEach(f => formData.append('images', f));

    if (isEdit) {
      formData.append('keep_images', JSON.stringify(keptImages));
    }

    setLoading(true);
    try {
      if (isEdit) {
        await API.put(`/reviews/${existingReview.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Review updated!');
      } else {
        await API.post('/reviews', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Review submitted! Thank you.');
      }
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const totalImages = keptImages.length + files.length;

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <h4 className="review-form-title" style={{display:'flex',alignItems:'center',gap:6}}>{isEdit ? <><Pencil size={15} strokeWidth={2}/> Edit Your Review</> : <><FileEdit size={15} strokeWidth={2}/> Write a Review</>}</h4>

      <div className="form-group">
        <label className="form-label">Your Rating</label>
        <StarRating rating={rating} onRate={setRating} size="lg" />
      </div>

      <div className="form-group">
        <label className="form-label">Comment (optional)</label>
        <textarea
          className="textarea"
          placeholder="Share your experience..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
        />
      </div>

      {/* Image section */}
      <div className="form-group">
        <label className="form-label">Photos (max 4)</label>

        <div className="review-img-grid">
          {/* Existing kept images */}
          {keptImages.map((url, i) => (
            <div key={`kept-${i}`} className="review-img-thumb">
              <img src={url.startsWith('/uploads') ? `${BASE_URL}${url}` : url} alt="" />
              <button type="button" className="img-remove" onClick={() => removeKept(i)}><X size={9} strokeWidth={3}/></button>
            </div>
          ))}
          {/* New previews */}
          {previews.map((url, i) => (
            <div key={`new-${i}`} className="review-img-thumb new">
              <img src={url} alt="" />
              <button type="button" className="img-remove" onClick={() => removeNew(i)}><X size={9} strokeWidth={3}/></button>
            </div>
          ))}
          {/* Add button */}
          {totalImages < 4 && (
            <button type="button" className="review-img-add" onClick={() => fileRef.current?.click()}>
              <span>+</span>
              <span style={{fontSize:'.7rem'}}>Add Photo</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef} type="file" multiple accept="image/*"
          style={{display:'none'}} onChange={handleFiles}
        />
        {totalImages > 0 && (
          <p style={{fontSize:'.75rem',color:'var(--text-muted)',marginTop:'4px'}}>
            {totalImages}/4 photo{totalImages > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? 'Submitting...' : isEdit
          ? <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}><Save size={15} strokeWidth={2}/>Save Changes</span>
          : <span style={{display:'flex',alignItems:'center',gap:6,justifyContent:'center'}}><Star size={15} strokeWidth={2}/>Submit Review</span>
        }
      </button>

      <style>{`
        .review-form { background:var(--bg-input); border:1px solid var(--border); border-radius:var(--radius-lg); padding:var(--space-6); display:flex; flex-direction:column; gap:var(--space-4); }
        .review-form-title { font-size:1.05rem; font-weight:700; }
        .review-img-grid { display:flex; flex-wrap:wrap; gap:var(--space-2); }
        .review-img-thumb { position:relative; width:72px; height:72px; border-radius:var(--radius-md); overflow:hidden; border:1px solid var(--border); }
        .review-img-thumb img { width:100%; height:100%; object-fit:cover; }
        .review-img-thumb.new { border-color:var(--primary); }
        .img-remove { position:absolute; top:2px; right:2px; background:rgba(0,0,0,.6); color:#fff; border:none; border-radius:50%; width:18px; height:18px; font-size:.7rem; cursor:pointer; display:flex; align-items:center; justify-content:center; }
        .review-img-add { width:72px; height:72px; border-radius:var(--radius-md); border:1px dashed var(--border); background:transparent; color:var(--text-muted); cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; font-size:1.2rem; gap:2px; transition:var(--transition); }
        .review-img-add:hover { border-color:var(--primary); color:var(--primary-light); }
      `}</style>
    </form>
  );
};

export default ReviewForm;
