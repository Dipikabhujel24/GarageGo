import React, { useState } from "react";
import { createSale, extractApiError } from "../services/api";
import "./SalesPage.css";

function SalesPage({ onInvoiceCreated }) {
  const [customerId, setCustomerId] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);
  const [cartItems, setCartItems] = useState([]);

  const formatCurrency = (value) => `Rs. ${Number(value).toFixed(2)}`;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const discount = subtotal > 5000 ? subtotal * 0.10 : 0;

  const total = subtotal - discount;
  const loyaltyPoints = Math.floor(total / 100);
  const [redeemPoints, setRedeemPoints] = useState(false);

  const loyaltyValue = loyaltyPoints; // 1 point = Rs.1
  const loyaltyDiscount = redeemPoints ? Math.min(loyaltyValue, Math.floor(total)) : 0;
  const finalAmount = total - loyaltyDiscount;

  // ✅ Add item manually
  const handleAddToCart = () => {
    const parsedPartId = Number(selectedPartId);
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);

    if (!parsedPartId || parsedPartId <= 0) {
      alert("Enter valid Part ID");
      return;
    }

    if (!parsedQuantity || parsedQuantity <= 0) {
      alert("Enter valid quantity");
      return;
    }

    if (!parsedPrice || parsedPrice <= 0) {
      alert("Enter valid price");
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.partId === parsedPartId
      );

      if (existing) {
        return prev.map((item) =>
          item.partId === parsedPartId
            ? {
                ...item,
                quantity: item.quantity + parsedQuantity
              }
            : item
        );
      }

      return [
        ...prev,
        {
          partId: parsedPartId,
          name: `Part ${parsedPartId}`,
          price: parsedPrice,
          quantity: parsedQuantity
        }
      ];
    });

    // reset inputs
    setSelectedPartId("");
    setQuantity(1);
    setPrice(0);
  };

  // ✅ Submit sale
  const handleSubmit = async () => {
    const parsedCustomerId = Number(customerId);

    if (!parsedCustomerId || parsedCustomerId <= 0) {
      alert("Enter valid Customer ID");
      return;
    }

    if (cartItems.length === 0) {
      alert("Cart is empty");
      return;
    }

    try {
      const salePayload = {
        customerId: parsedCustomerId,
        loyaltyPoints,
        redeemedPoints: redeemPoints ? loyaltyPoints : 0,
        loyaltyDiscount: loyaltyDiscount,
        items: cartItems.map((item) => ({
          partId: item.partId,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // Validate items have prices to avoid sending price=0 to backend
      const invalid = salePayload.items.find(
        (it) => typeof it.price !== 'number' || Number(it.price) <= 0
      );

      if (invalid) {
        alert('One or more cart items are missing a valid price. Please check the cart before submitting.');
        console.error('Invalid sale payload:', salePayload);
        return;
      }

      // Helpful debug log for developers
      console.debug('Submitting sale payload:', salePayload);

      const response = await createSale(salePayload);

      const invoiceSale = {
        customerId: parsedCustomerId,
        items: cartItems.map((item) => ({
          partId: item.partId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          lineTotal: item.quantity * item.price
        })),
        total: finalAmount,
        loyaltyPoints,
        redeemedPoints: redeemPoints ? loyaltyPoints : 0,
        loyaltyDiscount,
        date: new Date().toLocaleDateString(),
        saleId: response?.data?.saleId ?? response?.data?.id ?? null
      };

      if (onInvoiceCreated) {
        onInvoiceCreated(invoiceSale);
      }

      alert("Sale Created Successfully!");

      // reset
      setCartItems([]);
      setCustomerId("");

    } catch (err) {
      alert(`Submit failed: ${extractApiError(err)}`);
    }
  };

  const handleClearSale = () => {
    setCartItems([]);
    setSelectedPartId("");
    setQuantity(1);
    setPrice(0);
  };

  const handleRemoveItem = (partId) => {
    setCartItems((prev) => prev.filter((item) => item.partId !== partId));
  };

  return (
    <div className="sales-page-container">
      {/* Header */}
      <div className="sales-header">
        <div className="sales-header-content">
          <span className="sales-badge">SALES & INVOICING</span>
          <h1>Sales Checkout</h1>
          <p>Create sales invoices and process transactions quickly.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="sales-content">
        {/* Section 1: Select Customer */}
        <div className="sales-section">
          <h2>Section 1: Select Customer</h2>
          <div className="form-group">
            <label>Customer ID</label>
            <input
              type="number"
              placeholder="Enter Customer ID"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        {/* Section 2: Add Parts */}
        <div className="sales-section">
          <h2>Section 2: Add Parts</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Part ID</label>
              <input
                type="number"
                placeholder="Enter Part ID"
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Price</label>
              <input
                type="number"
                placeholder="Enter Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="form-input"
              />
            </div>
            <button onClick={handleAddToCart} className="btn-add-to-cart">
              Add to Cart
            </button>
          </div>
        </div>

        {/* Section 3: Shopping Cart */}
        <div className="sales-section">
          <h2>Section 3: Shopping Cart</h2>
          {cartItems.length === 0 ? (
            <p className="empty-cart">Cart is empty</p>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.partId} className="cart-item">
                    <div className="cart-item-details">
                      <span className="item-name">{item.name}</span>
                      <span className="item-qty">{item.quantity} × {formatCurrency(item.price)}</span>
                    </div>
                    <div className="cart-item-total">
                      {formatCurrency(item.quantity * item.price)}
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.partId)}
                      className="btn-remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Subtotal:</span>
                <span className="total-amount">{formatCurrency(subtotal)}</span>
              </div>
              {subtotal > 5000 && (
                <div className="discount-box">
                  <p>🎉 Loyalty Discount Applied!</p>
                  <p>Discount: {formatCurrency(discount)}</p>
                </div>
              )}
              <div className="cart-total">
                <span>Loyalty Points Earned:</span>
                <span className="total-amount">{loyaltyPoints}</span>
              </div>

              {loyaltyPoints > 0 && (
                <div className="loyalty-redeem" style={{padding: '8px 0'}}>
                  <label style={{cursor: 'pointer'}}>
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={() => setRedeemPoints(!redeemPoints)}
                      style={{marginRight: 8}}
                    />
                    Redeem points (-{formatCurrency(loyaltyDiscount)})
                  </label>
                </div>
              )}

              <div className="cart-total">
                <span>Final Amount:</span>
                <span className="total-amount">
                  {formatCurrency(finalAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Section 4: Submit Sale */}
        <div className="sales-section">
          <h2>Section 4: Submit Sale</h2>
          <p className="submit-prompt">Ready to complete this sale?</p>
          <div className="button-group">
            <button onClick={handleSubmit} className="btn-primary">
              Generate Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesPage;