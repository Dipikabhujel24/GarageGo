function VendorList({ vendors, onEdit, onDelete }) {
  if (vendors.length === 0) {
    return <p className="empty-state">No vendors found. Add your first supplier to begin.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Company</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id}>
              <td>
                <strong>{vendor.vendorName}</strong>
              </td>
              <td>{vendor.companyName}</td>
              <td>{vendor.phone}</td>
              <td>{vendor.email}</td>
              <td>{vendor.address}</td>
              <td>
                <div className="table-actions">
                  <button className="small-button" type="button" onClick={() => onEdit(vendor)}>
                    Edit
                  </button>
                  <button className="small-button danger" type="button" onClick={() => onDelete(vendor)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VendorList;
