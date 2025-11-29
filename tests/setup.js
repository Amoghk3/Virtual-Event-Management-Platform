// tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

module.exports = {
  /**
   * Start a mongodb-memory-server and connect mongoose
   */
  connect: async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    // optional: reduce Mongoose log noise in tests
    mongoose.set('strictQuery', false);
  },

  /**
   * Drop database, close mongoose connection and stop mongod
   */
  closeDatabase: async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongod) await mongod.stop();
  },

  /**
   * Remove all data from all collections
   */
  clearDatabase: async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};
