"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBridgeAdapters = exports.getAllOEContracts = exports.getOEContract = void 0;
const contracts_1 = require("@mantleio/contracts");
const contracts_bedrock_1 = require("@mantleio/contracts-bedrock");
const ethers_1 = require("ethers");
const coercion_1 = require("./coercion");
const adapters_1 = require("../adapters");
const chain_constants_1 = require("./chain-constants");
const NAME_REMAPPING = {
    AddressManager: 'Lib_AddressManager',
    BVM_L1BlockNumber: 'iBVM_L1BlockNumber',
    WETH: 'WETH9',
    BedrockMessagePasser: 'L2ToL1MessagePasser',
};
const getOEContract = (contractName, l2ChainId, opts = {}) => {
    const addresses = chain_constants_1.CONTRACT_ADDRESSES[l2ChainId];
    if (addresses === undefined && opts.address === undefined) {
        throw new Error(`cannot get contract ${contractName} for unknown L2 chain ID ${l2ChainId}, you must provide an address`);
    }
    const name = NAME_REMAPPING[contractName] || contractName;
    let iface;
    try {
        iface = (0, contracts_bedrock_1.getContractInterface)(name);
    }
    catch (err) {
        iface = (0, contracts_1.getContractInterface)(name);
    }
    return new ethers_1.Contract((0, coercion_1.toAddress)(opts.address || addresses.l1[contractName] || addresses.l2[contractName]), iface, opts.signerOrProvider);
};
exports.getOEContract = getOEContract;
const getAllOEContracts = (l2ChainId, opts = {}) => {
    var _a, _b, _c, _d;
    const addresses = chain_constants_1.CONTRACT_ADDRESSES[l2ChainId] || {
        l1: {
            AddressManager: undefined,
            L1CrossDomainMessenger: undefined,
            L1StandardBridge: undefined,
            StateCommitmentChain: undefined,
            CanonicalTransactionChain: undefined,
            BondManager: undefined,
            OptimismPortal: undefined,
            L2OutputOracle: undefined,
        },
        l2: chain_constants_1.DEFAULT_L2_CONTRACT_ADDRESSES,
    };
    const l1Contracts = {};
    for (const [contractName, contractAddress] of Object.entries(addresses.l1)) {
        l1Contracts[contractName] = (0, exports.getOEContract)(contractName, l2ChainId, {
            address: ((_b = (_a = opts.overrides) === null || _a === void 0 ? void 0 : _a.l1) === null || _b === void 0 ? void 0 : _b[contractName]) || contractAddress,
            signerOrProvider: opts.l1SignerOrProvider,
        });
    }
    const l2Contracts = {};
    for (const [contractName, contractAddress] of Object.entries(addresses.l2)) {
        l2Contracts[contractName] = (0, exports.getOEContract)(contractName, l2ChainId, {
            address: ((_d = (_c = opts.overrides) === null || _c === void 0 ? void 0 : _c.l2) === null || _d === void 0 ? void 0 : _d[contractName]) || contractAddress,
            signerOrProvider: opts.l2SignerOrProvider,
        });
    }
    return {
        l1: l1Contracts,
        l2: l2Contracts,
    };
};
exports.getAllOEContracts = getAllOEContracts;
const getBridgeAdapters = (l2ChainId, messenger, opts) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const adapterData = Object.assign(Object.assign(Object.assign({}, (chain_constants_1.CONTRACT_ADDRESSES[l2ChainId] || ((_b = (_a = opts === null || opts === void 0 ? void 0 : opts.contracts) === null || _a === void 0 ? void 0 : _a.l1) === null || _b === void 0 ? void 0 : _b.L1StandardBridge)
        ? {
            Standard: {
                Adapter: adapters_1.StandardBridgeAdapter,
                l1Bridge: ((_d = (_c = opts === null || opts === void 0 ? void 0 : opts.contracts) === null || _c === void 0 ? void 0 : _c.l1) === null || _d === void 0 ? void 0 : _d.L1StandardBridge) ||
                    chain_constants_1.CONTRACT_ADDRESSES[l2ChainId].l1.L1StandardBridge,
                l2Bridge: contracts_1.predeploys.L2StandardBridge,
            },
            ETH: {
                Adapter: adapters_1.ETHBridgeAdapter,
                l1Bridge: ((_f = (_e = opts === null || opts === void 0 ? void 0 : opts.contracts) === null || _e === void 0 ? void 0 : _e.l1) === null || _f === void 0 ? void 0 : _f.L1StandardBridge) ||
                    chain_constants_1.CONTRACT_ADDRESSES[l2ChainId].l1.L1StandardBridge,
                l2Bridge: contracts_1.predeploys.L2StandardBridge,
            },
            MNT: {
                Adapter: adapters_1.MNTBridgeAdapter,
                l1Bridge: ((_h = (_g = opts === null || opts === void 0 ? void 0 : opts.contracts) === null || _g === void 0 ? void 0 : _g.l1) === null || _h === void 0 ? void 0 : _h.L1StandardBridge) ||
                    chain_constants_1.CONTRACT_ADDRESSES[l2ChainId].l1.L1StandardBridge,
                l2Bridge: contracts_1.predeploys.L2StandardBridge,
            },
        }
        : {})), (chain_constants_1.BRIDGE_ADAPTER_DATA[l2ChainId] || {})), ((opts === null || opts === void 0 ? void 0 : opts.overrides) || {}));
    const adapters = {};
    for (const [bridgeName, bridgeData] of Object.entries(adapterData)) {
        adapters[bridgeName] = new bridgeData.Adapter({
            messenger,
            l1Bridge: bridgeData.l1Bridge,
            l2Bridge: bridgeData.l2Bridge,
        });
    }
    return adapters;
};
exports.getBridgeAdapters = getBridgeAdapters;
//# sourceMappingURL=contracts.js.map