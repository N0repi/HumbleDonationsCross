import React, { useState, useEffect } from 'react';
import { useAccount, useNetwork, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';

function SignInButton({
  onSuccess,
  onError,
}) {
  const [state, setState] = useState({
    loading: false,
    nonce: undefined,
  });

  const fetchNonce = async () => {
    try {
      const nonceRes = await fetch('/api/auth/nonce');
      const nonce = await nonceRes.text();
      setState((x) => ({ ...x, nonce }));
    } catch (error) {
      setState((x) => ({ ...x, error: error }));
    }
  };

  useEffect(() => {
    fetchNonce();
  }, []);

  const { address } = useAccount();
  const { chain } = useNetwork();
  const { signMessageAsync } = useSignMessage();

  const signIn = async () => {
    try {
      const chainId = chain?.id;
      if (!address || !chainId) return;

      setState((x) => ({ ...x, loading: true }));
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to the app.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: state.nonce,
      });
      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, signature }),
      });
      if (!verifyRes.ok) throw new Error('Error verifying message');

      setState((x) => ({ ...x, loading: false }));
      onSuccess({ address })
