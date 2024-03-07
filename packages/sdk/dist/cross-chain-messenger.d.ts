import { BlockTag, Provider, TransactionRequest, TransactionResponse } from '@ethersproject/abstract-provider';
import { Signer } from '@ethersproject/abstract-signer';
import { BigNumber, CallOverrides, ethers, Overrides, PayableOverrides } from 'ethers';
import { BedrockCrossChainMessageProof, BedrockOutputData } from '@mantleio/core-utils';
import { AddressLike, BridgeAdapterData, BridgeAdapters, CrossChainMessage, CrossChainMessageProof, CrossChainMessageRequest, IBridgeAdapter, LowLevelMessage, MessageDirection, MessageLike, MessageReceipt, MessageRequestLike, MessageStatus, NumberLike, OEContracts, OEContractsLike, ProvenWithdrawal, SignerOrProviderLike, StateRoot, StateRootBatch, TokenBridgeMessage, TransactionLike } from './interfaces';
import { DeepPartial } from './utils';
export declare class CrossChainMessenger {
    l1SignerOrProvider: Signer | Provider;
    l2SignerOrProvider: Signer | Provider;
    l1ChainId: number;
    l2ChainId: number;
    contracts: OEContracts;
    bridges: BridgeAdapters;
    depositConfirmationBlocks: number;
    l1BlockTimeSeconds: number;
    bedrock: boolean;
    constructor(opts: {
        l1SignerOrProvider: SignerOrProviderLike;
        l2SignerOrProvider: SignerOrProviderLike;
        l1ChainId: NumberLike;
        l2ChainId: NumberLike;
        depositConfirmationBlocks?: NumberLike;
        l1BlockTimeSeconds?: NumberLike;
        contracts?: DeepPartial<OEContractsLike>;
        bridges?: BridgeAdapterData;
        bedrock?: boolean;
    });
    get l1Provider(): Provider;
    get l2Provider(): Provider;
    get l1Signer(): Signer;
    get l2Signer(): Signer;
    getMessagesByTransaction(transaction: TransactionLike, opts?: {
        direction?: MessageDirection;
    }): Promise<CrossChainMessage[]>;
    toBedrockCrossChainMessage(message: MessageLike): Promise<CrossChainMessage>;
    toLowLevelMessage(message: MessageLike): Promise<LowLevelMessage>;
    getBridgeForTokenPair(l1Token: AddressLike, l2Token: AddressLike): Promise<IBridgeAdapter>;
    getDepositsByAddress(address: AddressLike, opts?: {
        fromBlock?: BlockTag;
        toBlock?: BlockTag;
    }): Promise<TokenBridgeMessage[]>;
    getWithdrawalsByAddress(address: AddressLike, opts?: {
        fromBlock?: BlockTag;
        toBlock?: BlockTag;
    }): Promise<TokenBridgeMessage[]>;
    toCrossChainMessage(message: MessageLike): Promise<CrossChainMessage>;
    getMessageStatus(message: MessageLike): Promise<MessageStatus>;
    getMessageReceipt(message: MessageLike): Promise<MessageReceipt>;
    waitForMessageReceipt(message: MessageLike, opts?: {
        confirmations?: number;
        pollIntervalMs?: number;
        timeoutMs?: number;
    }): Promise<MessageReceipt>;
    waitForMessageStatus(message: MessageLike, status: MessageStatus, opts?: {
        pollIntervalMs?: number;
        timeoutMs?: number;
    }): Promise<void>;
    estimateL2MessageGasLimit(message: MessageRequestLike, opts?: {
        bufferPercent?: number;
        from?: string;
    }): Promise<BigNumber>;
    estimateMessageWaitTimeSeconds(message: MessageLike): Promise<number>;
    getChallengePeriodSeconds(): Promise<number>;
    getProvenWithdrawal(withdrawalHash: string): Promise<ProvenWithdrawal>;
    getMessageBedrockOutput(message: MessageLike): Promise<BedrockOutputData | null>;
    getMessageStateRoot(message: MessageLike): Promise<StateRoot | null>;
    getStateBatchAppendedEventByBatchIndex(batchIndex: number): Promise<ethers.Event | null>;
    getStateBatchAppendedEventByTransactionIndex(transactionIndex: number): Promise<ethers.Event | null>;
    getStateRootBatchByTransactionIndex(transactionIndex: number): Promise<StateRootBatch | null>;
    getMessageProof(message: MessageLike): Promise<CrossChainMessageProof>;
    getBedrockMessageProof(message: MessageLike): Promise<BedrockCrossChainMessageProof>;
    sendMessage(message: CrossChainMessageRequest, opts?: {
        signer?: Signer;
        l2GasLimit?: NumberLike;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    resendMessage(message: MessageLike, messageGasLimit: NumberLike, opts?: {
        signer?: Signer;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    proveMessage(message: MessageLike, opts?: {
        signer?: Signer;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    finalizeMessage(message: MessageLike, opts?: {
        signer?: Signer;
        overrides?: PayableOverrides;
    }): Promise<TransactionResponse>;
    depositETH(amount: NumberLike, opts?: {
        recipient?: AddressLike;
        signer?: Signer;
        l2GasLimit?: NumberLike;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    withdrawETH(amount: NumberLike, opts?: {
        recipient?: AddressLike;
        signer?: Signer;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    depositMNT(amount: NumberLike, opts?: {
        recipient?: AddressLike;
        signer?: Signer;
        l2GasLimit?: NumberLike;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    withdrawMNT(amount: NumberLike, opts?: {
        recipient?: AddressLike;
        signer?: Signer;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    approval(l1Token: AddressLike, l2Token: AddressLike, opts?: {
        signer?: Signer;
    }): Promise<BigNumber>;
    approveERC20(l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
        signer?: Signer;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    depositERC20(l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
        recipient?: AddressLike;
        signer?: Signer;
        l2GasLimit?: NumberLike;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    withdrawERC20(l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
        recipient?: AddressLike;
        signer?: Signer;
        overrides?: Overrides;
    }): Promise<TransactionResponse>;
    populateTransaction: {
        sendMessage: (message: CrossChainMessageRequest, opts?: {
            l2GasLimit?: NumberLike;
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
        resendMessage: (message: MessageLike, messageGasLimit: NumberLike, opts?: {
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
        proveMessage: (message: MessageLike, opts?: {
            overrides?: PayableOverrides;
        }) => Promise<TransactionRequest>;
        finalizeMessage: (message: MessageLike, opts?: {
            overrides?: PayableOverrides;
        }) => Promise<TransactionRequest>;
        depositETH: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l2GasLimit?: NumberLike;
            overrides?: PayableOverrides;
        }) => Promise<TransactionRequest>;
        withdrawETH: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
        depositMNT: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l2GasLimit?: NumberLike;
            l1MNTAddr?: AddressLike;
            overrides?: PayableOverrides;
        }) => Promise<TransactionRequest>;
        withdrawMNT: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l1MNTAddr?: AddressLike;
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
        approveERC20: (l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
        depositERC20: (l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l2GasLimit?: NumberLike;
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
        withdrawERC20: (l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
            recipient?: AddressLike;
            overrides?: Overrides;
        }) => Promise<TransactionRequest>;
    };
    estimateGas: {
        sendMessage: (message: CrossChainMessageRequest, opts?: {
            l2GasLimit?: NumberLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        resendMessage: (message: MessageLike, messageGasLimit: NumberLike, opts?: {
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        proveMessage: (message: MessageLike, opts?: {
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        finalizeMessage: (message: MessageLike, opts?: {
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        depositETH: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l2GasLimit?: NumberLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        withdrawETH: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        depositMNT: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l2GasLimit?: NumberLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        withdrawMNT: (amount: NumberLike, opts?: {
            recipient?: AddressLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        approveERC20: (l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        depositERC20: (l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
            recipient?: AddressLike;
            l2GasLimit?: NumberLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
        withdrawERC20: (l1Token: AddressLike, l2Token: AddressLike, amount: NumberLike, opts?: {
            recipient?: AddressLike;
            overrides?: CallOverrides;
        }) => Promise<BigNumber>;
    };
}
