function PartsList({ parts, onEdit, onDelete }) {
  if (parts.length === 0) {
    return <p className="empty-state">No parts found. Add inventory parts to track stock.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Part</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part) => (
            <tr key={part.id}>
              <td>
                <strong>{part.partName}</strong>
              </td>
              <td>{part.category}</td>
              <td>{part.vendor?.vendorName || 'Unknown'}</td>
              <td>${Number(part.price).toFixed(2)}</td>
              <td>
                <span className={Number(part.quantity) <= 5 ? 'stock-badge low' : 'stock-badge'}>
                  {part.quantity}
                </span>
              </td>
              <td>{part.description || 'No notes'}</td>
              <td>
                <div className="table-actions">
                  <button className="small-button" type="button" onClick={() => onEdit(part)}>
                    Edit
                  </button>
                  <button className="small-button danger" type="button" onClick={() => onDelete(part)}>
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

export default PartsList;
