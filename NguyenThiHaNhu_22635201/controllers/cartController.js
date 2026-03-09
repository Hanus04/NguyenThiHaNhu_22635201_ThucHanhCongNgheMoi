const { dynamoClient } = require("../config/aws");
const { PutCommand, ScanCommand, DeleteCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const CART_TABLE = "cart";
const PRODUCT_TABLE = "productS3";

exports.addToCart = async (req, res) => {
    try {

        const { id, name } = req.params;

        // Kiểm tra sản phẩm đã có trong cart chưa
        const cartData = await dynamoClient.send(
            new ScanCommand({
                TableName: CART_TABLE
            })
        );

        const existingItem = cartData.Items.find(item => item.productId === id);

        // Nếu đã tồn tại → tăng quantity
        if (existingItem) {

            await dynamoClient.send(
                new UpdateCommand({
                    TableName: CART_TABLE,
                    Key: { cartId: existingItem.cartId },
                    UpdateExpression: "SET quantity = quantity + :q",
                    ExpressionAttributeValues: {
                        ":q": 1
                    }
                })
            );

            return res.redirect("/cart");
        }

        // Nếu chưa có → lấy product
        const product = await dynamoClient.send(
            new GetCommand({
                TableName: PRODUCT_TABLE,
                Key: { id, name }
            })
        );

        if (!product.Item) {
            return res.send("Không tìm thấy sản phẩm");
        }

        const cartId = uuidv4();

        // Thêm mới vào cart
        await dynamoClient.send(
            new PutCommand({
                TableName: CART_TABLE,
                Item: {
                    cartId,
                    productId: id,
                    name: product.Item.name,
                    price: product.Item.price,
                    quantity: 1,
                    imageUrl: product.Item.imageUrl
                }
            })
        );

        res.send("added");

    } catch (err) {
        console.error("ADD CART ERROR:", err);
        res.status(500).send("Lỗi thêm vào giỏ hàng");
    }
};

// Xem giỏ hàng
exports.getCart = async (req, res) => {
    try {
        const data = await dynamoClient.send(
            new ScanCommand({
                TableName: CART_TABLE
            })
        );

        let total = 0;

        data.Items.forEach(item => {
            total += item.price * item.quantity;
        });

        res.render("cart", {
            cart: data.Items,
            total
        });

    } catch (err) {
        console.error("GET CART ERROR:", err);
        res.status(500).send("Lỗi load giỏ hàng");
    }
};

// Xóa sản phẩm khỏi giỏ
exports.deleteCartItem = async (req, res) => {
    try {

        const { cartId } = req.params;

        await dynamoClient.send(
            new DeleteCommand({
                TableName: CART_TABLE,
                Key: { cartId }
            })
        );

        res.redirect("/cart");

    } catch (err) {
        console.error("DELETE CART ERROR:", err);
        res.status(500).send("Lỗi xoá sản phẩm");
    }
};
// Tăng số lượng
exports.increaseQuantity = async (req, res) => {
    try {

        const { cartId } = req.params;

        await dynamoClient.send(
            new UpdateCommand({
                TableName: CART_TABLE,
                Key: { cartId },
                UpdateExpression: "SET quantity = quantity + :q",
                ExpressionAttributeValues: {
                    ":q": 1
                }
            })
        );

        res.redirect("/cart");

    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi tăng số lượng");
    }
};


// Giảm số lượng
exports.decreaseQuantity = async (req, res) => {
    try {

        const { cartId } = req.params;

        const item = await dynamoClient.send(
            new GetCommand({
                TableName: CART_TABLE,
                Key: { cartId }
            })
        );

        if (item.Item.quantity <= 1) {

            await dynamoClient.send(
                new DeleteCommand({
                    TableName: CART_TABLE,
                    Key: { cartId }
                })
            );

        } else {

            await dynamoClient.send(
                new UpdateCommand({
                    TableName: CART_TABLE,
                    Key: { cartId },
                    UpdateExpression: "SET quantity = quantity - :q",
                    ExpressionAttributeValues: {
                        ":q": 1
                    }
                })
            );

        }

        res.redirect("/cart");

    } catch (err) {
        console.error(err);
        res.status(500).send("Lỗi giảm số lượng");
    }
};
exports.checkout = async (req, res) => {
    try {

        // Lấy tất cả sản phẩm trong giỏ
        const cartData = await dynamoClient.send(
            new ScanCommand({
                TableName: CART_TABLE
            })
        );

        for (const item of cartData.Items) {

            // Lấy sản phẩm từ bảng product
            const product = await dynamoClient.send(
                new GetCommand({
                    TableName: PRODUCT_TABLE,
                    Key: { id: item.productId, name: item.name }
                })
            );

            if (!product.Item) continue;

            const newQuantity =
                product.Item.quantity - item.quantity;

            // Cập nhật tồn kho
            await dynamoClient.send(
                new UpdateCommand({
                    TableName: PRODUCT_TABLE,
                    Key: { id: item.productId, name: item.name },
                    UpdateExpression: "SET quantity = :q",
                    ExpressionAttributeValues: {
                        ":q": newQuantity
                    }
                })
            );

            // Xóa item trong cart
            await dynamoClient.send(
                new DeleteCommand({
                    TableName: CART_TABLE,
                    Key: { cartId: item.cartId }
                })
            );
        }

        res.render("success");

    } catch (err) {
        console.error("CHECKOUT ERROR:", err);
        res.status(500).send("Lỗi đặt hàng");
    }
};