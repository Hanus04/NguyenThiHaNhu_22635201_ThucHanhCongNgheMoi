const { dynamoClient, s3Client } = require("../config/aws");
const { PutCommand, ScanCommand, DeleteCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "productS3";
const BUCKET = process.env.S3_BUCKET;

// 👉 Lấy danh sách sản phẩm
exports.getProducts = async (req, res) => {
  try {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      })
    );

    const products = result.Items || [];

    const page = parseInt(req.query.page) || 1;   // trang hiện tại
    const limit = 8;                               // 8 sản phẩm / trang
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const paginatedProducts = products.slice(startIndex, endIndex);

    const totalPages = Math.ceil(products.length / limit);

    res.render("products", {
      products: paginatedProducts,
      currentPage: page,
      totalPages: totalPages
    });

  } catch (error) {
    res.send("Lỗi tải sản phẩm");
  }
};

// 👉 Thêm sản phẩm
exports.addProduct = async (req, res) => {
    const { name, category, price, quantity } = req.body;
    const file = req.file;

    const id = uuidv4();
    const imageKey = `products/${id}-${file.originalname}`;

    // Upload ảnh lên S3
    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: imageKey,
        Body: file.buffer,
        ContentType: file.mimetype
    }));

    const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageKey}`;

    // Lưu DynamoDB
    await dynamoClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            id,
            name,
            category,
            price: parseFloat(price),
            quantity: Number(quantity),
            imageUrl
        }
    }));

    res.redirect("/");
};

// 👉 Xóa sản phẩm

exports.deleteProduct = async (req, res) => {
    try {
        const { id, name } = req.params;

        // 1️⃣ Lấy sản phẩm
        const result = await dynamoClient.send(
            new GetCommand({
                TableName: TABLE_NAME,
                Key: { id, name },
            })
        );

        if (!result.Item) {
            return res.send("Không tìm thấy sản phẩm");
        }

        const imageUrl = result.Item.imageUrl;
        const imageKey = imageUrl.split(".amazonaws.com/")[1];

        // 2️⃣ Xoá ảnh S3
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: BUCKET,
                Key: imageKey,
            })
        );

        // 3️⃣ Xoá DynamoDB
        await dynamoClient.send(
            new DeleteCommand({
                TableName: TABLE_NAME,
                Key: { id, name },   
            })
        );

        res.redirect("/");
    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).send("Lỗi khi xoá sản phẩm");
    }
};

//load dữ liệu lên form để sửa
exports.getEditProduct = async (req, res) => {
    const { id, name } = req.params;

    const result = await dynamoClient.send(
        new GetCommand({
            TableName: TABLE_NAME,
            Key: { id, name }
        })
    );

    if (!result.Item) {
        return res.send("Không tìm thấy sản phẩm");
    }

    res.render("edit", { product: result.Item });
};

//Update sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { id, name } = req.params;
        const { category, price, quantity } = req.body;
        const file = req.file;

        let updateExpression = "SET category = :c, price = :p, quantity = :n";
        let expressionValues = {
            ":c": category,
            ":p": Number(price),
            ":n": Number(quantity)
        };

        // Nếu có upload ảnh mới
        if (file) {
            const imageKey = `products/${id}-${file.originalname}`;

            await s3Client.send(new PutObjectCommand({
                Bucket: BUCKET,
                Key: imageKey,
                Body: file.buffer,
                ContentType: file.mimetype
            }));

            const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageKey}`;

            updateExpression += ", imageUrl = :i";
            expressionValues[":i"] = imageUrl;
        }

        await dynamoClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id, name },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionValues
        }));

        res.redirect("/");
    } catch (err) {
        console.error("UPDATE ERROR:", err);
        res.status(500).send("Lỗi khi cập nhật");
    }
};
//Search
exports.searchProduct = async (req, res) => {
    try {

        const keyword = req.query.keyword.toLowerCase();

        const data = await dynamoClient.send(
            new ScanCommand({
                TableName: TABLE_NAME
            })
        );

        const results = data.Items.filter(p =>
            p.name.toLowerCase().includes(keyword) ||
            p.id.toLowerCase().includes(keyword)
        );

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedProducts = results.slice(startIndex, endIndex);

        const totalPages = Math.ceil(results.length / limit);

        res.render("products", {
            products: paginatedProducts,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (err) {
        console.error(err);
        res.send("Lỗi tìm kiếm");
    }
};