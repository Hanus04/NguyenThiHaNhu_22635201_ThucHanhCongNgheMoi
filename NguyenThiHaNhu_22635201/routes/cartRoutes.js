const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

router.get("/cart", cartController.getCart);
router.post("/cart/add/:id/:name", cartController.addToCart);
router.get("/cart/delete/:cartId", cartController.deleteCartItem);
router.get("/cart/increase/:cartId", cartController.increaseQuantity);
router.get("/cart/decrease/:cartId", cartController.decreaseQuantity);
router.post("/cart/checkout", cartController.checkout);

module.exports = router;