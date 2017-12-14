'use strict';

require('dotenv').config();
const test = require('ava');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const logger = require('heroku-logger');
const rewire = require('rewire');

const stubs = require('../../helpers/stubs');

// setup "x.should.y" assertion style
chai.should();
chai.use(sinonChai);

// module to be tested
const cacheHelper = rewire('../../../lib/helpers/cache');

const broadcastId = stubs.getBroadcastId();
const broadcastStats = stubs.getBroadcastStats();
const campaignId = stubs.getCampaignId();
const campaign = { id: campaignId, title: 'Winter' };

// sinon sandbox object
const sandbox = sinon.sandbox.create();

// Setup!
test.beforeEach(() => {
  stubs.stubLogger(sandbox, logger);
});

// Cleanup!
test.afterEach(() => {
  // reset stubs, spies, and mocks
  sandbox.restore();
  // reset statsCache on each test
  cacheHelper.__set__('broadcastStatsCache', undefined);
});

/**
 * Broadcast Stats
 */
test('broadcastStats.get should return object when cache exists', async () => {
  cacheHelper.__set__('broadcastStatsCache', {
    get: () => Promise.resolve(broadcastStats),
  });
  const result = await cacheHelper.broadcastStats.get(broadcastId);
  result.should.deep.equal(broadcastStats);
});

test('broadcastStats.get should return falsy when cache undefined', async (t) => {
  cacheHelper.__set__('broadcastStatsCache', {
    get: () => Promise.resolve(null),
  });
  const result = await cacheHelper.broadcastStats.get(broadcastId);
  t.falsy(result);
});

test('broadcastStats.get should throw when statsCache.get fails', async (t) => {
  cacheHelper.__set__('broadcastStatsCache', {
    get: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.broadcastStats.get(broadcastId));
});

test('broadcastStats.set should return an object', async () => {
  cacheHelper.__set__('broadcastStatsCache', {
    set: () => Promise.resolve(broadcastStats),
  });
  const result = await cacheHelper.broadcastStats.set(broadcastId);
  result.should.deep.equal(broadcastStats);
});

test('broadcastStats.set should throw if broadcastStats.set fails', async (t) => {
  cacheHelper.__set__('broadcastStatsCache', {
    set: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.broadcastStats.set(broadcastId));
});

/**
 * Campaigns
 */
test('campaigns.get should return object when cache exists', async () => {
  cacheHelper.__set__('campaignsCache', {
    get: () => Promise.resolve(campaign),
  });
  const result = await cacheHelper.campaigns.get(campaignId);
  result.should.deep.equal(campaign);
});

test('campaigns.get should return falsy when cache undefined', async (t) => {
  cacheHelper.__set__('campaignsCache', {
    get: () => Promise.resolve(null),
  });
  const result = await cacheHelper.campaigns.get(campaignId);
  t.falsy(result);
});

test('campaigns.get should return an object', async () => {
  cacheHelper.__set__('campaignsCache', {
    set: () => Promise.resolve(campaign),
  });
  const result = await cacheHelper.campaigns.set(campaignId);
  result.should.deep.equal(campaign);
});

test('campaigns.set should throw if campaignsCache.set fails', async (t) => {
  cacheHelper.__set__('campaignsCache', {
    set: () => Promise.reject(new Error()),
  });
  await t.throws(cacheHelper.campaigns.set(campaignId));
});
