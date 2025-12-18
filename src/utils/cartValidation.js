

const validateCartStock = (cart) => {
  let invalidItemExists = false;

  for (let item of cart.items) {
    item.selectedVariant = item.variantId
      ? item.product.variants.id(item.variantId)
      : null;

    item.isAvailable = true;
    item.stockStatus = null;
    item.outOfStockMessage = null;

    if (!item.product || item.product.status !== true) {
      item.isAvailable = false;
      item.stockStatus = "out";
      item.outOfStockMessage = "Product unavailable";
      invalidItemExists = true;
    }

    else if (item.selectedVariant && item.selectedVariant.quantity <= 0) {
      item.isAvailable = false;
      item.stockStatus = "out";
      item.outOfStockMessage = `Variant ${item.selectedVariant.name} out of stock`;
      invalidItemExists = true;
    }

    else if (
      item.selectedVariant &&
      item.quantity > item.selectedVariant.quantity
    ) {
      item.stockStatus = "low";
      item.outOfStockMessage = `Only ${item.selectedVariant.quantity} left`;
      item.quantity = item.selectedVariant.quantity;
    }

    else if (item.product.totalStock <= 0) {
      item.isAvailable = false;
      item.stockStatus = "out";
      item.outOfStockMessage = "Out of stock";
      invalidItemExists = true;
    }

    else if (item.quantity > item.product.totalStock) {
      item.stockStatus = "low";
      item.outOfStockMessage = `Only ${item.product.totalStock} left`;
      item.quantity = item.product.totalStock;
    }
  }

  return invalidItemExists;
};


module.exports = validateCartStock;
