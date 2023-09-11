import { TextLoading } from "@components/Loading";
import { CHAIN_ID } from "@config/constants";
import { ContractName, contracts } from "@config/contracts";
import { T } from "@mantle/ui";
import { formatEther } from "ethers/lib/utils";
import { useAccount, useContractRead } from "wagmi";

export default function ExchangeRate() {
  const { address } = useAccount();
  const stakingContract = contracts[CHAIN_ID][ContractName.Staking];

  const exchange = useContractRead({
    ...stakingContract,
    functionName: "mETHToETH",
    args: [BigInt(1e18)],
    enabled: Boolean(address),
  });

  return (
    <div className="flex flex-row justify-between">
      <T variant="body">Exchange rate</T>
      <T variant="body">
        {exchange.data ? (
          `1 mETH = ${formatEther(exchange.data).slice(0, 6)} ETH`
        ) : (
          <TextLoading className="text-start">
            <div className="w-16 h-4" />
          </TextLoading>
        )}
      </T>
    </div>
  );
}
