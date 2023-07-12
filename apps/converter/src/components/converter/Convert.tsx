"use client";

import {
  Views,
  L1_CONVERTER_CONTRACT_ABI,
  L1_CONVERTER_CONTRACT_ADDRESS,
  L1_CHAIN_ID,
} from "@config/constants";
import StateContext from "@providers/stateContext";
import { Suspense, useContext, useMemo } from "react";
import { useProvider } from "wagmi";
import { Contract } from "ethers";

// by order of use...
import Dialogue from "@components/converter/dialogue";
import From from "@components/converter/From";
import Hr from "@components/converter/Divider";
import To from "@components/converter/To";
import CTA from "@components/converter/CTA";
import ErrorMsg from "@components/converter/ErrorMsg";
import TX from "@components/converter/TransactionPanel";
import { Typography } from "@mantle/ui";
import { ConvertCard } from "@components/ConvertCard";
import { SmartContractTracker } from "./SmartContractTracker";
import { Loading as SCLoading } from "./SmartContractTracker/Loading";
import { Faq } from "./Faq";

export default function Convert() {
  // unpack the context
  const { view, isCTAPageOpen, setIsCTAPageOpen } = useContext(StateContext);

  // use provider for l1 chain
  const provider = useProvider({
    chainId: L1_CHAIN_ID,
  });

  // read halted from contract
  const halted = useMemo(async () => {
    const contract = new Contract(
      L1_CONVERTER_CONTRACT_ADDRESS,
      L1_CONVERTER_CONTRACT_ABI,
      provider
    );
    return contract.halted();
  }, [provider]);

  if (view !== Views.Default) {
    return <span />;
  }

  if (isCTAPageOpen) {
    return <Dialogue />;
  }

  return (
    <>
      <Typography
        variant="appPageHeading"
        className="text-center mt-4 text-[42px]"
      >
        Migrator
      </Typography>
      <Typography variant="body" className="text-center mt-6 mb-2">
        The migration is irreversible
      </Typography>
      <div className="w-full lg:grid lg:grid-cols-3 flex flex-col md:flex-row md:items-start gap-4 lg:mx-auto ">
        <div className="hidden lg:block" />
        <ConvertCard className="lg:min-w-[320px]">
          <From />
          <Hr />
          <To />
          <div className="px-5 pb-4">
            <CTA setIsOpen={setIsCTAPageOpen} halted={!!halted} />
            <ErrorMsg halted={!!halted} />
            <TX />
          </div>
        </ConvertCard>
        <div className="flex flex-col w-full md:w-[80%] lg:w-auto lg:min-w-[250px] lg:max-w-[250px] xl:w-[320px] xl:max-w-[320px] ">
          <Suspense fallback={<SCLoading />}>
            <SmartContractTracker halted={!!halted} />
          </Suspense>
          <Faq />
        </div>
      </div>
    </>
  );
}
