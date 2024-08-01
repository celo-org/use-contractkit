/* eslint-disable @typescript-eslint/no-unused-vars */
import { CeloTx, EncodedTransaction } from '@celo/connect';
import { ErrorResponse } from '@walletconnect/jsonrpc-types';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { EventEmitter } from 'events';

import { SupportedMethods } from '../../src/types';
import {
  parseComputeSharedSecret,
  parseDecrypt,
  parsePersonalSign,
  parseSignTransaction,
  parseSignTypedData,
  testAddress,
  testWallet,
} from './common';

const pairingTopic = 'react-celo-wc-jest';

export class MockWalletConnectClient extends EventEmitter {
  init(): void {
    // noop
  }

  pairing = {
    delete: ({ topic, reason }: { topic: string; reason: ErrorResponse }) => {
      // noop
    },
  };

  _emit(
    event: SignClientTypes.Event,
    params: SignClientTypes.EventArguments[typeof event]
  ) {
    this.emit(event, params);
  }

  connect() {
    this.emit('session_proposal', {
      id: 1337,
      namespaces: {
        eip155: {
          methods: Object.values(SupportedMethods),
          events: ['chainChanged', 'accountsChanged'],
          accounts: [`eip155:44787:${testAddress}`],
        },
      },
    });

    const session: SessionTypes.Struct = {
      acknowledged: false,
      namespaces: {
        eip155: {
          methods: Object.values(SupportedMethods),
          events: ['chainChanged', 'accountsChanged'],
          accounts: [`eip155:44787:${testAddress}`],
        },
      },
      topic: pairingTopic,
      requiredNamespaces: {
        eip155: {
          chains: [
            'eip155:44787', // alajores
            'eip155:42220', // celo
            'eip155:62320', // baklava
          ],
          methods: Object.values(SupportedMethods),
          events: ['chainChanged', 'accountsChanged'],
        },
      },
      optionalNamespaces: {},
      pairingTopic: pairingTopic,
      controller: 'idk',
      expiry: 1_000_000_000_000,
      peer: {
        publicKey: '123',
        metadata: { name: 'name', description: 'desc', icons: [], url: 'http' },
      },
      relay: { protocol: 'wss' },
      self: {
        publicKey: '456',
        metadata: { name: 'name', description: 'desc', icons: [], url: 'http' },
      },
    };
    return {
      uri: 'fake-wc-uri',
      approval: () => Promise.resolve(session),
    };
  }

  async request({
    params: { request },
  }: SignClientTypes.EventArguments['session_request']) {
    const method = request.method;
    const params = request.params as [string, string];

    // the request gets transformed between the client
    // and wallet, here we reassign to use our decoding
    //  methods in ./common.ts.
    let result: string | EncodedTransaction;
    if (method === SupportedMethods.personalSign) {
      const { payload, from } = parsePersonalSign(params);
      result = await testWallet.signPersonalMessage(from, payload);
    } else if (method === SupportedMethods.signTypedData) {
      const { from, payload } = parseSignTypedData(params);
      result = await testWallet.signTypedData(from, payload);
    } else if (method === SupportedMethods.signTransaction) {
      const tx = parseSignTransaction(params as CeloTx);
      result = await testWallet.signTransaction(tx);
    } else if (method === SupportedMethods.computeSharedSecret) {
      const { from, publicKey } = parseComputeSharedSecret(params);
      result = (await testWallet.computeSharedSecret(from, publicKey)).toString(
        'hex'
      );
    } else if (method === SupportedMethods.decrypt) {
      const { from, payload } = parseDecrypt(params);
      result = (await testWallet.decrypt(from, payload)).toString('hex');
    } else {
      return;
    }

    return result;
  }

  disconnect() {
    // noop
  }
}
