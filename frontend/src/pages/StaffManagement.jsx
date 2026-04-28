import React, { useEffect, useMemo, useState } from 'react';
import {
  addStaff,
  deleteStaff,
  extractApiErrorMessage,
  getStaff,
  updateStaff,
} from '../services/staffService';

const initialFormState = {
  name: '',
  email: '',
  password: '',
  role: 'Staff',
};

const STAFF_ROLES = ['Admin', 'Staff'];

function resolveStaffId(staffMember) {
  return staffMember.id ?? staffMember.staffId ?? staffMember.userId;
}

function normalizeStaffResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function StaffForm({
  formData,
  fieldErrors,
  isEditing,
  isSubmitting,
  isDeleting,
  onFieldChange,
  onSubmit,
  onCancelEdit,
}) {
  return (
    <form className="staff-form card" onSubmit={onSubmit}>
      <h3 className="staff-card-title card-title">
        {isEditing ? 'Edit Staff' : 'Add Staff'}
      </h3>

      <div className="form-group">
        <label className="form-label" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          className="input-field"
          type="text"
          value={formData.name}
          onChange={onFieldChange}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          required
        />
        {fieldErrors.name ? (
          <p className="field-error" id="name-error">
            {fieldErrors.name}
          </p>
        ) : null}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          className="input-field"
          type="email"
          value={formData.email}
          onChange={onFieldChange}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          required
        />
        {fieldErrors.email ? (
          <p className="field-error" id="email-error">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          className="input-field"
          type="password"
          value={formData.password}
          onChange={onFieldChange}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          required={!isEditing}
          placeholder={isEditing ? 'Leave blank to keep current password' : ''}
        />
        {fieldErrors.password ? (
          <p className="field-error" id="password-error">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="role">
          Role
        </label>
        <select
          id="role"
          name="role"
          className="input-field"
          value={formData.role}
          onChange={onFieldChange}
          aria-invalid={Boolean(fieldErrors.role)}
          aria-describedby={fieldErrors.role ? 'role-error' : undefined}
          required
        >
          {STAFF_ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        {fieldErrors.role ? (
          <p className="field-error" id="role-error">
            {fieldErrors.role}
          </p>
        ) : null}
      </div>

      <div className="form-actions">
        <button
          className="button button-primary"
          type="submit"
          disabled={isSubmitting || isDeleting}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Staff'}
        </button>

        {isEditing && (
          <button
            className="button button-secondary"
            type="button"
            onClick={onCancelEdit}
            disabled={isSubmitting || isDeleting}
          >
            Cancel Edit
          </button>
        )}
      </div>
    </form>
  );
}

function StatusMessage({ message, type }) {
  if (!message) {
    return null;
  }

  return (
    <div className={type === 'error' ? 'message-banner error' : 'message-banner'}>
      {message}
    </div>
  );
}

function StaffTable({
  staffList,
  isLoading,
  isSubmitting,
  isDeleting,
  onEdit,
  onDelete,
}) {
  if (isLoading) {
    return <p className="status-text">Loading...</p>;
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffList.length === 0 ? (
            <tr>
              <td colSpan="4" className="empty-state">
                No staff found.
              </td>
            </tr>
          ) : (
            staffList.map((staffMember) => {
              const staffId = resolveStaffId(staffMember);

              return (
                <tr key={staffId ?? `${staffMember.email}-${staffMember.name}`}>
                  <td>{staffMember.name}</td>
                  <td>{staffMember.email}</td>
                  <td>{staffMember.role}</td>
                  <td>
                    <div className="button-group">
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={() => onEdit(staffMember)}
                        disabled={isSubmitting || isDeleting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button-danger"
                        onClick={() => onDelete(staffMember)}
                        disabled={isSubmitting || isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function StaffManagement() {
  // --- state: data & UI flags ---
  const [staffList, setStaffList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // --- state: form ---
  const [formData, setFormData] = useState(initialFormState);
  const [fieldErrors, setFieldErrors] = useState({});

  // --- state: activity flags ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- misc ---
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const filteredStaffList = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return staffList;
    }

    return staffList.filter((staffMember) => {
      const name = staffMember.name ?? '';
      const email = staffMember.email ?? '';

      return [name, email].some((field) =>
        field.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [searchQuery, staffList]);

  const loadStaffList = async () => {
    // Fetch staff list from the API and update UI flags.
    setIsLoading(true);
    try {
      const staffResponse = await getStaff();
      setStaffList(normalizeStaffResponse(staffResponse));
    } catch (error) {
      setMessage(
        extractApiErrorMessage(error, 'Failed to load staff. Please try again.')
      );
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, []);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setFieldErrors({});
  };

  // Validate the form; set `fieldErrors` for any issues and return boolean.
  const validateForm = () => {
    const nextFieldErrors = {};

    if (!formData.name.trim()) nextFieldErrors.name = 'Name is required.';
    if (!formData.email.trim()) nextFieldErrors.email = 'Email is required.';
    if (!isEditing && !formData.password.trim())
      nextFieldErrors.password = 'Password is required.';
    if (!formData.role.trim()) nextFieldErrors.role = 'Role is required.';

    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate inputs before calling API.
    if (!validateForm()) return;

    setIsSubmitting(true);
    setMessage('');
    setMessageType('');

    const staffPayload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      role: formData.role,
    };

    // Only send password during create or when it is explicitly changed during edit.
    if (!isEditing || formData.password.trim()) {
      staffPayload.password = formData.password;
    }

    try {
      if (isEditing) {
        await updateStaff(editingId, staffPayload);
        setMessage('Staff member updated successfully.');
      } else {
        await addStaff(staffPayload);
        setMessage('Staff member added successfully.');
      }

      setMessageType('success');
      resetForm();
      await loadStaffList();
    } catch (error) {
      setMessage(
        extractApiErrorMessage(error, 'Unable to save staff member right now.')
      );
      setMessageType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (staffMember) => {
    const staffId = resolveStaffId(staffMember);

    if (staffId === undefined || staffId === null) {
      setMessage('Unable to edit this record because the staff id is missing.');
      setMessageType('error');
      return;
    }

    setEditingId(staffId);
    setFormData({
      name: staffMember.name ?? '',
      email: staffMember.email ?? '',
      password: '',
      role: staffMember.role ?? 'Staff',
    });
    setMessage('Editing mode enabled. Update details and click Save Changes.');
    setMessageType('success');
  };

  const handleDelete = async (staffMember) => {
    const staffId = resolveStaffId(staffMember);

    if (staffId === undefined || staffId === null) {
      setMessage('Unable to delete this record because the staff id is missing.');
      setMessageType('error');
      return;
    }

    const confirmed = window.confirm(
      `Delete ${staffMember.name ?? 'this staff member'}?`
    );

    if (!confirmed) {
      return;
    }

    setMessage('');
    setMessageType('');
    setIsDeleting(true);

    try {
      await deleteStaff(staffId);
      setMessage('Staff member deleted successfully.');
      setMessageType('success');

      if (editingId === staffId) {
        resetForm();
      }

      await loadStaffList();
    } catch (error) {
      setMessage(
        extractApiErrorMessage(error, 'Unable to delete staff member right now.')
      );
      setMessageType('error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="container">
      <div className="page-header-card card">
        <h2 className="section-title card-title">Staff Management</h2>
        <p className="section-copy">
          Create and manage staff records for GarageGo administrators and team
          members.
        </p>
      </div>

      <div className="staff-layout">
        <StaffForm
          formData={formData}
          fieldErrors={fieldErrors}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          isDeleting={isDeleting}
          onFieldChange={handleFieldChange}
          onSubmit={handleSubmit}
          onCancelEdit={resetForm}
        />

        <div className="table-card card">
          <div className="table-card-header">
            <div>
              <h3 className="staff-card-title card-title">Staff Directory</h3>
              <p className="section-copy staff-directory-copy">
                Search staff by name or email.
              </p>
            </div>
            <div className="staff-search-wrap">
              <label className="form-label" htmlFor="staff-search">
                Search Staff
              </label>
              <input
                id="staff-search"
                className="input-field"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or email"
              />
            </div>
          </div>

          <StatusMessage message={message} type={messageType} />
          <StaffTable
            staffList={filteredStaffList}
            isLoading={isLoading}
            isSubmitting={isSubmitting}
            isDeleting={isDeleting}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </section>
  );
}

export default StaffManagement;
