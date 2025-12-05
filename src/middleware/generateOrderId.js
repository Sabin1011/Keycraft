const mongoose = require('mongoose');

function generateOrderId(next) {
  if (!this.orderId) {
    this.orderId = "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
  }
  next();
}

module.exports = generateOrderId;
