const { Feed } = require("@ryntab/feed");
const AsyncCache = require("async-cache");
const { promisify } = require("util");

const defaults = {
  path: "/feed.xml",
  async create(feed) {},
  cacheTime: 1000 * 60 * 15,
};

async function createFeed(options) {
  if (!["rss2", "json1", "atom1"].includes(options.type)) {
    console.error(`Could not create Feed ${options.path} - Unknown feed type`);
    throw new Error("Unknown feed type");
  }

  const feed = new Feed();

  try {
    await options.create(feed, options.data);
    feed.options = {
      generator: "https://github.com/nuxt-community/feed-module",
      ...feed.options,
    };
  } catch (err) {
    console.error(err);
    throw new Error("Error while executing feed creation function");
  }

  return feed[options.type]();
}

async function parseOptions(options) {
  // Factory function
  if (typeof options === "function") {
    options = await options();
  }

  // Factory object
  if (!Array.isArray(options)) {
    if (options.factory) {
      options = await options.factory(options.data);
    }
  }

  // Check if is empty
  if (Object.keys(options).length === 0) {
    return [];
  }

  // Single feed
  if (!Array.isArray(options)) {
    options = [options];
  }

  return options;
}

async function createRSSFeed(moduleOptions, siteParam) {
  const options = [...(await parseOptions(moduleOptions))].map((o) => ({
    ...defaults,
    ...o,
  }));

  const feedCache = new AsyncCache({
    maxAge: 1000 * 60 * 15,
    load(siteKey, callback) {
      feedCache.set(
        siteKey,
        createFeed(options[0])
          .then((xml) => {
            callback(null, xml);
          })
          .catch((err) => {
            console.error(err);
            callback(err);
          }),
        options[0].cacheTime
      );
    },
  });

  feedCache.get = promisify(feedCache.get);

  options.forEach((feedOptions, index) => {
    const cacheKey = `${siteParam}${feedOptions.path}-${index}`;
    feedCache.get(cacheKey).catch((err) => {
      console.error(err);
    });
  });

  return feedCache.get(`${siteParam + options[0].path}-0`);
}

module.exports = createRSSFeed;
