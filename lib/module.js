const { Feed } = require("@ryntab/feed");

const defaults = {
  path: "/feed.xml",
  async create(feed) {},
};

async function createFeed(options) {
  if (!["rss2", "json1", "atom1"].includes(options.type)) {
    throw new Error(
      `Could not create Feed ${options.path} - Unknown feed type`
    );
  }

  const feed = new Feed();

  try {
    await options.create(feed, options.data);
    feed.options = {
      generator: "https://github.com/nuxt-community/feed-module",
      ...feed.options,
    };
  } catch (err) {
    throw err;
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

  return createFeed(options[0]);
}

module.exports = createRSSFeed;
