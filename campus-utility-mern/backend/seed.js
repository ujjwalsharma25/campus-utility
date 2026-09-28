// Seeds the two counters, starter menu items, and one demo login per staff role.
// Run with: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const { Canteen, MenuItem, User } = require('./models');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Seeding...');

  await MenuItem.deleteMany({});
  await Canteen.deleteMany({});
  await User.deleteMany({ role: { $in: ['canteen_owner', 'stationary_admin'] } });

  const mainCanteen = await Canteen.create({ name: 'Main Canteen', is_open: true });
  const stationaryShop = await Canteen.create({ name: 'Stationary & Print Shop', is_open: true });

  const starterMenu = [
    { item_name: 'Veg Sandwich', price: 40 },
    { item_name: 'Aloo Paratha', price: 35 },
    { item_name: 'Masala Maggi', price: 30 },
    { item_name: 'Cold Coffee', price: 25 },
    { item_name: 'Samosa', price: 15 },
    { item_name: 'Chole Bhature', price: 50 },
    { item_name: 'Tea', price: 10 },
    { item_name: 'Veg Momos', price: 45 },
  ];

  const starterStationeryItems = [
    { item_name: 'A4 Notebook (200 pages)', price: 40 },
    { item_name: 'Gel Pen', price: 10 },
    { item_name: 'Spiral Binding', price: 25 },
    { item_name: 'File Folder', price: 15 },
  ];

  await MenuItem.insertMany(
    starterMenu.map((item) => ({ ...item, canteen_id: mainCanteen._id, is_available: true }))
  );
  await MenuItem.insertMany(
    starterStationeryItems.map((item) => ({ ...item, canteen_id: stationaryShop._id, is_available: true }))
  );

  // Demo staff logins so you can sign in immediately without a signup flow for
  // the counters. Change these passwords right after your first login.
  await User.create({
    name: 'Canteen Owner',
    role: 'canteen_owner',
    phone: '9000000001',
    password: 'canteen123',
  });

  await User.create({
    name: 'Stationary Admin',
    role: 'stationary_admin',
    phone: '9000000002',
    password: 'stationary123',
  });

  console.log(`Seeded ${starterMenu.length} menu items under "${mainCanteen.name}".`);
  console.log(`Seeded ${starterStationeryItems.length} items under "${stationaryShop.name}".`);
  console.log('Demo canteen owner login -> phone: 9000000001, password: canteen123');
  console.log('Demo stationary admin login -> phone: 9000000002, password: stationary123');
  console.log('Students sign up themselves from the app - no seed needed for them.');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
