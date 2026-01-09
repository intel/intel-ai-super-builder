import { useState, useCallback } from 'react';

export const MARKETPLACE_PROVIDERS = {
  MODELSCOPE: 'modelscope',
  DOCKERHUB: 'dockermcphub',
};

export const useMarketplaceProvider = (defaultProvider = MARKETPLACE_PROVIDERS.MODELSCOPE) => {
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);

  const handleProviderChange = useCallback((provider) => {
    if (Object.values(MARKETPLACE_PROVIDERS).includes(provider)) {
      setSelectedProvider(provider);
    }
  }, []);

  return {
    selectedProvider,
    handleProviderChange,
    providers: MARKETPLACE_PROVIDERS,
  };
};