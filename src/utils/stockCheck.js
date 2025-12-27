
const Product = require("../models/productSchema")

async function checkOutOfStock(cart) {
  for (const item of cart.items) {
    const product = await Product.findById(item.product);

    if (!product || !product.status) {
      return true;
    }

    if (item.variantId) {
      const variant = product.variants.id(item.variantId);
      if (!variant || variant.quantity < item.quantity) {
        return true;
      }
    }
    else {
      if (product.totalStock < item.quantity) {
        return true;
      }
    }
  }

  return false;
}

module.exports = checkOutOfStock
