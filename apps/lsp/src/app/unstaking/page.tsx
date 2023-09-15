"use client";

import { useCallback, useState } from "react";
import { Button, T } from "@mantle/ui";
import { BigNumber } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { useAccount, useContractRead } from "wagmi";

import { CHAIN_ID } from "@config/constants";
import { ContractName, contracts } from "@config/contracts";
import AdjustmentRate from "@components/Convert/AdjustmentRate";
import ExchangeRate from "@components/Convert/ExchangeRate";
import ConvertInput from "@components/Convert/Input";
import ConvertOutput from "@components/Convert/Output";
import StakeToggle, { Mode } from "@components/StakeToggle";
import TokenDirection from "@components/TokenDirection";
import useMETHBalance from "@hooks/web3/read/useMETHBalance";
import { formatEthTruncated } from "@util/util";
import Divider from "@components/Convert/Divider";
import usePermitApproval from "@hooks/web3/write/usePermitApproval";
import StakeFailureDialogue from "@app/staking/dialogue/StakeFailureDialogue";
import UnstakeConfirmDialogue from "./dialogue/UnstakeConfirmDialogue";
import UnstakeSuccessDialogue from "./dialogue/UnstakeSuccessDialogue";

export default function Unstaking() {
  const { address } = useAccount();
  const balance = useMETHBalance(address);
  const [methAmount, setMethAmount] = useState<BigNumber>(BigNumber.from(0));
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const [txHash, setTxHash] = useState("");

  const stakingContract = contracts[CHAIN_ID][ContractName.Staking];
  const methContract = contracts[CHAIN_ID][ContractName.METH];

  const hasApproval = useContractRead({
    ...methContract,
    functionName: "allowance",
    args: [address!, stakingContract.address],
    enabled: Boolean(address),
  });

  const outputAmount = useContractRead({
    ...stakingContract,
    functionName: "mETHToETH",
    args: [methAmount.toBigInt()],
    enabled: Boolean(address) && Number(methAmount) > 0,
  });

  const approvalSignature = usePermitApproval({
    methAmount: methAmount.toBigInt(),
    address,
  });

  const doApproval = useCallback(async () => {
    if (!approvalSignature.signTypedDataAsync) {
      return;
    }
    await approvalSignature.signTypedDataAsync();
    setConfirmDialogOpen(true);
  }, [approvalSignature]);

  const balanceString = formatEthTruncated(balance.data || 0);
  const formattedOutput = outputAmount.data
    ? formatEther(outputAmount.data)
    : "0";

  const approvalHigherThanAmount =
    hasApproval.data && hasApproval.data > methAmount.toBigInt();

  if (confirmDialogOpen) {
    return (
      <UnstakeConfirmDialogue
        unstakeAmount={methAmount.toBigInt()}
        receiveAmount={outputAmount.data || BigInt(0)}
        deadline={approvalSignature.deadline}
        permitSignature={approvalSignature.data}
        onUnstakeSuccess={(hash: string) => {
          setConfirmDialogOpen(false);
          setTxHash(hash);
        }}
        onClose={() => {
          setConfirmDialogOpen(false);
        }}
        onUnstakeFailure={() => {
          setConfirmDialogOpen(false);
          setFailureDialogOpen(true);
        }}
      />
    );
  }

  if (txHash) {
    return (
      <UnstakeSuccessDialogue
        hash={txHash}
        onClose={() => {
          setTxHash("");
        }}
      />
    );
  }

  if (failureDialogOpen) {
    return (
      <StakeFailureDialogue
        onClose={() => {
          setFailureDialogOpen(false);
        }}
      />
    );
  }

  return (
    <div className="max-w-[484px] w-full grid relative bg-white/5 overflow-y-auto overflow-x-clip md:overflow-hidden border border-[#1C1E20] rounded-t-[30px] rounded-b-[20px] mx-auto">
      <div className="p-5">
        <StakeToggle selected={Mode.UNSTAKE} />
      </div>
      <TokenDirection mode={Mode.UNSTAKE} />
      <div className="py-5 px-5 bg-white bg-opacity-5">
        <ConvertInput
          symbol="mETH"
          balance={balanceString}
          defaultAmount={
            // Ensures that a value exists when we render the dialogue and close it again.
            methAmount && methAmount.gt(0) ? formatEther(methAmount) : ""
          }
          onChange={(val: string) => {
            setMethAmount(parseEther(val));
          }}
        />
        {Boolean(balance.data) && (
          <div className="flex flex-col w-full justify-end text-right">
            <div className="flex justify-end">
              <div className="flex space-x-1 items-center">
                <T variant="body">Available: {balanceString}</T>
              </div>
            </div>
          </div>
        )}
      </div>
      <Divider />
      <div className="py-5 px-5">
        <ConvertOutput
          symbol="ETH"
          isLoading={outputAmount.isLoading}
          amount={formattedOutput}
        />
      </div>
      <div className="p-5">
        <Button
          size="full"
          className="mb-4"
          disabled={outputAmount.isLoading || hasApproval.isLoading}
          onClick={() => {
            if (!approvalHigherThanAmount) {
              doApproval();
              return;
            }
            setConfirmDialogOpen(true);
          }}
        >
          {approvalHigherThanAmount ? "Unstake" : "Approve mETH"}
        </Button>
        <div className="flex flex-col space-y-2 w-full">
          <ExchangeRate />
          <AdjustmentRate />
        </div>
      </div>
    </div>
  );
}
