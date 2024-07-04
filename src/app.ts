import express, { Application, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

import { ObjectId } from 'mongodb';
const app: Application = express();

app.use(express.json());

app.use(
  cors({
    origin: ['https://gadgets-client-side.vercel.app', 'http://localhost:5173'],
    credentials: true,
  }),
);

app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 200,
    message: 'Server is running',
  });
});

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.DATABASE_URL;

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const gadgets = client.db('electronicGadgets').collection('gadgets');
    const users = client.db('electronicGadgets').collection('users');
    const sells = client.db('electronicGadgets').collection('sells');
    const carts = client.db('electronicGadgets').collection('carts');

    //create user
    app.post('/createUser', async (req, res) => {
      const body = req.body;
      const query = { username: body.username };
      const existUser = await users.findOne(query);
      if (existUser) {
        return res.send({ mesage: 'existing user' });
      }
      const result = await users.insertOne(body);
      res.send(result);
    });

    //for test purpose only
    app.get('/users', async (req, res) => {
      const result = await users.find().toArray();
      res.send(result);
    });

    app.post('/login', async (req, res) => {
      const userData = req.body;
      //console.log(userData);
      const user: any = await users.findOne({ username: userData?.username });
      const imgUrl = user?.imgUrl;
      //console.log(user);
      if (!user) {
        return res.send({ mesage: 'user not found' });
      }

      if (userData.password !== user.password) {
        return res.send({ mesage: 'wrong password' });
      }

      const userPayload = {
        _id: user?._id,
        role: user?.role,
        imgUrl: imgUrl,
        username: user?.username,
      };

      const accessToken = jwt.sign(
        userPayload,
        process.env.JWT_ACCESS_SECRET as string,
        {
          expiresIn: '100d',
        },
      );
      res.cookie('accessToken', accessToken);
      return res.json({ accessToken, imgUrl });
    });

    //verify jwt token validity
    const verifyToken = (req: Request, res: Response, next: NextFunction) => {
      if (!req.headers.authorization) {
        // console.log(req.headers)
        return res.send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization;
      // console.log(token)
      jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET as string,
        (err, decoded: any) => {
          if (err) {
            return res.send({ message: 'unauthorized access' });
          }
          req.decoded = decoded;
          next();
        },
      );
    };

    //add gadget
    app.post('/addGadget', async (req, res) => {
      const body = req.body;
      body.price = parseFloat(body.price);
      body.quantity = parseFloat(body.quantity);
      // console.log("before created data",body);
      const result = await gadgets.insertOne(body);
      // console.log("created data",result);
      res.send(result);
    });

    // get all gadgets
    app.get('/gadgets', verifyToken, async (req, res) => {
      const {
        release_year,
        category,
        operating_system,
        connectivity,
        power_source,
        features,
        maxPrice,
        minPrice,
      } = req.query;
      const user = req.decoded;

      // console.log('query line', typeof req.query.minPrice);
      const filter: any = {};
      // console.log(req.query, brand);
      if (category) filter.category = category;
      if (operating_system) filter.operating_system = operating_system;
      if (release_year) filter.release_year = release_year;
      if (connectivity) filter.connectivity = connectivity;
      if (power_source) filter.power_source = power_source;
      if (features) filter.features = features;

      if (minPrice && maxPrice) {
        filter.price = {
          $gte: parseFloat(minPrice as string),
          $lte: parseFloat(maxPrice as string),
        };
      }
      const foundCart = await carts.findOne({ username: user?.username });

      //console.log("143 filtere",filter)
      const allGadgets = await gadgets.find(filter).toArray();

      if (foundCart) {
        allGadgets?.forEach((item: any) => {
          // Check if the item exists in the user's cart
          const existsInCart = foundCart.cart.find(
            (cartItem: any) => cartItem.itemId == new ObjectId(item._id),
          );

          // Add the 'existsInCart' field to the main store item
          item.existsInCart = existsInCart ? true : false;
        });
      }
      // console.log('products', allGadgets);
      res.send(allGadgets);
    });

    //single gadget
    app.get('/gadgets/:id', async (req, res) => {
      const id = req.params.id;
      const result = await gadgets.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //update gadget
    app.patch('/updateGadget/:id', async (req, res) => {
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

      const result = await gadgets.findOneAndUpdate(
        { _id: new ObjectId(id) },
        update,
        { new: true },
      );
      res.send(result);
    });

    //delete single product
    app.delete('/deleteGadget/:id', async (req, res) => {
      const id = req.params.id;

      const result = await gadgets.deleteOne({ _id: new ObjectId(id) });
      // console.log(id)
      res.send(result);
    });

    //delete selected ids
    app.delete('/deleteSelected', async (req, res) => {
      const selectedIds: any = req.body;
      // console.log(selectedIds);
      const objectIds = selectedIds.map((id: any) => new ObjectId(id));
      const result = await gadgets.deleteMany({ _id: { $in: objectIds } });
      // console.log(result);
      res.send(result);
    });

    // get sell
    app.get('/sellProduct', async (req, res) => {
      const result = await sells.find().toArray();
      res.send(result);
    });

    // get only my products
    app.get('/myProduct/:createdBy', verifyToken, async (req, res) => {
      const createdBy = req.params.createdBy;
      const user = req?.decoded;
      // console.log("Usseer",req.decoded)
      if (user?.role == 'manager' || user?.role == 'superAdmin') {
        const result = await gadgets.find().toArray();
        res.send(result);
      } else {
        const result = await gadgets.find({ createdBy: createdBy }).toArray();
        // console.log(result);
        res.send(result);
      }
    });

    // create cart
    app.post('/addTocart', verifyToken, async (req, res) => {
      const username = req.decoded.username;
      const cartSingleData = req.body.cartSingleData;
      const quantity = req.body.quantity;
      // console.log(reqCartData)
      // console.log(username)
      const foundCart = await carts.findOne({ username: username });

      if (!foundCart) {
        const cartData = {
          username: username,
          cart: [
            {
              itemId: cartSingleData?.itemId,
              itemImg: cartSingleData?.itemImg,
              itemName: cartSingleData?.itemName,
              price: cartSingleData?.price,
              quantity: quantity,
            },
          ],
        };
        await carts.insertOne(cartData);
      } else {
        const PrevCart = foundCart.cart;
        const newCart = [
          ...PrevCart,
          {
            itemId: cartSingleData?.itemId,
            itemImg: cartSingleData?.itemImg,
            itemName: cartSingleData?.itemName,
            price: cartSingleData?.price,
            quantity: quantity,
          },
        ];
        // Update the existing cart with the modified cart data
        await carts.updateOne({ username }, { $set: { cart: newCart } });
      }
      // const cartData = {
      //   "username": "thro",
      //   "cart": [
      //     { itemName,itemImg, itemId: 'sada23', price: 12, quantity: 12 },
      //   ],
      // };
      res.send([]);
    });
    //get cart
    app.get('/cart/:createdBy', async (req, res) => {
      const createdBy = req.params.createdBy;
      const result: any | [] = await carts
        .find({ username: createdBy })
        .toArray();

      // console.log(result);
      res.send(result[0]);
    });

    //delete cart
    app.delete('/deleteCart', verifyToken, async (req, res) => {
      const newlyCart = req.body;
      // console.log(newlyCart);
      const user = req.decoded;
      const result = await carts.find({ username: user?.username }).toArray();
      // console.log(result)
      await carts.updateOne(
        { username: user.username },
        { $set: { cart: newlyCart } },
      );
      res.send(result);
    });

    //delete cart entirely
    app.delete('/deleteAllCart', verifyToken, async (req, res) => {
      const user = req.decoded;
      const result = await carts.updateOne(
        { username: user.username },
        { $set: { cart: [] } },
      );
      res.send(result);
    });

    // transaction payment
    app.post('/checkout', verifyToken, async (req, res) => {
      const data = req.body;
      const user: any = req.decoded;
      // console.log(user);
      // sellingItems: [ { itemId: 'fg1fd', price: 361, quantity: 24 } ],
      const sellingItems = data.sellingItems;
      //  allgadget=[{_id: '677', price: 2,quantity: 5},{_id: '67', price: 20,quantity: 5}];
      const allGadget = await gadgets.find().toArray();

      let remainingItems: any = [];
      let soldItems: any = [];
      // how many item exist if user buy more than available quantity
      let clientAvailableItem: any = [];

      // update gadgets :
      // if available quantity- delete
      // else add that to an array (not sold)

      sellingItems.forEach(async (gadget: any) => {
        const matchedItem = allGadget.find((cartItem: any) =>
          cartItem._id.equals(new ObjectId(gadget.itemId)),
        );
        if (matchedItem) {
          // if enough item then reduce
          if (matchedItem?.quantity - gadget?.quantity >= 0) {
            soldItems.push(gadget);
            await gadgets.updateOne(
              { _id: matchedItem?._id },
              {
                $set: {
                  quantity: Number(matchedItem?.quantity - gadget?.quantity),
                },
              },
            );
            //if item quantity reaches to zero then delete
            if (matchedItem?.quantity - gadget?.quantity == 0) {
              await gadgets.deleteOne({ _id: matchedItem?._id });
            }
          }

          //else not item push into array
          else {
            remainingItems.push(gadget);
            clientAvailableItem.push(matchedItem);
          }
        }
      });
      // console.log(remainingItems);

      //  update cart:
      //  ~update the user cart with the new cart

      await carts.findOneAndUpdate(
        { username: user.username },
        { $set: { cart: remainingItems } },
      );

      //       update sold item history
      //  update the details from data to new sells collection
      if (data?.total && !remainingItems.length) {
        data.sellingItems = soldItems;
        await sells.insertOne(data);
        res.send({
          status: 200,
          message: 'Payment successful',
          product: clientAvailableItem,
        });
      } else if (remainingItems.length) {
        res.send({
          status: 400,
          message: 'product out of stock',
          product: clientAvailableItem,
        });
      }
    });
  } finally {
  }
}
run().catch(console.dir);

export default app;
