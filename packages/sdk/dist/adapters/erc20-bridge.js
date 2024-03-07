"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERC20BridgeAdapter = void 0;
const ethers_1 = require("ethers");
const core_utils_1 = require("@mantleio/core-utils");
const utils_1 = require("../utils");
const standard_bridge_1 = require("./standard-bridge");
class ERC20BridgeAdapter extends standard_bridge_1.StandardBridgeAdapter {
    async supportsTokenPair(l1Token, l2Token) {
        const l1Bridge = new ethers_1.Contract(this.l1Bridge.address, [
            {
                inputs: [],
                name: 'l1Token',
                outputs: [
                    {
                        internalType: 'address',
                        name: '',
                        type: 'address',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
            {
                inputs: [],
                name: 'l2Token',
                outputs: [
                    {
                        internalType: 'address',
                        name: '',
                        type: 'address',
                    },
                ],
                stateMutability: 'view',
                type: 'function',
            },
        ], this.messenger.l1Provider);
        const allowedL1Token = await l1Bridge.l1Token();
        if (!(0, core_utils_1.hexStringEquals)(allowedL1Token, (0, utils_1.toAddress)(l1Token))) {
            return false;
        }
        const allowedL2Token = await l1Bridge.l2Token();
        if (!(0, core_utils_1.hexStringEquals)(allowedL2Token, (0, utils_1.toAddress)(l2Token))) {
            return false;
        }
        return true;
    }
}
exports.ERC20BridgeAdapter = ERC20BridgeAdapter;
//# sourceMappingURL=erc20-bridge.js.map