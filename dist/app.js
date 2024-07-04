"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mongodb_1 = require("mongodb");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: [
        'https://gadgets-client-side.vercel.app',
        'http://localhost:5173',
    ],
    credentials: true,
}));
app.get('/', (req, res) => {
    res.json({
        status: 200,
        message: 'Server is running',
    });
});
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DATABASE_URL;
exports.client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const gadgets = exports.client.db('electronicGadgets').collection('gadgets');
            const users = exports.client.db('electronicGadgets').collection('users');
            const sells = exports.client.db('electronicGadgets').collection('sells');
            const carts = exports.client.db('electronicGadgets').collection('carts');
            //create user
            app.post('/createUser', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const body = req.body;
                const query = { username: body.username };
                const existUser = yield users.findOne(query);
                if (existUser) {
                    return res.send({ mesage: 'existing user' });
                }
                const result = yield users.insertOne(body);
                res.send(result);
            }));
            //for test purpose only
            app.get('/users', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const result = yield users.find().toArray();
                res.send(result);
            }));
            app.post('/login', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const userData = req.body;
                //console.log(userData);
                const user = yield users.findOne({ username: userData === null || userData === void 0 ? void 0 : userData.username });
                const imgUrl = user === null || user === void 0 ? void 0 : user.imgUrl;
                //console.log(user);
                if (!user) {
                    return res.send({ mesage: 'user not found' });
                }
                if (userData.password !== user.password) {
                    return res.send({ mesage: 'wrong password' });
                }
                const userPayload = {
                    _id: user === null || user === void 0 ? void 0 : user._id,
                    role: user === null || user === void 0 ? void 0 : user.role,
                    imgUrl: imgUrl,
                    username: user === null || user === void 0 ? void 0 : user.username,
                };
                const accessToken = jsonwebtoken_1.default.sign(userPayload, process.env.JWT_ACCESS_SECRET, {
                    expiresIn: '100d',
                });
                res.cookie('accessToken', accessToken);
                return res.json({ accessToken, imgUrl });
            }));
            //verify jwt token validity
            const verifyToken = (req, res, next) => {
                if (!req.headers.authorization) {
                    // console.log(req.headers)
                    return res.send({ message: 'unauthorized access' });
                }
                const token = req.headers.authorization;
                // console.log(token)
                jsonwebtoken_1.default.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
                    if (err) {
                        return res.send({ message: 'unauthorized access' });
                    }
                    req.decoded = decoded;
                    next();
                });
            };
            //add gadget
            app.post('/addGadget', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const body = req.body;
                body.price = parseFloat(body.price);
                body.quantity = parseFloat(body.quantity);
                // console.log("before created data",body);
                const result = yield gadgets.insertOne(body);
                // console.log("created data",result);
                res.send(result);
            }));
            // get all gadgets
            app.get('/gadgets', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                const { release_year, category, operating_system, connectivity, power_source, features, maxPrice, minPrice, } = req.query;
                const user = req.decoded;
                // console.log('query line', typeof req.query.minPrice);
                const filter = {};
                // console.log(req.query, brand);
                if (category)
                    filter.category = category;
                if (operating_system)
                    filter.operating_system = operating_system;
                if (release_year)
                    filter.release_year = release_year;
                if (connectivity)
                    filter.connectivity = connectivity;
                if (power_source)
                    filter.power_source = power_source;
                if (features)
                    filter.features = features;
                if (minPrice && maxPrice) {
                    filter.price = {
                        $gte: parseFloat(minPrice),
                        $lte: parseFloat(maxPrice),
                    };
                }
                const foundCart = yield carts.findOne({ username: user === null || user === void 0 ? void 0 : user.username });
                //console.log("143 filtere",filter)
                const allGadgets = yield gadgets.find(filter).toArray();
                if (foundCart) {
                    allGadgets === null || allGadgets === void 0 ? void 0 : allGadgets.forEach((item) => {
                        // Check if the item exists in the user's cart
                        const existsInCart = foundCart.cart.find((cartItem) => cartItem.itemId == new mongodb_1.ObjectId(item._id));
                        // Add the 'existsInCart' field to the main store item
                        item.existsInCart = existsInCart ? true : false;
                    });
                }
                // console.log('products', allGadgets);
                res.send(allGadgets);
            }));
            //single gadget
            app.get('/gadgets/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const id = req.params.id;
                const result = yield gadgets.findOne({ _id: new mongodb_1.ObjectId(id) });
                res.send(result);
            }));
            //update gadget
            app.patch('/updateGadget/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const id = req.params.id;
                const body = req.body;
                // console.log('body123', id, ' ', body);
                const update = {
                    $set: {
                        product_name: body.product_name,
                        price: parseFloat(body.price),
                        brand: body.brand,
                        category: body.category,
                        model_number: body.model_number,
                        operating_system: body.operating_system,
                        quantity: parseFloat(body.quantity),
                        features: body.features,
                        connectivity: body.connectivity,
                        power_source: body.power_source,
                        release_year: body.release_year,
                    },
                };
                const result = yield gadgets.findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, update, { new: true });
                res.send(result);
            }));
            //delete single product
            app.delete('/deleteGadget/:id', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const id = req.params.id;
                const result = yield gadgets.deleteOne({ _id: new mongodb_1.ObjectId(id) });
                // console.log(id)
                res.send(result);
            }));
            //delete selected ids
            app.delete('/deleteSelected', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const selectedIds = req.body;
                // console.log(selectedIds);
                const objectIds = selectedIds.map((id) => new mongodb_1.ObjectId(id));
                const result = yield gadgets.deleteMany({ _id: { $in: objectIds } });
                // console.log(result);
                res.send(result);
            }));
            // get sell
            app.get('/sellProduct', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const result = yield sells.find().toArray();
                res.send(result);
            }));
            // get only my products
            app.get('/myProduct/:createdBy', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                const createdBy = req.params.createdBy;
                const user = req === null || req === void 0 ? void 0 : req.decoded;
                // console.log("Usseer",req.decoded)
                if ((user === null || user === void 0 ? void 0 : user.role) == 'manager' || (user === null || user === void 0 ? void 0 : user.role) == 'superAdmin') {
                    const result = yield gadgets.find().toArray();
                    res.send(result);
                }
                else {
                    const result = yield gadgets.find({ createdBy: createdBy }).toArray();
                    // console.log(result);
                    res.send(result);
                }
            }));
            // create cart
            app.post('/addTocart', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                const username = req.decoded.username;
                const cartSingleData = req.body.cartSingleData;
                const quantity = req.body.quantity;
                // console.log(reqCartData)
                // console.log(username)
                const foundCart = yield carts.findOne({ username: username });
                if (!foundCart) {
                    const cartData = {
                        username: username,
                        cart: [
                            {
                                itemId: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.itemId,
                                itemImg: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.itemImg,
                                itemName: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.itemName,
                                price: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.price,
                                quantity: quantity,
                            },
                        ],
                    };
                    yield carts.insertOne(cartData);
                }
                else {
                    const PrevCart = foundCart.cart;
                    const newCart = [
                        ...PrevCart,
                        {
                            itemId: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.itemId,
                            itemImg: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.itemImg,
                            itemName: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.itemName,
                            price: cartSingleData === null || cartSingleData === void 0 ? void 0 : cartSingleData.price,
                            quantity: quantity,
                        },
                    ];
                    // Update the existing cart with the modified cart data
                    yield carts.updateOne({ username }, { $set: { cart: newCart } });
                }
                // const cartData = {
                //   "username": "thro",
                //   "cart": [
                //     { itemName,itemImg, itemId: 'sada23', price: 12, quantity: 12 },
                //   ],
                // };
                res.send([]);
            }));
            //get cart
            app.get('/cart/:createdBy', (req, res) => __awaiter(this, void 0, void 0, function* () {
                const createdBy = req.params.createdBy;
                const result = yield carts
                    .find({ username: createdBy })
                    .toArray();
                // console.log(result);
                res.send(result[0]);
            }));
            //delete cart
            app.delete('/deleteCart', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                const newlyCart = req.body;
                // console.log(newlyCart);
                const user = req.decoded;
                const result = yield carts.find({ username: user === null || user === void 0 ? void 0 : user.username }).toArray();
                // console.log(result)
                yield carts.updateOne({ username: user.username }, { $set: { cart: newlyCart } });
                res.send(result);
            }));
            //delete cart entirely
            app.delete('/deleteAllCart', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                const user = req.decoded;
                const result = yield carts.updateOne({ username: user.username }, { $set: { cart: [] } });
                res.send(result);
            }));
            // transaction payment
            app.post('/checkout', verifyToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
                const data = req.body;
                const user = req.decoded;
                // console.log(user);
                // sellingItems: [ { itemId: 'fg1fd', price: 361, quantity: 24 } ],
                const sellingItems = data.sellingItems;
                //  allgadget=[{_id: '677', price: 2,quantity: 5},{_id: '67', price: 20,quantity: 5}];
                const allGadget = yield gadgets.find().toArray();
                let remainingItems = [];
                let soldItems = [];
                // how many item exist if user buy more than available quantity
                let clientAvailableItem = [];
                // update gadgets :
                // if available quantity- delete
                // else add that to an array (not sold)
                sellingItems.forEach((gadget) => __awaiter(this, void 0, void 0, function* () {
                    const matchedItem = allGadget.find((cartItem) => cartItem._id.equals(new mongodb_1.ObjectId(gadget.itemId)));
                    if (matchedItem) {
                        // if enough item then reduce
                        if ((matchedItem === null || matchedItem === void 0 ? void 0 : matchedItem.quantity) - (gadget === null || gadget === void 0 ? void 0 : gadget.quantity) >= 0) {
                            soldItems.push(gadget);
                            yield gadgets.updateOne({ _id: matchedItem === null || matchedItem === void 0 ? void 0 : matchedItem._id }, {
                                $set: {
                                    quantity: Number((matchedItem === null || matchedItem === void 0 ? void 0 : matchedItem.quantity) - (gadget === null || gadget === void 0 ? void 0 : gadget.quantity)),
                                },
                            });
                            //if item quantity reaches to zero then delete
                            if ((matchedItem === null || matchedItem === void 0 ? void 0 : matchedItem.quantity) - (gadget === null || gadget === void 0 ? void 0 : gadget.quantity) == 0) {
                                yield gadgets.deleteOne({ _id: matchedItem === null || matchedItem === void 0 ? void 0 : matchedItem._id });
                            }
                        }
                        //else not item push into array
                        else {
                            remainingItems.push(gadget);
                            clientAvailableItem.push(matchedItem);
                        }
                    }
                }));
                // console.log(remainingItems);
                //  update cart:
                //  ~update the user cart with the new cart
                yield carts.findOneAndUpdate({ username: user.username }, { $set: { cart: remainingItems } });
                //       update sold item history
                //  update the details from data to new sells collection
                if ((data === null || data === void 0 ? void 0 : data.total) && !remainingItems.length) {
                    data.sellingItems = soldItems;
                    yield sells.insertOne(data);
                    res.send({
                        status: 200,
                        message: 'Payment successful',
                        product: clientAvailableItem,
                    });
                }
                else if (remainingItems.length) {
                    res.send({
                        status: 400,
                        message: 'product out of stock',
                        product: clientAvailableItem,
                    });
                }
            }));
        }
        finally {
        }
    });
}
run().catch(console.dir);
exports.default = app;
