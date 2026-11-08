// Server Entry Point [P2]
// Responsibilities: Load environment config, connect to DB pool, start Express listener

const config = require('./src/config/env');
const app = require('./src/app');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
