  .sv-text,.sv-image,.sv-gallery,.sv-video,.sv-products,.sv-features,.sv-payment,.sv-form{padding-left:20px;padding-right:20px}
  .sv-products-grid{grid-template-columns:1fr 1fr}.sv-features-grid{grid-template-columns:1fr}
}
@media(max-width:480px){
  .sv-products-grid{grid-template-columns:1fr}
  .sv-cart-item{grid-template-columns:40px 1fr auto 24px}
  .sv-ci-subtotal{display:none}
  .sv-user-name{display:none}.sv-login-btn{padding:7px 10px;font-size:11px}
}

/* ── Paiement suspendu Pro non vérifié ──────────────────── */
.sv-payment-suspended {
  text-align: center; padding: 24px 20px; margin-top: 12px;
  background: rgba(239,68,68,.06);
  border: 1px dashed rgba(239,68,68,.3); border-radius: 14px;
}
.sv-payment-suspended-icon  { font-size: 28px; margin-bottom: 8px; }
.sv-payment-suspended-title { font-size: 15px; font-weight: 700; color: #ef4444; margin: 0 0 6px; }
.sv-payment-suspended-msg   { font-size: 13px; color: #6b7280; margin: 0; line-height: 1.6; }
.sv-buy-suspended {
  background: #e5e7eb !important; color: #9ca3af !important;
  cursor: not-allowed !important; border-color: transparent !important;
}
.sv-cart-suspended {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 20px; border-radius: 10px; font-size: 13px;
  font-weight: 600; color: #ef4444;
  background: rgba(239,68,68,.06); border: 1px dashed rgba(239,68,68,.25);
}
</style>
