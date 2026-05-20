function PartsList({ parts, onEdit, onDelete }) {
  if (parts.length === 0) {
    return (
      <p className="inventory-empty-state">
        No parts found. Add inventory parts to track stock.
      </p>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Part</th>
            <th>Category</th>
            <th>Vendor</th>
            <th>Price (Rs)</th>
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
              <td>Rs{Number(part.price).toFixed(2)}</td>
              <td>
                <span
                  className={
                    Number(part.quantity) <= 5
                      ? 'inventory-stock-badge low'
                      : 'inventory-stock-badge'
                  }
                >
                  {part.quantity}
                </span>
              </td>
              <td>{part.description || 'No notes'}</td>
              <td>
                <div className="button-group">
                  <button
                    className="button button-primary inventory-action-button"
                    type="button"
                    onClick={() => onEdit(part)}
                  >
                    Edit
                  </button>
                  <button
                    className="button button-danger inventory-action-button"
                    type="button"
                    onClick={() => onDelete(part)}
                  >
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
