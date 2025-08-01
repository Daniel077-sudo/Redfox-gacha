// firebase.js
const admin = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://redfoxdata-3e788-default-rtdb.firebaseio.com"
});

const db = admin.database();
module.exports = db;