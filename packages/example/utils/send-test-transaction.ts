/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { UseCelo } from '@celo/react-celo';
import Web3 from 'web3';

export async function sendTestTransaction(
  performActions: UseCelo['performActions']
) {
  await performActions(async (k) => {
    const celo = await k.contracts.getGoldToken();
    await celo
      .transfer(
        // impact market contract
        '0x73D20479390E1acdB243570b5B739655989412f5',
        Web3.utils.toWei('1', 'wei')
      )
      .sendAndWaitForReceipt({
        from: k.connection.defaultAccount,
      });
  });
}
