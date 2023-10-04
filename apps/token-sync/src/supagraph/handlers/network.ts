// We use BigNumber to handle all numeric operations
import { ethers, BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";

// Each event is supplied the block and tx along with the typed args
import {
  Block,
  JsonRpcProvider,
  TransactionReceipt,
  TransactionResponse,
} from "@ethersproject/providers";

// Use Store to interact with entity storage and withDefault to type default values
import { Store, enqueuePromise, withDefault } from "supagraph";

// Import tooling to check bloomFilters
import { isTopicInBloom } from "ethereum-bloom-filters";

// Import outer config to pull provider dets
import { config } from "@supagraph/config";

// Import types for defined entities
import type { DelegateEntity } from "@supagraph/types";

// construct the provider once
const provider = new JsonRpcProvider(
  config.providers[withDefault(process.env.L2_MANTLE_CHAIN_ID, 5001)].rpcUrl
);

// Connect contract to fetch delegations
const DelegatesInterface = new ethers.utils.Interface(config.events.tokenl2);
// check that this event isn't being handled by an event watcher
const DelegateChangedTopic =
  DelegatesInterface.getEventTopic("DelegateChanged");

// get the l2 contract address once
const l2ContractAddress = getAddress(config.contracts.l2mantle.address);

// update the voter with changed state
const updateVoter = async (
  from: string,
  tx: TransactionReceipt & TransactionResponse,
  block: Block,
  direction: number,
  oldBalance: BigNumber,
  newBalance: BigNumber
) => {
  // fetch entity
  let entity = await Store.get<DelegateEntity>("Delegate", getAddress(from));
  // define token specific props
  const votesProp = "l2MntVotes";
  const otherVotesProps = ["mntVotes", "bitVotes"];

  // set details on entity
  entity.block = block;
  entity.chainId = withDefault(process.env.L2_MANTLE_CHAIN_ID, 5001);

  // get the voteRecipient so that we can add the value change now
  let voteRecipient =
    from === entity.l2MntTo
      ? entity
      : await Store.get<DelegateEntity>("Delegate", getAddress(entity.l2MntTo));

  // set details on entity
  voteRecipient.block = block;
  voteRecipient.chainId = withDefault(process.env.L2_MANTLE_CHAIN_ID, 5001);

  // set new balance value for sender
  entity.set("l2MntBalance", newBalance);

  // update pointers for lastUpdate
  entity.set("blockNumber", +tx.blockNumber);
  entity.set("transactionHash", tx.hash || tx.transactionHash);

  // save the changes (in to the checkpoint - this doesnt cost us anything on the network yet)
  entity = await entity.save();

  // if the entity is the recipient, make sure we don't lose data
  if (from === entity.l2MntTo) {
    voteRecipient = entity;
  }

  // get the corrected votes for this situation
  const newL2Votes = BigNumber.from(voteRecipient[votesProp] || "0")
    .sub(oldBalance)
    .add(newBalance || "0");

  // update the votes for l2
  voteRecipient.set(votesProp, newL2Votes);

  // votes is always a sum of all vote props
  voteRecipient.set(
    "votes",
    newL2Votes.add(
      otherVotesProps.reduce((sum, otherVotesProp) => {
        return sum.add(BigNumber.from(voteRecipient[otherVotesProp] || "0"));
      }, BigNumber.from("0"))
    )
  );

  // save the changes
  voteRecipient = await voteRecipient.save();

  // if the entity is the recipient, make sure we don't lose data
  if (from === entity.l2MntTo) {
    entity = voteRecipient;
  }

  return entity;
};

// enqueue balance check to run updateVoter later
const enqueueTransactionHandler = async (
  from: string,
  tx: TransactionReceipt & TransactionResponse,
  block: Block,
  direction = 0
) => {
  // update sender if its not 0x0 address
  if (from !== "0x0000000000000000000000000000000000000000") {
    // load the entities involved in this tx
    let entity = await Store.get<DelegateEntity>("Delegate", getAddress(from));

    // define token specific props
    const balanceProp = "l2MntBalance";

    // only if the l2MntTo is set do we need to record l2 balance transfers (only record movements when we're not interacting with the delegation contract)
    if (
      entity.l2MntTo &&
      !(
        ((tx.contractAddress &&
          getAddress(tx.contractAddress) === l2ContractAddress) ||
          (tx.to && getAddress(tx.to) === l2ContractAddress)) &&
        isTopicInBloom(tx.logsBloom, DelegateChangedTopic)
      )
    ) {
      // if a promise rejects it will be reattempted - this is the safest way to handle async actions
      enqueuePromise(async () => {
        // get the balance before (this will only be applied if we already have the balance in the db)
        let newBalance = entity[balanceProp] || 0;
        let oldBalance = entity[balanceProp] || 0;

        // if we havent recorded the balance already, then we need to run this through the DelegateChangedHandler first
        if ((oldBalance && direction === 0) || direction === 1) {
          // get the current balance for this user as starting point (we don't see a balance but they have l2MntTo set - this shouldnt happen...)
          if (!entity[balanceProp]) {
            // get the balance for this user in this block (we don't need to sub anything if we get the fresh balance)
            newBalance = await provider.getBalance(from, tx.blockNumber);
          } else {
            if (direction === 0) {
              // get the current l2Balance for the user (we want this post gas spend for this tx)
              // newBalance = BigNumber.from(oldBalance)
              //   // remove value from tx
              //   .sub(tx.value)
              //   // remove the cost of the transaction
              //   .sub(BigNumber.from(tx.gasUsed).mul(tx.gasPrice))
              //   // @ts-ignore
              //   .sub(BigNumber.from(tx.l1GasUsed).mul(tx.l1GasPrice));
              newBalance = await provider.getBalance(from, tx.blockNumber);
            } else {
              // add the new value to the old balance (balance transfer added to users balance from tx.sender)
              // newBalance = BigNumber.from(newBalance).add(tx.value);
              newBalance = await provider.getBalance(from, tx.blockNumber);
            }
          }
        }

        // return the action with async parts resolved
        return {
          tx,
          block,
          direction,
          type: "TransactionHandler",
          entity: from,
          newBalance: BigNumber.from(newBalance),
          oldBalance: BigNumber.from(oldBalance),
          // update pointers for lastUpdate
          blockNumber: +tx.blockNumber,
          transactionHash: tx.transactionHash || tx.hash,
          transactionIndex: tx.transactionIndex,
        };
      });
    }
  }
};

// Handler to consume Transfer events for known delegates
export const TransactionHandler = async (
  _: unknown,
  { tx, block }: { tx: TransactionReceipt & TransactionResponse; block: Block }
) => {
  // console.log("transfer: from", args.from, "to", args.to, "for", args.value.toString());
  // update sender (if they are delegating)
  await enqueueTransactionHandler(tx.from, tx, block, 0);

  // update the recipient (if they are delegating)
  if (tx.to) await enqueueTransactionHandler(tx.to, tx, block, 1);
};

// after enqueueing to process async pieces - process the items in order
export const TransactionHandlerPostProcessing = async (item: {
  entity: string;
  tx: TransactionReceipt & TransactionResponse;
  block: Block;
  direction: number;
  oldBalance: BigNumber;
  newBalance: BigNumber;
}) => {
  // process these sequentially via a `withPromises` handler
  await updateVoter(
    item.entity,
    item.tx,
    item.block,
    item.direction,
    item.oldBalance,
    item.newBalance
  );
};
