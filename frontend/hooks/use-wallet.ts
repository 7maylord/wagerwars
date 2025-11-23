// Functional wallet connection hook
// Using Stacks Connect with functional programming patterns

import { useState, useEffect, useCallback } from 'react'
import { AppConfig, UserSession, showConnect } from '@stacks/connect'
import { StacksMainnet, StacksTestnet, StacksDevnet } from '@stacks/network'
import type { ContractConfig } from '@/lib/contracts/contract-calls'
import { createNetworkConfig } from '@/lib/contracts/contract-calls'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export interface WalletState {
  isConnected: boolean
  address: string | null
  network: 'mainnet' | 'testnet' | 'devnet'
  userData: any | null
}

// Get network based on environment
const getNetwork = (networkType: 'mainnet' | 'testnet' | 'devnet') => {
  switch (networkType) {
    case 'mainnet':
      return new StacksMainnet()
    case 'testnet':
      return new StacksTestnet()
    case 'devnet':
      return new StacksDevnet()
  }
}

// Pure function to extract address from user data
const extractAddress = (userData: any): string | null => {
  try {
    return userData?.profile?.stxAddress?.mainnet ||
           userData?.profile?.stxAddress?.testnet ||
           null
  } catch {
    return null
  }
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    network: process.env.NEXT_PUBLIC_NETWORK as any || 'devnet',
    userData: null,
  })

  const [contractConfig, setContractConfig] = useState<ContractConfig | null>(null)

  // Check if user is already signed in
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData()
      const address = extractAddress(userData)

      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        address,
        userData,
      }))
    }
  }, [])

  // Update contract config when wallet state changes
  useEffect(() => {
    if (walletState.isConnected && walletState.address) {
      const network = getNetwork(walletState.network)
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || walletState.address
      setContractConfig(createNetworkConfig(network, contractAddress))
    } else {
      setContractConfig(null)
    }
  }, [walletState.isConnected, walletState.address, walletState.network])

  // Connect wallet function
  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: 'WagerWars',
        icon: '/icon.png',
      },
      onFinish: () => {
        const userData = userSession.loadUserData()
        const address = extractAddress(userData)

        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          address,
          userData,
        }))
      },
      userSession,
    })
  }, [])

  // Disconnect wallet function
  const disconnect = useCallback(() => {
    userSession.signUserOut()
    setWalletState({
      isConnected: false,
      address: null,
      network: 'devnet',
      userData: null,
    })
  }, [])

  // Switch network function
  const switchNetwork = useCallback((network: 'mainnet' | 'testnet' | 'devnet') => {
    setWalletState(prev => ({
      ...prev,
      network,
    }))
  }, [])

  return {
    ...walletState,
    contractConfig,
    connect,
    disconnect,
    switchNetwork,
  }
}
