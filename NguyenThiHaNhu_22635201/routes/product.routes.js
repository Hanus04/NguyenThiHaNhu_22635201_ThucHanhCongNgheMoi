const express = require("express");
const router = express.Router();
const upload = require("../config/upload");
const controller = require("../controllers/product.controller");

router.get("/", controller.getProducts);

// hiển thị form thêm
router.get("/add", (req, res) => {
    res.render("add");
});

// xử lý thêm
router.post("/add", upload.single("image"), controller.addProduct);

// xóa
router.get("/delete/:id/:name", controller.deleteProduct);

//sửa
router.get("/edit/:id/:name", controller.getEditProduct);
router.post("/edit/:id/:name", upload.single("image"), controller.updateProduct);
//Search
router.get("/search", controller.searchProduct);

module.exports = router;
