'use strict';

const helpers = require('../../../helpers');

module.exports = function getWebSignupConfirmation() {
  return async (req, res, next) => {
    try {
      const template = await helpers.campaign
        .fetchWebSignupConfirmationByCampaignId(req.campaignId);

      /**
       * Note: Blink currently forwards all signup created events to this endpoint, regardless of
       * whether the signup campaign is configured to send a SMS confirmation.
       * If the campaign is not configured to send one, we respond with a 204 instead of a 422 to
       * avoid false alarms in New Relic error reporting. This logic may be revisited if we alter
       * Blink to check if campaign has a config.templates.webSignup before making this request.
       * @see https://github.com/DoSomething/gambit-conversations/pull/423#pullrequestreview-167440897
       */
      if (!template) {
        helpers.addBlinkSuppressHeaders(res);
        return helpers.response.sendNoContent(res, 'Web signup confirmation not found.');
      }

      /**
       * TODO: When campaign reference exposed in GraphQL, verify the campaign has not ended.
       * This sanity check is useful when we manually import signups from campaigns that have ended.
       */

      helpers.request.setOutboundMessageText(req, template.text);
      helpers.request.setOutboundMessageTemplate(req, 'webSignupConfirmation');
      helpers.request.setTopic(req, template.topic);

      return next();
    } catch (err) {
      return helpers.sendErrorResponse(res, err);
    }
  };
};