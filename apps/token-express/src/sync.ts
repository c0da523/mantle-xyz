// import supagraph tooling
import { DB, Mongo, SyncConfig, setEngine, setSyncs, sync } from "supagraph";

// import mongo client factory
import { getMongodb } from "@providers/mongoClient";

// import local configuration and handlers
import config from "@supagraph/config";
import handlers from "@supagraph/handlers";

// Switch out the engine for development to avoid the mongo requirment locally
setEngine({
  // name the connection
  name: config.name,
  // db is dependent on state
  db:
    // in production/production like environments we want to store mutations to mongo otherwise we can store them locally
    !process.env.MONGODB_URI ||
    (process.env.NODE_ENV === "development" && config.dev)
      ? // connect store to in-memory/node-persist store
        DB.create({
          kv: {},
          name: config.name,
          reset: (config as unknown as SyncConfig)?.reset,
        })
      : // connect store to MongoDB
        Mongo.create({
          kv: {},
          name: config.name,
          mutable: config.mutable,
          client: getMongodb(process.env.MONGODB_URI!),
        }),
});

// set the sync ops (this can be handled directly with addSync if you need more control over the setup)
setSyncs(config as unknown as SyncConfig, handlers);

// construct the sync call
const syncLogic = async () => {
  // all new events discovered from all sync operations detailed in a summary
  const summary = await sync({
    // collect blocks to sort by ts
    collectBlocks:
      typeof (config as unknown as SyncConfig).collectBlocks !== "undefined"
        ? (config as unknown as SyncConfig).collectBlocks
        : true,
    // pass through listen option
    listen:
      typeof (config as unknown as SyncConfig).listen !== "undefined"
        ? (config as unknown as SyncConfig).listen
        : true,
    cleanup:
      typeof (config as unknown as SyncConfig).cleanup !== "undefined"
        ? (config as unknown as SyncConfig).cleanup
        : true,
    silent:
      typeof (config as unknown as SyncConfig).silent !== "undefined"
        ? (config as unknown as SyncConfig).silent
        : false,
  });

  // if an error is thrown (db locked) we can signal a halt to restart the server
  if (summary.error) throw summary.error;

  // print initial summary (this was the catchup sync)
  console.log(summary);

  // if we receive a close signal we could wait until after the current block saves to exit
  // process.on('SIGINT', () => {
  //   console.log('\n*** Signal received ****\n*** Supagraph will exit after this block ****');
  //   setTimeout(async () => {
  //     // await the current sync then exit...
  //     if (summary.close) await summary.close();
  //     // throw to close the server
  //     console.error("\n\n[LISTENER CLOSED]: Listener is closed - restart");
  //     // exit after we've finished here
  //     process.exit(0);
  //   }, 1000);
  // });
  return summary;
};

// export init method to catch, report and exit
export async function start() {
  try {
    // if something fails, we should stop the NODEJS process, this way railway restarts it
    // this can help with memory / garbage collection issues during long running processes
    await syncLogic();
  } catch (err) {
    console.error("[SERVER ERROR - STOP]:", err);
    process.exit(1);
  }
}
