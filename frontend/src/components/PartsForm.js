import { useEffect, useState } from 'react';

const initialForm = {
  partName: '',
  category: '',
  price: '',
  quantity: '',
  description: '',
  vendorId: '',
};

function PartsForm({ vendors, selectedPart, onCancelEdit, onCreate, onUpdate }) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(selectedPart);

  useEffect(() => {
    if (!selectedPart) {
      setForm(initialForm);
      setError('');
      return;
    }

    setForm({
      partName: selectedPart.partName || '',
      category: selectedPart.category || '',
      price: selectedPart.price?.toString() || '',
      quantity: selectedPart.quantity?.toString() || '',
      description: selectedPart.description || '',
      vendorId: selectedPart.vendorId?.toString() || '',
    });
    setError('');
  }, [selectedPart]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const payload = {
      ...form,
      price: Number(form.price),
      quantity: Number(form.quantity),
      vendorId: Number(form.vendorId),
    };

    try {
      if (isEditing) {
        await onUpdate(selectedPart.id, payload);
      } else {
        await onCreate(payload);
      }
      setForm(initialForm);
    } catch (requestError) {
      console.error('Part form submit failed:', requestError);
      setError(requestError.message || 'Part could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {error && <div className="form-error span-two">{error}</div>}
      <label className="field">
        <span>Part Name</span>
        <input
          name="partName"
          value={form.partName}
          onChange={handleChange}
          placeholder="Enter part name"
          required
        />
      </label>
      <label className="field">
        <span>Category</span>
        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Engine, tires, electrical"
          required
        />
      </label>
      <label className="field">
        <span>Price</span>
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={form.price}
          onChange={handleChange}
          placeholder="0.00"
          required
        />
      </label>
      <label className="field">
        <span>Quantity</span>
        <input
          name="quantity"
          type="number"
          min="0"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Available stock"
          required
        />
      </label>
      <label className="field span-two">
        <span>Vendor</span>
        <select name="vendorId" value={form.vendorId} onChange={handleChange} required>
          <option value="">Select vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.vendorName} - {vendor.companyName}
            </option>
          ))}
        </select>
      </label>
      <label className="field span-two">
        <span>Description</span>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Notes, fitment, or reorder details"
          rows="3"
        />
      </label>
      <div className="form-actions span-two">
        {isEditing && (
          <button className="secondary-button" type="button" onClick={onCancelEdit} disabled={isSubmitting}>
            Cancel
          </button>
        )}
        <button className="primary-button" type="submit" disabled={isSubmitting || vendors.length === 0}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Part' : 'Add Part'}
        </button>
      </div>
    </form>
  );
}

export default PartsForm;
