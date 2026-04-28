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
    <form className="inventory-form-grid" onSubmit={handleSubmit}>
      {error && (
        <div className="message-banner error inventory-form-error inventory-span-two">
          {error}
        </div>
      )}

      <label className="inventory-field">
        <span>Vendor Name</span>
        <input
          className="input-field"
          name="vendorName"
          value={form.vendorName}
          onChange={handleChange}
          placeholder="Enter vendor name"
          required
        />
      </label>

      <label className="inventory-field">
        <span>Company Name</span>
        <input
          className="input-field"
          name="companyName"
          value={form.companyName}
          onChange={handleChange}
          placeholder="Enter company name"
          required
        />
      </label>

      <label className="inventory-field">
        <span>Phone</span>
        <input
          className="input-field"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          required
        />
      </label>

      <label className="inventory-field">
        <span>Email</span>
        <input
          className="input-field"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="Enter email address"
          required
        />
      </label>

      <label className="inventory-field inventory-span-two">
        <span>Address</span>
        <input
          className="input-field"
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Enter business address"
          required
        />
      </label>

      <div className="inventory-action-row inventory-span-two">
        {isEditing && (
          <button
            className="button button-secondary"
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}

        <button className="button button-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Vendor' : 'Add Vendor'}
        </button>
      </div>
    </form>
  );
}

export default VendorForm;
