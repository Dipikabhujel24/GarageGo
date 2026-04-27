import { useEffect, useState } from 'react';

const initialForm = {
  vendorName: '',
  companyName: '',
  phone: '',
  email: '',
  address: '',
};

function VendorForm({ selectedVendor, onCancelEdit, onCreate, onUpdate }) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(selectedVendor);

  useEffect(() => {
    if (!selectedVendor) {
      setForm(initialForm);
      setError('');
      return;
    }

    setForm({
      vendorName: selectedVendor.vendorName || '',
      companyName: selectedVendor.companyName || '',
      phone: selectedVendor.phone || '',
      email: selectedVendor.email || '',
      address: selectedVendor.address || '',
    });
    setError('');
  }, [selectedVendor]);

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

    try {
      if (isEditing) {
        await onUpdate(selectedVendor.id, form);
      } else {
        await onCreate(form);
      }
      setForm(initialForm);
    } catch (requestError) {
      console.error('Vendor form submit failed:', requestError);
      setError(requestError.message || 'Vendor could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      {error && <div className="form-error span-two">{error}</div>}
      <label className="field">
        <span>Vendor Name</span>
        <input
          name="vendorName"
          value={form.vendorName}
          onChange={handleChange}
          placeholder="Enter vendor name"
          required
        />
      </label>
      <label className="field">
        <span>Company Name</span>
        <input
          name="companyName"
          value={form.companyName}
          onChange={handleChange}
          placeholder="Enter company name"
          required
        />
      </label>
      <label className="field">
        <span>Phone</span>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          required
        />
      </label>
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter email address"
          required
        />
      </label>
      <label className="field span-two">
        <span>Address</span>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Enter business address"
          required
        />
      </label>
      <div className="form-actions span-two">
        {isEditing && (
          <button className="secondary-button" type="button" onClick={onCancelEdit} disabled={isSubmitting}>
            Cancel
          </button>
        )}
        <button className="primary-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Vendor' : 'Add Vendor'}
        </button>
      </div>
    </form>
  );
}

export default VendorForm;
