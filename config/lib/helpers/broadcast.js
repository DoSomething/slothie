'use strict';

module.exports = {
  default: {
    templates: {
      campaign: 'askSignup',
      topic: 'rivescript',
    },
  },
  customerIo: {
    userIdField: '{{customer.id}}',
  },
  blink: {
    webhookUrl: process.env.DS_BLINK_GAMBIT_BROADCAST_WEBHOOK_URL || 'http://localhost:5050/api/v1',
  },
};
