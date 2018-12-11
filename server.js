'use strict';

// Load environment vars.
require('dotenv').config();

// @see https://docs.newrelic.com/docs/agents/nodejs-agent/installation-configuration
require('newrelic');

const config = require('./config');
const logger = require('./lib/logger');
const app = require('./app');

// Setup Gateway client.
require('./lib/gateway').getClient();

// Start mongoose connection
require('./config/mongoose')(config.dbUri);

const mongoose = require('mongoose');
/**
 * For practical reasons, a Connection equals a Db.
 * @see http://mongoosejs.com/docs/4.x/docs/api.html#connection_Connection
 */
const db = mongoose.connection;

// Register connection error listener
db.on('error', (error) => {
  /**
   * TODO: This is not good, we should kill the app! If we had clustering, or a process management
   * setup, the child process would respawn and try to re-connect.
   */
  logger.error('DB connection error:', { error });
});
// Register connection open listener
db.once('open', () => {
  app.listen(config.port, () => logger.info(`Conversations API is running on port=${config.port}.`));
});
