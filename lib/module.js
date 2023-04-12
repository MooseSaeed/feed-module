const { Feed } = require("@ryntab/feed");
const AsyncCache = require("async-cache");
const { promisify } = require("util");

const defaults = {
  path: "/feed.xml",
  async create(feed) {},
  cacheTime: 1000 * 60 * 15,
};

module.exports = async function (moduleOptions) {
  const options = [...(await parseOptions(moduleOptions))].map((o) => ({
    ...defaults,
    ...o,
  }));

  const feedCache = new AsyncCache({
    load(feedIndex, callback) {
      createFeed(options[feedIndex], callback).catch((err) => {
        console.error(err);
        callback(err);
      });
    },
  });

  feedCache.get = promisify(feedCache.get);

  options.forEach((feedOptions, index) => {
    feedCache.get(index).catch((err) => {
      console.error(err);
    });

    // Register the server middleware that serves the feed
    return async (req, res) => {
      try {
        const xml = await feedCache.get(index);
        res.set("Content-Type", resolveContentType(feedOptions.type));
        res.send(xml);
      } catch (err) {
        console.error(err);
        res.status(500).send("Internal server error");
      }
    };
  });
};

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

function resolveContentType(type) {
  const lookup = {
    rss2: "application/rss+xml",
    atom1: "application/atom+xml",
    json1: "application/json",
  };
  return (
    (lookup.hasOwnProperty(type) ? lookup[type] : "application/xml") +
    "; charset=UTF-8"
  );
}

async function createFeed(feedOptions) {
  if (!["rss2", "json1", "atom1"].includes(feedOptions.type)) {
    console.error(
      `Could not create Feed ${feedOptions.path} - Unknown feed type`
    );
    throw new Error("Unknown feed type");
  }

  const feed = new Feed();

  try {
    await feedOptions.create(feed, feedOptions.data);
    feed.options = {
      generator: "https://github.com/nuxt-community/feed-module",
      ...feed.options,
    };
  } catch (err) {
    console.error(err);
    throw new Error("Error while executing feed creation function");
  }

  return feed[feedOptions.type]();
}
