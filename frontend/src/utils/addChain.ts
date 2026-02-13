export const addLotteriaChain = async () => {
  if (!window.ethereum) {
    throw new Error('Please install MetaMask');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x1',
        chainName: 'Lotteria L2',
        nativeCurrency: {
          name: 'INIT',
          symbol: 'INIT',
          decimals: 6,
        },
        rpcUrls: ['https://sequencer-rpc-lotteria-1.anvil.asia-southeast.initia.xyz:443'],
        blockExplorerUrls: null,
      }],
    });
    
    alert('Lotteria L2 chain added to MetaMask!');
  } catch (error: any) {
    console.error('Failed to add chain:', error);
    throw error;
  }
};
