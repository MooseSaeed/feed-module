const { join, resolve } = require("path");
const { promisify } = require("util");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const { dirname } = require("path");
const { Feed } = require("@ryntab/feed");
const AsyncCache = require("async-cache");
const logger = require("./logger");

const defaults = {
  path: "/feed.xml",
  async create(feed) {},
  cacheTime: 1000 * 60 * 15,
};

async function generateFeeds(options) {
  const feedCache = new AsyncCache({
    load(feedIndex, callback) {
      createFeed(options[feedIndex], callback).catch((err) =>
        logger.error(err)
      );
    },
  });

  feedCache.get = promisify(feedCache.get);

  for (let index = 0; index < options.length; index++) {
    const feedOptions = options[index];

    console.log("Generating feed", feedOptions.path);

    const xmlGeneratePath = resolve(
      process.cwd(),
      join("/tmp", feedOptions.path)
    );
    const xmlGenerateDirPath = dirname(xmlGeneratePath);

    if (!existsSync(xmlGenerateDirPath)) {
      mkdirSync(xmlGenerateDirPath, { recursive: true });
    }

    const xml = await feedCache.get(index);

    writeFileSync(xmlGeneratePath, xml);

    console.log("Generated feed", feedOptions.path);
  }
}

async function serveFeed(req, res) {
  const feedIndex = req.params.feedIndex;

  const options = [
    ...(await parseOptions(this.options.feed)),
    ...(await parseOptions(moduleOptions)),
  ].map((o) => ({ ...defaults, ...o }));

  const feedOptions = options[feedIndex];

  const xml = await new Promise((resolve, reject) => {
    createFeed(feedOptions, (err, xml, cacheTime) => {
      if (err) {
        reject(err);
      } else {
        resolve(xml);
      }
    });
  });

  res.setHeader("Content-Type", resolveContentType(feedOptions.type));
  res.end(xml);
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

async function createFeed(feedOptions, callback) {
  if (!["rss2", "json1", "atom1"].includes(feedOptions.type)) {
    throw new Error(`Invalid feed type: ${feedOptions.type}`);
  }

  const feed = new Feed(feedOptions);

  await feedOptions.create(feed);

  const xml = feed.render(feedOptions.type);

  const cacheTime = feedOptions.cacheTime;

  callback(null, xml, cacheTime);
}

module.exports = {
  generateFeeds,
  serveFeed,
};
