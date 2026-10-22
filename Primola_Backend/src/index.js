const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Testa la connessione al database all'avvio
  await db.testConnection();
});
