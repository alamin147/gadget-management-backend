/* eslint-disable no-console */
import config from './app/config';
import app, { client } from './app';
import mongoose from 'mongoose';

const port = process.env.PORT || 5000;

async function main() {
  try {
    await mongoose.connect(config.database_url as string);

    const users = client.db('electronicGadgets').collection('users');

    //superAdmin

    const adminData = {
      name: 'admin',
      username: 'superAdmin',
      email: 'admin@a.c',
      contactNo: '12345',
      password: 'admin',
      imgUrl:
        'https://cdn.iconscout.com/icon/free/png-256/free-avatar-370-456322.png?f=webp',
      role: 'superAdmin',
    };
    const superAdmin = async () => {
      const admin = await users.findOne({ role: 'superAdmin' });
      if (!admin) {
        users.insertOne(adminData);
      }
    };

    app.listen(port, async () => {
      await superAdmin();
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.log(error);
  }
}

main();
