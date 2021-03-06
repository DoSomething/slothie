'use strict';

const express = require('express');

const router = express.Router();

// Middleware configs
const getUserConfig = require('../../../config/lib/middleware/messages/user-get');
const outboundMessageConfig = require('../../../config/lib/middleware/messages/message-outbound');

// Middleware
const paramsMiddleware = require('../../../lib/middleware/messages/broadcast/params');
const getBroadcastMiddleware = require('../../../lib/middleware/messages/broadcast/broadcast-get');
const parseBroadcastMiddleware = require('../../../lib/middleware/messages/broadcast/broadcast-parse');
const getUserMiddleware = require('../../../lib/middleware/messages/user-get');
const validateOutboundMessageMiddleware = require('../../../lib/middleware/messages/message-outbound-validate');
const getConversationMiddleware = require('../../../lib/middleware/messages/conversation-get');
const createConversationMiddleware = require('../../../lib/middleware/messages/conversation-create');
const updateConversationMiddleware = require('../../../lib/middleware/messages/broadcast/conversation-update');
const loadOutboundMessageMiddleware = require('../../../lib/middleware/messages/message-outbound-load');
const createOutboundMessageMiddleware = require('../../../lib/middleware/messages/message-outbound-create');
const sendOutboundMessageMiddleware = require('../../../lib/middleware/messages/message-outbound-send');

router.use(paramsMiddleware());
router.use(getBroadcastMiddleware());
router.use(parseBroadcastMiddleware());
/**
 * TODO: Do not fetch user from NS once we move to use Northstar-less broadcasts.
 * We get the userId and broadcastId from the payload sent to us by Customer.io.
 * Once we have the subscription cache (or unsubscribed blacklist) operational, we won't
 * have to make this round trip to Northstar for the user data.
 */
router.use(getUserMiddleware(getUserConfig));
router.use(validateOutboundMessageMiddleware(outboundMessageConfig));

router.use(getConversationMiddleware());
router.use(createConversationMiddleware());
router.use(updateConversationMiddleware());

router.use(loadOutboundMessageMiddleware(outboundMessageConfig));
router.use(createOutboundMessageMiddleware(outboundMessageConfig));
router.use(sendOutboundMessageMiddleware());

module.exports = router;
