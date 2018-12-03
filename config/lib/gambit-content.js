'use strict';

module.exports = {
  clientOptions: {
    baseUri: process.env.DS_GAMBIT_CONTENT_API_BASEURI,
    apiKey: process.env.DS_GAMBIT_CONTENT_API_KEY,
  },
  authHeader: 'x-gambit-api-key',
  endpoints: {
    broadcasts: 'broadcasts',
    campaignActivity: 'campaignActivity',
    campaigns: 'campaigns',
    defaultTopicTriggers: 'defaultTopicTriggers',
    topics: 'topics',
  },
};
