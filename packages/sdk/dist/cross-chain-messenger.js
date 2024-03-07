"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossChainMessenger = void 0;
const abstract_provider_1 = require("@ethersproject/abstract-provider");
const ethers_1 = require("ethers");
const core_utils_1 = require("@mantleio/core-utils");
const contracts_1 = require("@mantleio/contracts");
const rlp = __importStar(require("rlp"));
const interfaces_1 = require("./interfaces");
const utils_1 = require("./utils");
class CrossChainMessenger {
    constructor(opts) {
        var _a;
        this.populateTransaction = {
            sendMessage: async (message, opts) => {
                if (message.direction === interfaces_1.MessageDirection.L1_TO_L2) {
                    return this.contracts.l1.L1CrossDomainMessenger.populateTransaction.sendMessage(message.target, message.message, (opts === null || opts === void 0 ? void 0 : opts.l2GasLimit) || (await this.estimateL2MessageGasLimit(message)), (opts === null || opts === void 0 ? void 0 : opts.overrides) || {});
                }
                else {
                    return this.contracts.l2.L2CrossDomainMessenger.populateTransaction.sendMessage(message.target, message.message, 0, (opts === null || opts === void 0 ? void 0 : opts.overrides) || {});
                }
            },
            resendMessage: async (message, messageGasLimit, opts) => {
                const resolved = await this.toCrossChainMessage(message);
                if (resolved.direction === interfaces_1.MessageDirection.L2_TO_L1) {
                    throw new Error(`cannot resend L2 to L1 message`);
                }
                if (this.bedrock) {
                    return this.populateTransaction.finalizeMessage(resolved, Object.assign(Object.assign({}, (opts || {})), { overrides: Object.assign(Object.assign({}, opts === null || opts === void 0 ? void 0 : opts.overrides), { gasLimit: messageGasLimit }) }));
                }
                else {
                    const legacyL1XDM = new ethers_1.ethers.Contract(this.contracts.l1.L1CrossDomainMessenger.address, (0, contracts_1.getContractInterface)('L1CrossDomainMessenger'), this.l1SignerOrProvider);
                    return legacyL1XDM.populateTransaction.replayMessage(resolved.target, resolved.sender, resolved.message, resolved.messageNonce, resolved.minGasLimit, messageGasLimit, (opts === null || opts === void 0 ? void 0 : opts.overrides) || {});
                }
            },
            proveMessage: async (message, opts) => {
                const resolved = await this.toCrossChainMessage(message);
                if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
                    throw new Error('cannot finalize L1 to L2 message');
                }
                if (!this.bedrock) {
                    throw new Error('message proving only applies after the bedrock upgrade');
                }
                const withdrawal = await this.toLowLevelMessage(resolved);
                const proof = await this.getBedrockMessageProof(resolved);
                const args = [
                    [
                        withdrawal.messageNonce,
                        withdrawal.sender,
                        withdrawal.target,
                        withdrawal.mntValue,
                        withdrawal.ethValue,
                        withdrawal.minGasLimit,
                        withdrawal.message,
                    ],
                    proof.l2OutputIndex,
                    [
                        proof.outputRootProof.version,
                        proof.outputRootProof.stateRoot,
                        proof.outputRootProof.messagePasserStorageRoot,
                        proof.outputRootProof.latestBlockhash,
                    ],
                    proof.withdrawalProof,
                    (opts === null || opts === void 0 ? void 0 : opts.overrides) || {},
                ];
                return this.contracts.l1.OptimismPortal.populateTransaction.proveWithdrawalTransaction(...args);
            },
            finalizeMessage: async (message, opts) => {
                const resolved = await this.toCrossChainMessage(message);
                if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
                    throw new Error(`cannot finalize L1 to L2 message`);
                }
                if (this.bedrock) {
                    const withdrawal = await this.toLowLevelMessage(resolved);
                    return this.contracts.l1.OptimismPortal.populateTransaction.finalizeWithdrawalTransaction([
                        withdrawal.messageNonce,
                        withdrawal.sender,
                        withdrawal.target,
                        withdrawal.mntValue,
                        withdrawal.ethValue,
                        withdrawal.minGasLimit,
                        withdrawal.message,
                    ], (opts === null || opts === void 0 ? void 0 : opts.overrides) || {});
                }
                else {
                    const proof = await this.getMessageProof(resolved);
                    const legacyL1XDM = new ethers_1.ethers.Contract(this.contracts.l1.L1CrossDomainMessenger.address, (0, contracts_1.getContractInterface)('L1CrossDomainMessenger'), this.l1SignerOrProvider);
                    return legacyL1XDM.populateTransaction.relayMessage(resolved.target, resolved.sender, resolved.message, resolved.messageNonce, proof, (opts === null || opts === void 0 ? void 0 : opts.overrides) || {});
                }
            },
            depositETH: async (amount, opts) => {
                return this.bridges.ETH.populateTransaction.deposit(ethers_1.ethers.constants.AddressZero, contracts_1.predeploys.BVM_ETH, amount, opts);
            },
            withdrawETH: async (amount, opts) => {
                return this.bridges.ETH.populateTransaction.withdraw(ethers_1.ethers.constants.AddressZero, contracts_1.predeploys.BVM_ETH, amount, opts);
            },
            depositMNT: async (amount, opts) => {
                if (this.bedrock) {
                    return this.bridges.MNT.populateTransaction.deposit((opts === null || opts === void 0 ? void 0 : opts.l1MNTAddr) !== undefined
                        ? opts.l1MNTAddr
                        : contracts_1.l1DevPredeploys.L1_MNT, ethers_1.ethers.constants.AddressZero, amount, opts);
                }
                else {
                    throw new Error(`call this function must require bedrock param is true`);
                }
            },
            withdrawMNT: async (amount, opts) => {
                if (this.bedrock) {
                    return this.bridges.MNT.populateTransaction.withdraw((opts === null || opts === void 0 ? void 0 : opts.l1MNTAddr) !== undefined ? opts.l1MNTAddr : contracts_1.l1DevPredeploys.L1_MNT, ethers_1.ethers.constants.AddressZero, amount, opts);
                }
                else {
                    throw new Error(`call this function must require bedrock param is true`);
                }
            },
            approveERC20: async (l1Token, l2Token, amount, opts) => {
                const bridge = await this.getBridgeForTokenPair(l1Token, l2Token);
                return bridge.populateTransaction.approve(l1Token, l2Token, amount, opts);
            },
            depositERC20: async (l1Token, l2Token, amount, opts) => {
                const bridge = await this.getBridgeForTokenPair(l1Token, l2Token);
                return bridge.populateTransaction.deposit(l1Token, l2Token, amount, opts);
            },
            withdrawERC20: async (l1Token, l2Token, amount, opts) => {
                const bridge = await this.getBridgeForTokenPair(l1Token, l2Token);
                return bridge.populateTransaction.withdraw(l1Token, l2Token, amount, opts);
            },
        };
        this.estimateGas = {
            sendMessage: async (message, opts) => {
                const tx = await this.populateTransaction.sendMessage(message, opts);
                if (message.direction === interfaces_1.MessageDirection.L1_TO_L2) {
                    return this.l1Provider.estimateGas(tx);
                }
                else {
                    return this.l2Provider.estimateGas(tx);
                }
            },
            resendMessage: async (message, messageGasLimit, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.resendMessage(message, messageGasLimit, opts));
            },
            proveMessage: async (message, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.proveMessage(message, opts));
            },
            finalizeMessage: async (message, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.finalizeMessage(message, opts));
            },
            depositETH: async (amount, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.depositETH(amount, opts));
            },
            withdrawETH: async (amount, opts) => {
                return this.l2Provider.estimateGas(await this.populateTransaction.withdrawETH(amount, opts));
            },
            depositMNT: async (amount, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.depositMNT(amount, opts));
            },
            withdrawMNT: async (amount, opts) => {
                return this.l2Provider.estimateGas(await this.populateTransaction.withdrawMNT(amount, opts));
            },
            approveERC20: async (l1Token, l2Token, amount, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.approveERC20(l1Token, l2Token, amount, opts));
            },
            depositERC20: async (l1Token, l2Token, amount, opts) => {
                return this.l1Provider.estimateGas(await this.populateTransaction.depositERC20(l1Token, l2Token, amount, opts));
            },
            withdrawERC20: async (l1Token, l2Token, amount, opts) => {
                return this.l2Provider.estimateGas(await this.populateTransaction.withdrawERC20(l1Token, l2Token, amount, opts));
            },
        };
        this.bedrock = (_a = opts.bedrock) !== null && _a !== void 0 ? _a : false;
        if (!this.bedrock) {
            console.warn('Bedrock compatibility is disabled in CrossChainMessenger.  Please enable it if you are using Bedrock.');
        }
        this.l1SignerOrProvider = (0, utils_1.toSignerOrProvider)(opts.l1SignerOrProvider);
        this.l2SignerOrProvider = (0, utils_1.toSignerOrProvider)(opts.l2SignerOrProvider);
        try {
            this.l1ChainId = (0, utils_1.toNumber)(opts.l1ChainId);
        }
        catch (err) {
            throw new Error(`L1 chain ID is missing or invalid: ${opts.l1ChainId}`);
        }
        try {
            this.l2ChainId = (0, utils_1.toNumber)(opts.l2ChainId);
        }
        catch (err) {
            throw new Error(`L2 chain ID is missing or invalid: ${opts.l2ChainId}`);
        }
        this.depositConfirmationBlocks =
            (opts === null || opts === void 0 ? void 0 : opts.depositConfirmationBlocks) !== undefined
                ? (0, utils_1.toNumber)(opts.depositConfirmationBlocks)
                : utils_1.DEPOSIT_CONFIRMATION_BLOCKS[this.l2ChainId] || 0;
        this.l1BlockTimeSeconds =
            (opts === null || opts === void 0 ? void 0 : opts.l1BlockTimeSeconds) !== undefined
                ? (0, utils_1.toNumber)(opts.l1BlockTimeSeconds)
                : utils_1.CHAIN_BLOCK_TIMES[this.l1ChainId] || 1;
        this.contracts = (0, utils_1.getAllOEContracts)(this.l2ChainId, {
            l1SignerOrProvider: this.l1SignerOrProvider,
            l2SignerOrProvider: this.l2SignerOrProvider,
            overrides: opts.contracts,
        });
        this.bridges = (0, utils_1.getBridgeAdapters)(this.l2ChainId, this, {
            overrides: opts.bridges,
            contracts: opts.contracts,
        });
    }
    get l1Provider() {
        if (abstract_provider_1.Provider.isProvider(this.l1SignerOrProvider)) {
            return this.l1SignerOrProvider;
        }
        else {
            return this.l1SignerOrProvider.provider;
        }
    }
    get l2Provider() {
        if (abstract_provider_1.Provider.isProvider(this.l2SignerOrProvider)) {
            return this.l2SignerOrProvider;
        }
        else {
            return this.l2SignerOrProvider.provider;
        }
    }
    get l1Signer() {
        if (abstract_provider_1.Provider.isProvider(this.l1SignerOrProvider)) {
            throw new Error(`messenger has no L1 signer`);
        }
        else {
            return this.l1SignerOrProvider;
        }
    }
    get l2Signer() {
        if (abstract_provider_1.Provider.isProvider(this.l2SignerOrProvider)) {
            throw new Error(`messenger has no L2 signer`);
        }
        else {
            return this.l2SignerOrProvider;
        }
    }
    async getMessagesByTransaction(transaction, opts = {}) {
        var _a, _b;
        await ((_b = (_a = transaction).wait) === null || _b === void 0 ? void 0 : _b.call(_a));
        const txHash = (0, utils_1.toTransactionHash)(transaction);
        let receipt;
        if (opts.direction !== undefined) {
            if (opts.direction === interfaces_1.MessageDirection.L1_TO_L2) {
                receipt = await this.l1Provider.getTransactionReceipt(txHash);
            }
            else {
                receipt = await this.l2Provider.getTransactionReceipt(txHash);
            }
        }
        else {
            receipt = await this.l1Provider.getTransactionReceipt(txHash);
            if (receipt) {
                opts.direction = interfaces_1.MessageDirection.L1_TO_L2;
            }
            else {
                receipt = await this.l2Provider.getTransactionReceipt(txHash);
                opts.direction = interfaces_1.MessageDirection.L2_TO_L1;
            }
        }
        if (!receipt) {
            throw new Error(`unable to find transaction receipt for ${txHash}`);
        }
        const messenger = opts.direction === interfaces_1.MessageDirection.L1_TO_L2
            ? this.contracts.l1.L1CrossDomainMessenger
            : this.contracts.l2.L2CrossDomainMessenger;
        return receipt.logs
            .filter((log) => {
            return log.address === messenger.address;
        })
            .filter((log) => {
            const parsed = messenger.interface.parseLog(log);
            return parsed.name === 'SentMessage';
        })
            .map((log) => {
            let _mntValue = ethers_1.ethers.BigNumber.from(0);
            let _ethValue = ethers_1.ethers.BigNumber.from(0);
            const next = receipt.logs.find((l) => {
                return (l.logIndex === log.logIndex + 1 && l.address === messenger.address);
            });
            if (next) {
                const nextParsed = messenger.interface.parseLog(next);
                if (nextParsed.name === 'SentMessageExtension1') {
                    _mntValue = nextParsed.args.mntValue;
                    _ethValue = nextParsed.args.ethValue;
                }
            }
            const parsed = messenger.interface.parseLog(log);
            return {
                direction: opts.direction,
                target: parsed.args.target,
                sender: parsed.args.sender,
                message: parsed.args.message,
                messageNonce: parsed.args.messageNonce,
                mntValue: _mntValue,
                ethValue: _ethValue,
                minGasLimit: parsed.args.gasLimit,
                logIndex: log.logIndex,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
            };
        });
    }
    async toBedrockCrossChainMessage(message) {
        const resolved = await this.toCrossChainMessage(message);
        const { version } = (0, core_utils_1.decodeVersionedNonce)(resolved.messageNonce);
        if (version.eq(1)) {
            return resolved;
        }
        let mntValue = ethers_1.BigNumber.from(0);
        let ethValue = ethers_1.BigNumber.from(0);
        mntValue = resolved.mntValue;
        ethValue = resolved.ethValue;
        if (resolved.direction === interfaces_1.MessageDirection.L2_TO_L1 &&
            resolved.sender === this.contracts.l2.L2StandardBridge.address &&
            resolved.target === this.contracts.l1.L1StandardBridge.address) {
            try {
                ;
                [, , ethValue] =
                    this.contracts.l1.L1StandardBridge.interface.decodeFunctionData('finalizeETHWithdrawal', resolved.message);
            }
            catch (err) {
            }
        }
        return Object.assign(Object.assign({}, resolved), { mntValue,
            ethValue, minGasLimit: ethers_1.BigNumber.from(0), messageNonce: (0, core_utils_1.encodeVersionedNonce)(ethers_1.BigNumber.from(0), resolved.messageNonce) });
    }
    async toLowLevelMessage(message) {
        const resolved = await this.toCrossChainMessage(message);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            throw new Error(`can only convert L2 to L1 messages to low level`);
        }
        const { version } = (0, core_utils_1.decodeVersionedNonce)(resolved.messageNonce);
        let updated;
        if (version.eq(0)) {
            updated = await this.toBedrockCrossChainMessage(resolved);
        }
        else {
            updated = resolved;
        }
        const encoded = (0, core_utils_1.encodeCrossDomainMessageV1)(updated.messageNonce, updated.sender, updated.target, updated.mntValue, updated.ethValue, updated.minGasLimit, updated.message);
        let gasLimit;
        let messageNonce;
        if (version.eq(0)) {
            const chainID = await (0, core_utils_1.getChainId)(this.l2Provider);
            gasLimit = (0, utils_1.migratedWithdrawalGasLimit)(encoded, chainID);
            messageNonce = resolved.messageNonce;
        }
        else {
            const receipt = await this.l2Provider.getTransactionReceipt(resolved.transactionHash);
            const withdrawals = [];
            for (const log of receipt.logs) {
                if (log.address === this.contracts.l2.BedrockMessagePasser.address) {
                    const decoded = this.contracts.l2.L2ToL1MessagePasser.interface.parseLog(log);
                    if (decoded.name === 'MessagePassed') {
                        withdrawals.push(decoded.args);
                    }
                }
            }
            if (withdrawals.length === 0) {
                throw new Error(`no withdrawals found in receipt`);
            }
            if (withdrawals.length > 1) {
                throw new Error(`multiple withdrawals found in receipt`);
            }
            const withdrawal = withdrawals[0];
            messageNonce = withdrawal.nonce;
            gasLimit = withdrawal.gasLimit;
        }
        return {
            messageNonce,
            sender: this.contracts.l2.L2CrossDomainMessenger.address,
            target: this.contracts.l1.L1CrossDomainMessenger.address,
            mntValue: updated.mntValue,
            ethValue: updated.ethValue,
            minGasLimit: gasLimit,
            message: encoded,
        };
    }
    async getBridgeForTokenPair(l1Token, l2Token) {
        const bridges = [];
        for (const bridge of Object.values(this.bridges)) {
            if (await bridge.supportsTokenPair(l1Token, l2Token)) {
                bridges.push(bridge);
            }
        }
        if (bridges.length === 0) {
            throw new Error(`no supported bridge for token pair`);
        }
        if (bridges.length > 1) {
            throw new Error(`found more than one bridge for token pair`);
        }
        return bridges[0];
    }
    async getDepositsByAddress(address, opts = {}) {
        return (await Promise.all(Object.values(this.bridges).map(async (bridge) => {
            return bridge.getDepositsByAddress(address, opts);
        })))
            .reduce((acc, val) => {
            return acc.concat(val);
        }, [])
            .sort((a, b) => {
            return b.blockNumber - a.blockNumber;
        });
    }
    async getWithdrawalsByAddress(address, opts = {}) {
        return (await Promise.all(Object.values(this.bridges).map(async (bridge) => {
            return bridge.getWithdrawalsByAddress(address, opts);
        })))
            .reduce((acc, val) => {
            return acc.concat(val);
        }, [])
            .sort((a, b) => {
            return b.blockNumber - a.blockNumber;
        });
    }
    async toCrossChainMessage(message) {
        if (!message) {
            throw new Error('message is undefined');
        }
        if (message.message) {
            return message;
        }
        else if (message.l1Token &&
            message.l2Token &&
            message.transactionHash) {
            const messages = await this.getMessagesByTransaction(message.transactionHash);
            const found = messages
                .sort((a, b) => {
                return a.logIndex - b.logIndex;
            })
                .find((m) => {
                return m.logIndex > message.logIndex;
            });
            if (!found) {
                throw new Error(`could not find SentMessage event for message`);
            }
            return found;
        }
        else {
            const messages = await this.getMessagesByTransaction(message);
            if (messages.length !== 1) {
                throw new Error(`expected 1 message, got ${messages.length}`);
            }
            return messages[0];
        }
    }
    async getMessageStatus(message) {
        const resolved = await this.toCrossChainMessage(message);
        const receipt = await this.getMessageReceipt(resolved);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            if (receipt === null) {
                return interfaces_1.MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE;
            }
            else {
                if (receipt.receiptStatus === interfaces_1.MessageReceiptStatus.RELAYED_SUCCEEDED) {
                    return interfaces_1.MessageStatus.RELAYED;
                }
                else {
                    return interfaces_1.MessageStatus.FAILED_L1_TO_L2_MESSAGE;
                }
            }
        }
        else {
            if (receipt === null) {
                let timestamp;
                if (this.bedrock) {
                    const output = await this.getMessageBedrockOutput(resolved);
                    if (output === null) {
                        return interfaces_1.MessageStatus.STATE_ROOT_NOT_PUBLISHED;
                    }
                    const withdrawal = await this.toLowLevelMessage(resolved);
                    const provenWithdrawal = await this.contracts.l1.OptimismPortal.provenWithdrawals((0, utils_1.hashLowLevelMessage)(withdrawal));
                    if (provenWithdrawal.timestamp.eq(ethers_1.BigNumber.from(0))) {
                        return interfaces_1.MessageStatus.READY_TO_PROVE;
                    }
                    timestamp = provenWithdrawal.timestamp.toNumber();
                }
                else {
                    const stateRoot = await this.getMessageStateRoot(resolved);
                    if (stateRoot === null) {
                        return interfaces_1.MessageStatus.STATE_ROOT_NOT_PUBLISHED;
                    }
                    const bn = stateRoot.batch.blockNumber;
                    const block = await this.l1Provider.getBlock(bn);
                    timestamp = block.timestamp;
                }
                const challengePeriod = await this.getChallengePeriodSeconds();
                const latestBlock = await this.l1Provider.getBlock('latest');
                if (timestamp + challengePeriod > latestBlock.timestamp) {
                    return interfaces_1.MessageStatus.IN_CHALLENGE_PERIOD;
                }
                else {
                    return interfaces_1.MessageStatus.READY_FOR_RELAY;
                }
            }
            else {
                if (receipt.receiptStatus === interfaces_1.MessageReceiptStatus.RELAYED_SUCCEEDED) {
                    return interfaces_1.MessageStatus.RELAYED;
                }
                else {
                    return interfaces_1.MessageStatus.READY_FOR_RELAY;
                }
            }
        }
    }
    async getMessageReceipt(message) {
        const resolved = await this.toCrossChainMessage(message);
        const messageHash = (0, core_utils_1.hashCrossDomainMessage)(resolved.messageNonce, resolved.sender, resolved.target, resolved.mntValue, resolved.ethValue, resolved.minGasLimit, resolved.message);
        const messenger = resolved.direction === interfaces_1.MessageDirection.L1_TO_L2
            ? this.contracts.l2.L2CrossDomainMessenger
            : this.contracts.l1.L1CrossDomainMessenger;
        const relayedMessageEvents = await messenger.queryFilter(messenger.filters.RelayedMessage(messageHash));
        if (relayedMessageEvents.length === 1) {
            return {
                receiptStatus: interfaces_1.MessageReceiptStatus.RELAYED_SUCCEEDED,
                transactionReceipt: await relayedMessageEvents[0].getTransactionReceipt(),
            };
        }
        else if (relayedMessageEvents.length > 1) {
            throw new Error(`multiple successful relays for message`);
        }
        const failedRelayedMessageEvents = await messenger.queryFilter(messenger.filters.FailedRelayedMessage(messageHash));
        if (failedRelayedMessageEvents.length > 0) {
            return {
                receiptStatus: interfaces_1.MessageReceiptStatus.RELAYED_FAILED,
                transactionReceipt: await failedRelayedMessageEvents[failedRelayedMessageEvents.length - 1].getTransactionReceipt(),
            };
        }
        return null;
    }
    async waitForMessageReceipt(message, opts = {}) {
        const resolved = await this.toCrossChainMessage(message);
        let totalTimeMs = 0;
        while (totalTimeMs < (opts.timeoutMs || Infinity)) {
            const tick = Date.now();
            const receipt = await this.getMessageReceipt(resolved);
            if (receipt !== null) {
                return receipt;
            }
            else {
                await (0, core_utils_1.sleep)(opts.pollIntervalMs || 4000);
                totalTimeMs += Date.now() - tick;
            }
        }
        throw new Error(`timed out waiting for message receipt`);
    }
    async waitForMessageStatus(message, status, opts = {}) {
        const resolved = await this.toCrossChainMessage(message);
        let totalTimeMs = 0;
        while (totalTimeMs < (opts.timeoutMs || Infinity)) {
            const tick = Date.now();
            const currentStatus = await this.getMessageStatus(resolved);
            if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
                if (currentStatus === status) {
                    return;
                }
                if (status === interfaces_1.MessageStatus.UNCONFIRMED_L1_TO_L2_MESSAGE &&
                    currentStatus > status) {
                    return;
                }
                if (status === interfaces_1.MessageStatus.FAILED_L1_TO_L2_MESSAGE &&
                    currentStatus === interfaces_1.MessageStatus.RELAYED) {
                    throw new Error(`incompatible message status, expected FAILED_L1_TO_L2_MESSAGE got RELAYED`);
                }
                if (status === interfaces_1.MessageStatus.RELAYED &&
                    currentStatus === interfaces_1.MessageStatus.FAILED_L1_TO_L2_MESSAGE) {
                    throw new Error(`incompatible message status, expected RELAYED got FAILED_L1_TO_L2_MESSAGE`);
                }
            }
            if (resolved.direction === interfaces_1.MessageDirection.L2_TO_L1) {
                if (currentStatus >= status) {
                    return;
                }
            }
            await (0, core_utils_1.sleep)(opts.pollIntervalMs || 4000);
            totalTimeMs += Date.now() - tick;
        }
        throw new Error(`timed out waiting for message status change`);
    }
    async estimateL2MessageGasLimit(message, opts) {
        let resolved;
        let from;
        if (message.messageNonce === undefined) {
            resolved = message;
            from = opts === null || opts === void 0 ? void 0 : opts.from;
        }
        else {
            resolved = await this.toCrossChainMessage(message);
            from = (opts === null || opts === void 0 ? void 0 : opts.from) || resolved.sender;
        }
        if (resolved.direction === interfaces_1.MessageDirection.L2_TO_L1) {
            throw new Error(`cannot estimate gas limit for L2 => L1 message`);
        }
        const estimate = await this.l2Provider.estimateGas({
            from,
            to: resolved.target,
            data: resolved.message,
        });
        const bufferPercent = (opts === null || opts === void 0 ? void 0 : opts.bufferPercent) || 20;
        return estimate.mul(100 + bufferPercent).div(100);
    }
    async estimateMessageWaitTimeSeconds(message) {
        const resolved = await this.toCrossChainMessage(message);
        const status = await this.getMessageStatus(resolved);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            if (status === interfaces_1.MessageStatus.RELAYED ||
                status === interfaces_1.MessageStatus.FAILED_L1_TO_L2_MESSAGE) {
                return 0;
            }
            else {
                const receipt = await this.l1Provider.getTransactionReceipt(resolved.transactionHash);
                const blocksLeft = Math.max(this.depositConfirmationBlocks - receipt.confirmations, 0);
                return blocksLeft * this.l1BlockTimeSeconds;
            }
        }
        else {
            if (status === interfaces_1.MessageStatus.RELAYED ||
                status === interfaces_1.MessageStatus.READY_FOR_RELAY) {
                return 0;
            }
            else if (status === interfaces_1.MessageStatus.STATE_ROOT_NOT_PUBLISHED) {
                return this.getChallengePeriodSeconds();
            }
            else if (status === interfaces_1.MessageStatus.IN_CHALLENGE_PERIOD) {
                const stateRoot = await this.getMessageStateRoot(resolved);
                const challengePeriod = await this.getChallengePeriodSeconds();
                const targetBlock = await this.l1Provider.getBlock(stateRoot.batch.blockNumber);
                const latestBlock = await this.l1Provider.getBlock('latest');
                return Math.max(challengePeriod - (latestBlock.timestamp - targetBlock.timestamp), 0);
            }
            else {
                throw new Error(`unexpected message status`);
            }
        }
    }
    async getChallengePeriodSeconds() {
        if (!this.bedrock) {
            return (await this.contracts.l1.StateCommitmentChain.FRAUD_PROOF_WINDOW()).toNumber();
        }
        const oracleVersion = await this.contracts.l1.L2OutputOracle.version();
        const challengePeriod = oracleVersion === '1.0.0'
            ?
                ethers_1.BigNumber.from(await this.contracts.l1.OptimismPortal.provider.call({
                    to: this.contracts.l1.OptimismPortal.address,
                    data: '0xf4daa291',
                }))
            : await this.contracts.l1.L2OutputOracle.FINALIZATION_PERIOD_SECONDS();
        return challengePeriod.toNumber();
    }
    async getProvenWithdrawal(withdrawalHash) {
        if (!this.bedrock) {
            throw new Error('message proving only applies after the bedrock upgrade');
        }
        return this.contracts.l1.OptimismPortal.provenWithdrawals(withdrawalHash);
    }
    async getMessageBedrockOutput(message) {
        const resolved = await this.toCrossChainMessage(message);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            throw new Error(`cannot get a state root for an L1 to L2 message`);
        }
        let l2OutputIndex;
        try {
            l2OutputIndex =
                await this.contracts.l1.L2OutputOracle.getL2OutputIndexAfter(resolved.blockNumber);
        }
        catch (err) {
            if (err.message.includes('L2OutputOracle: cannot get output')) {
                return null;
            }
            else {
                throw err;
            }
        }
        const proposal = await this.contracts.l1.L2OutputOracle.getL2Output(l2OutputIndex);
        return {
            outputRoot: proposal.outputRoot,
            l1Timestamp: proposal.timestamp.toNumber(),
            l2BlockNumber: proposal.l2BlockNumber.toNumber(),
            l2OutputIndex: l2OutputIndex.toNumber(),
        };
    }
    async getMessageStateRoot(message) {
        const resolved = await this.toCrossChainMessage(message);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            throw new Error(`cannot get a state root for an L1 to L2 message`);
        }
        const messageTxReceipt = await this.l2Provider.getTransactionReceipt(resolved.transactionHash);
        const messageTxIndex = messageTxReceipt.blockNumber - 1;
        const stateRootBatch = await this.getStateRootBatchByTransactionIndex(messageTxIndex);
        if (stateRootBatch === null) {
            return null;
        }
        const indexInBatch = messageTxIndex - stateRootBatch.header.prevTotalElements.toNumber();
        if (stateRootBatch.stateRoots.length <= indexInBatch) {
            throw new Error(`state root does not exist in batch`);
        }
        return {
            stateRoot: stateRootBatch.stateRoots[indexInBatch],
            stateRootIndexInBatch: indexInBatch,
            batch: stateRootBatch,
        };
    }
    async getStateBatchAppendedEventByBatchIndex(batchIndex) {
        const events = await this.contracts.l1.StateCommitmentChain.queryFilter(this.contracts.l1.StateCommitmentChain.filters.StateBatchAppended(batchIndex));
        if (events.length === 0) {
            return null;
        }
        else if (events.length > 1) {
            throw new Error(`found more than one StateBatchAppended event`);
        }
        else {
            return events[0];
        }
    }
    async getStateBatchAppendedEventByTransactionIndex(transactionIndex) {
        const isEventHi = (event, index) => {
            const prevTotalElements = event.args._prevTotalElements.toNumber();
            return index < prevTotalElements;
        };
        const isEventLo = (event, index) => {
            const prevTotalElements = event.args._prevTotalElements.toNumber();
            const batchSize = event.args._batchSize.toNumber();
            return index >= prevTotalElements + batchSize;
        };
        const totalBatches = await this.contracts.l1.StateCommitmentChain.getTotalBatches();
        if (totalBatches.eq(0)) {
            return null;
        }
        let lowerBound = 0;
        let upperBound = totalBatches.toNumber() - 1;
        let batchEvent = await this.getStateBatchAppendedEventByBatchIndex(upperBound);
        if (batchEvent === null) {
            return null;
        }
        if (isEventLo(batchEvent, transactionIndex)) {
            return null;
        }
        else if (!isEventHi(batchEvent, transactionIndex)) {
            return batchEvent;
        }
        while (lowerBound < upperBound) {
            const middleOfBounds = Math.floor((lowerBound + upperBound) / 2);
            batchEvent = await this.getStateBatchAppendedEventByBatchIndex(middleOfBounds);
            if (isEventHi(batchEvent, transactionIndex)) {
                upperBound = middleOfBounds;
            }
            else if (isEventLo(batchEvent, transactionIndex)) {
                lowerBound = middleOfBounds;
            }
            else {
                break;
            }
        }
        return batchEvent;
    }
    async getStateRootBatchByTransactionIndex(transactionIndex) {
        const stateBatchAppendedEvent = await this.getStateBatchAppendedEventByTransactionIndex(transactionIndex);
        if (stateBatchAppendedEvent === null) {
            return null;
        }
        const stateBatchTransaction = await stateBatchAppendedEvent.getTransaction();
        let stateRoots;
        try {
            stateRoots =
                this.contracts.l1.StateCommitmentChain.interface.decodeFunctionData('appendStateBatch', stateBatchTransaction.data)[0];
        }
        catch (e) {
            stateRoots = this.contracts.l1.Rollup.interface.decodeFunctionData('createAssertionWithStateBatch', stateBatchTransaction.data)[2];
        }
        let signature;
        if (this.bedrock) {
            signature = '';
        }
        else {
            signature = stateBatchAppendedEvent.args._signature;
        }
        return {
            blockNumber: stateBatchAppendedEvent.blockNumber,
            stateRoots,
            header: {
                batchIndex: stateBatchAppendedEvent.args._batchIndex,
                batchRoot: stateBatchAppendedEvent.args._batchRoot,
                batchSize: stateBatchAppendedEvent.args._batchSize,
                prevTotalElements: stateBatchAppendedEvent.args._prevTotalElements,
                extraData: stateBatchAppendedEvent.args._extraData,
                signature,
            },
        };
    }
    async getMessageProof(message) {
        const resolved = await this.toCrossChainMessage(message);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            throw new Error(`can only generate proofs for L2 to L1 messages`);
        }
        const stateRoot = await this.getMessageStateRoot(resolved);
        if (stateRoot === null) {
            throw new Error(`state root for message not yet published`);
        }
        const messageSlot = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.keccak256((0, core_utils_1.encodeCrossDomainMessageV0)(resolved.target, resolved.sender, resolved.message, resolved.messageNonce) + (0, core_utils_1.remove0x)(this.contracts.l2.L2CrossDomainMessenger.address)) + '00'.repeat(32));
        const stateTrieProof = await (0, utils_1.makeStateTrieProof)(this.l2Provider, resolved.blockNumber, this.contracts.l2.BVM_L2ToL1MessagePasser.address, messageSlot);
        return {
            stateRoot: stateRoot.stateRoot,
            stateRootBatchHeader: stateRoot.batch.header,
            stateRootProof: {
                index: stateRoot.stateRootIndexInBatch,
                siblings: (0, utils_1.makeMerkleTreeProof)(stateRoot.batch.stateRoots, stateRoot.stateRootIndexInBatch),
            },
            stateTrieWitness: (0, core_utils_1.toHexString)(rlp.encode(stateTrieProof.accountProof)),
            storageTrieWitness: (0, core_utils_1.toHexString)(rlp.encode(stateTrieProof.storageProof)),
        };
    }
    async getBedrockMessageProof(message) {
        const resolved = await this.toCrossChainMessage(message);
        if (resolved.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            throw new Error(`can only generate proofs for L2 to L1 messages`);
        }
        const output = await this.getMessageBedrockOutput(resolved);
        if (output === null) {
            throw new Error(`state root for message not yet published`);
        }
        const withdrawal = await this.toLowLevelMessage(resolved);
        const hash = (0, utils_1.hashLowLevelMessage)(withdrawal);
        const messageSlot = (0, utils_1.hashMessageHash)(hash);
        const stateTrieProof = await (0, utils_1.makeStateTrieProof)(this.l2Provider, output.l2BlockNumber, this.contracts.l2.BedrockMessagePasser.address, messageSlot);
        const block = await this.l2Provider.send('eth_getBlockByNumber', [
            (0, core_utils_1.toRpcHexString)(output.l2BlockNumber),
            false,
        ]);
        return {
            outputRootProof: {
                version: ethers_1.ethers.constants.HashZero,
                stateRoot: block.stateRoot,
                messagePasserStorageRoot: stateTrieProof.storageRoot,
                latestBlockhash: block.hash,
            },
            withdrawalProof: stateTrieProof.storageProof,
            l2OutputIndex: output.l2OutputIndex,
        };
    }
    async sendMessage(message, opts) {
        const tx = await this.populateTransaction.sendMessage(message, opts);
        if (message.direction === interfaces_1.MessageDirection.L1_TO_L2) {
            return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(tx);
        }
        else {
            return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l2Signer).sendTransaction(tx);
        }
    }
    async resendMessage(message, messageGasLimit, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(await this.populateTransaction.resendMessage(message, messageGasLimit, opts));
    }
    async proveMessage(message, opts) {
        const tx = await this.populateTransaction.proveMessage(message, opts);
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(tx);
    }
    async finalizeMessage(message, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(await this.populateTransaction.finalizeMessage(message, opts));
    }
    async depositETH(amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(await this.populateTransaction.depositETH(amount, opts));
    }
    async withdrawETH(amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l2Signer).sendTransaction(await this.populateTransaction.withdrawETH(amount, opts));
    }
    async depositMNT(amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(await this.populateTransaction.depositMNT(amount, opts));
    }
    async withdrawMNT(amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l2Signer).sendTransaction(await this.populateTransaction.withdrawMNT(amount, opts));
    }
    async approval(l1Token, l2Token, opts) {
        const bridge = await this.getBridgeForTokenPair(l1Token, l2Token);
        return bridge.approval(l1Token, l2Token, (opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer);
    }
    async approveERC20(l1Token, l2Token, amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(await this.populateTransaction.approveERC20(l1Token, l2Token, amount, opts));
    }
    async depositERC20(l1Token, l2Token, amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l1Signer).sendTransaction(await this.populateTransaction.depositERC20(l1Token, l2Token, amount, opts));
    }
    async withdrawERC20(l1Token, l2Token, amount, opts) {
        return ((opts === null || opts === void 0 ? void 0 : opts.signer) || this.l2Signer).sendTransaction(await this.populateTransaction.withdrawERC20(l1Token, l2Token, amount, opts));
    }
}
exports.CrossChainMessenger = CrossChainMessenger;
//# sourceMappingURL=cross-chain-messenger.js.map